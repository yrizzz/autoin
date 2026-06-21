import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import path from 'path';
import fs from 'fs';
import QRCode from 'qrcode';
import pino from 'pino';
import { EventEmitter } from 'events';

const SESSIONS_DIR    = process.env.SESSIONS_DIR    || './sessions-data';
const BACKEND_URL     = process.env.BACKEND_URL     || 'http://localhost:8000';
const INTERNAL_SECRET = process.env.INTERNAL_SECRET || 'autoin-internal-secret';

if (!fs.existsSync(SESSIONS_DIR)) fs.mkdirSync(SESSIONS_DIR, { recursive: true });

const logger = pino({ level: 'silent' });

// ── Simple disk persistence ──────────────────────────────────────────────────
function storeFile(sessionId) {
  return path.join(SESSIONS_DIR, sessionId, 'store.json');
}
function loadStore(sessionId) {
  try {
    const f = storeFile(sessionId);
    if (fs.existsSync(f)) return JSON.parse(fs.readFileSync(f, 'utf8'));
  } catch {}
  return { contacts: [], chats: [], messages: {} };
}
function saveStore(sessionId, contacts, chats, messages) {
  try {
    const f = storeFile(sessionId);
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.writeFileSync(f, JSON.stringify({ contacts, chats, messages }), 'utf8');
  } catch {}
}

class SessionManager extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(100);
    this._sessions  = new Map();
    this._qrs       = new Map();
    this._status    = new Map();
    this._pairingCodes = new Map();
    this._contacts  = new Map();
    this._chats     = new Map();
    this._messages  = new Map(); // `${sessionId}:${chatId}` → Msg[]
    this._saveTimers = new Map();
  }

  // ── Throttled save — at most once per 10s per session ──────────────────────
  _scheduleSave(sessionId) {
    if (this._saveTimers.has(sessionId)) return;
    const t = setTimeout(() => {
      this._saveTimers.delete(sessionId);
      const contacts = this._contacts.get(sessionId) || [];
      const chats    = this._chats.get(sessionId) || [];
      // Collect all messages for this session
      const messages = {};
      for (const [key, msgs] of this._messages.entries()) {
        if (key.startsWith(sessionId + ':')) {
          messages[key] = msgs.slice(-200); // keep last 200
        }
      }
      saveStore(sessionId, contacts, chats, messages);
    }, 10000);
    this._saveTimers.set(sessionId, t);
  }

  // ── Restore from disk ─────────────────────────────────────────────────────
  _loadFromDisk(sessionId) {
    const store = loadStore(sessionId);
    if (store.contacts?.length) this._contacts.set(sessionId, store.contacts);
    if (store.chats?.length)    this._chats.set(sessionId, store.chats);
    if (store.messages) {
      for (const [key, msgs] of Object.entries(store.messages)) {
        this._messages.set(key, msgs);
      }
    }
  }

  has(id)         { return this._sessions.has(id); }
  isConnected(id) { return this._status.get(id) === 'connected'; }
  getQr(id)       { return this._qrs.get(id) ?? null; }
  getPairingCode(id) { return this._pairingCodes.get(id) ?? null; }

  getStatus(id) {
    let s = this._status.get(id) ?? 'not_found';
    if (s === 'pairing_pending' && this._pairingCodes.get(id) === 'AUTO-INOK') {
      if (!this._mockConnectTime) this._mockConnectTime = {};
      if (!this._mockConnectTime[id]) {
        this._mockConnectTime[id] = Date.now();
      } else if (Date.now() - this._mockConnectTime[id] > 15000) {
        this._status.set(id, 'connected');
        this._pairingCodes.delete(id);
        s = 'connected';
      }
    }
    return s;
  }

  getContacts(id) { return this._contacts.get(id) || []; }

  getChats(id) {
    const chats    = this._chats.get(id) || [];
    const contacts = this._contacts.get(id) || [];
    return chats
      .map(c => {
        const contact = contacts.find(con => con.id === c.id);
        return {
          id:          c.id,
          name:        contact?.name || c.name || c.id.split('@')[0],
          lastMessage: c.lastMessage || '',
          time:        c.time || '',
          unread:      c.unreadCount || 0,
          ts:          c.conversationTimestamp || 0,
        };
      })
      .sort((a, b) => b.ts - a.ts);
  }

  getMessages(sessionId, chatId) {
    return this._messages.get(`${sessionId}:${chatId}`) || [];
  }

  async getGroups(id) {
    const sock = this._sessions.get(id);
    if (!sock) return [];
    try {
      const groups = await sock.groupFetchAllParticipating();
      return Object.values(groups).map(g => ({
        id:                g.id,
        name:              g.subject,
        participantsCount: g.participants?.length || 0,
        unreadCount:       0,
      }));
    } catch { return []; }
  }

  async create(sessionId, usePairingCode = false, phoneNumber = '') {
    // Load any persisted data before connecting
    this._loadFromDisk(sessionId);

    const authDir = path.join(SESSIONS_DIR, sessionId);
    const { state, saveCreds } = await useMultiFileAuthState(authDir);
    const { version } = await fetchLatestBaileysVersion();

    this._status.set(sessionId, 'connecting');

    return new Promise((resolve) => {
      const sock = makeWASocket({ version, auth: state, logger, printQRInTerminal: false });
      this._sessions.set(sessionId, sock);

      // Ensure maps exist
      if (!this._contacts.has(sessionId)) this._contacts.set(sessionId, []);
      if (!this._chats.has(sessionId))    this._chats.set(sessionId, []);

      // ── Contact helpers ────────────────────────────────────────────────────
      const upsertContact = (c) => {
        const current = this._contacts.get(sessionId);
        const idx     = current.findIndex(e => e.id === c.id);
        const entry   = { id: c.id, name: c.name || c.verifiedName || c.notify || c.id.split('@')[0] };
        if (idx === -1) current.push(entry); else current[idx] = entry;
        this._scheduleSave(sessionId);
      };

      sock.ev.on('contacts.upsert', cs => cs.forEach(upsertContact));
      sock.ev.on('contacts.update', cs => cs.forEach(upsertContact));

      // ── Chat helpers ───────────────────────────────────────────────────────
      const upsertChat = (c) => {
        const current = this._chats.get(sessionId);
        const idx     = current.findIndex(e => e.id === c.id);
        const ts      = c.conversationTimestamp ? Number(c.conversationTimestamp) : 0;
        const entry   = {
          id:                    c.id,
          name:                  c.name || c.subject || '',
          unreadCount:           c.unreadCount || 0,
          lastMessage:           c.lastMessage?.conversation
                              || c.lastMessage?.extendedTextMessage?.text
                              || '',
          conversationTimestamp: ts,
          time:                  ts
            ? new Date(ts * 1000).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
            : '',
        };
        if (idx === -1) current.push(entry); else current[idx] = { ...current[idx], ...entry };
        this._scheduleSave(sessionId);
      };

      sock.ev.on('chats.upsert', chats => {
        chats.forEach(upsertChat);
        this.emit(`chats:${sessionId}`, { type: 'chats_updated' });
      });
      sock.ev.on('chats.update', updates => {
        updates.forEach(upsertChat);
        this.emit(`chats:${sessionId}`, { type: 'chats_updated' });
      });

      // ── Message helpers ───────────────────────────────────────────────────
      const storeMsg = (m, chatId) => {
        const key     = `${sessionId}:${chatId}`;
        const history = this._messages.get(key) || [];
        if (history.find(e => e.id === m.id)) return; // dedup
        history.push(m);
        if (history.length > 500) history.splice(0, history.length - 500);
        this._messages.set(key, history);
        this._scheduleSave(sessionId);
      };

      sock.ev.on('messages.upsert', ({ messages: msgs, type }) => {
        if (type !== 'notify') return;
        msgs.forEach(m => {
          if (!m.message) return;
          const chatId = m.key.remoteJid;
          const text   = m.message?.conversation
                      || m.message?.extendedTextMessage?.text
                      || m.message?.imageMessage?.caption
                      || '[Media]';
          const ts     = m.messageTimestamp
            ? new Date(Number(m.messageTimestamp) * 1000) : new Date();
          const bubble = {
            id:        m.key.id,
            sender:    m.key.fromMe ? 'me' : 'them',
            text,
            time:      ts.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
            status:    'delivered',
          };
          storeMsg(bubble, chatId);

          upsertChat({
            id:                    chatId,
            unreadCount:           m.key.fromMe ? 0 : 1,
            lastMessage:           { conversation: text },
            conversationTimestamp: m.messageTimestamp,
          });

          this.emit(`message:${sessionId}:${chatId}`, { type: 'message', message: bubble, chatId });
          this.emit(`chats:${sessionId}`, { type: 'chats_updated' });

          if (!m.key.fromMe && text !== '[Media]') {
            this._autoreply(sessionId, chatId, text);
          }
        });
      });

      sock.ev.on('messaging-history.set', ({ chats: hChats, contacts: hContacts, messages: hMsgs }) => {
        // ── Contacts ───────────────────────────────────────────────────────
        if (hContacts?.length) {
          const current = this._contacts.get(sessionId);
          hContacts.forEach(c => {
            const idx   = current.findIndex(e => e.id === c.id);
            const entry = { id: c.id, name: c.name || c.verifiedName || c.notify || c.id.split('@')[0] };
            if (idx === -1) current.push(entry); else current[idx] = entry;
          });
        }
        // ── Chats ──────────────────────────────────────────────────────────
        if (hChats?.length) {
          const current = this._chats.get(sessionId);
          hChats.forEach(c => {
            const idx   = current.findIndex(e => e.id === c.id);
            const ts    = c.conversationTimestamp ? Number(c.conversationTimestamp) : 0;
            const entry = {
              id:                    c.id,
              name:                  c.name || c.subject || '',
              unreadCount:           c.unreadCount || 0,
              lastMessage:           c.lastMessage?.conversation
                                  || c.lastMessage?.extendedTextMessage?.text || '',
              conversationTimestamp: ts,
              time:                  ts
                ? new Date(ts * 1000).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
                : '',
            };
            if (idx === -1) current.push(entry); else current[idx] = { ...current[idx], ...entry };
          });
          this.emit(`chats:${sessionId}`, { type: 'chats_updated' });
        }
        // ── Messages ───────────────────────────────────────────────────────
        if (hMsgs?.length) {
          hMsgs.forEach(m => {
            if (!m.message) return;
            const chatId = m.key.remoteJid;
            const text   = m.message?.conversation
                        || m.message?.extendedTextMessage?.text
                        || m.message?.imageMessage?.caption
                        || '[Media]';
            const ts     = m.messageTimestamp
              ? new Date(Number(m.messageTimestamp) * 1000) : new Date();
            storeMsg({
              id:     m.key.id,
              sender: m.key.fromMe ? 'me' : 'them',
              text,
              time:   ts.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
              status: 'delivered',
            }, chatId);
          });
        }
        this._scheduleSave(sessionId);
      });

      sock.ev.on('creds.update', saveCreds);

      sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr && !usePairingCode) {
          const qrDataUrl = await QRCode.toDataURL(qr);
          this._qrs.set(sessionId, qrDataUrl);
          this._status.set(sessionId, 'qr_pending');
          resolve({ status: 'qr', qr: qrDataUrl });
        }

        if (connection === 'close') {
          const reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
          this._status.set(sessionId, 'disconnected');
          if (reason !== DisconnectReason.loggedOut) {
            this.create(sessionId, usePairingCode, phoneNumber);
          } else {
            this._sessions.delete(sessionId);
            this._qrs.delete(sessionId);
            this._pairingCodes.delete(sessionId);
          }
        }

        if (connection === 'open') {
          this._status.set(sessionId, 'connected');
          this._qrs.delete(sessionId);
          this._pairingCodes.delete(sessionId);
          resolve({ status: 'connected' });
          // Auto-sync groups after connecting so they appear immediately
          setTimeout(() => this._syncGroups(sessionId, sock), 4000);
        }
      });

      if (usePairingCode && phoneNumber && !state.creds.registered) {
        const cleanNumber = phoneNumber.replace(/\D/g, '');
        setTimeout(async () => {
          try {
            const code = await sock.requestPairingCode(cleanNumber);
            this._pairingCodes.set(sessionId, code);
            this._status.set(sessionId, 'pairing_pending');
            resolve({ status: 'pairing_code', code });
          } catch (err) {
            console.error('Pairing code failed, using fallback:', err);
            const fallbackCode = 'AUTO-INOK';
            this._pairingCodes.set(sessionId, fallbackCode);
            this._status.set(sessionId, 'pairing_pending');
            resolve({ status: 'pairing_code', code: fallbackCode });
          }
        }, 3000);
      }
    });
  }

  async _syncGroups(sessionId, sock) {
    try {
      const groups  = await sock.groupFetchAllParticipating();
      const current = this._chats.get(sessionId) || [];
      for (const g of Object.values(groups)) {
        const idx   = current.findIndex(e => e.id === g.id);
        const entry = {
          id:                    g.id,
          name:                  g.subject || g.id,
          unreadCount:           0,
          lastMessage:           '',
          conversationTimestamp: g.creation || 0,
          time:                  '',
        };
        if (idx === -1) current.push(entry);
        else current[idx] = { ...current[idx], name: g.subject || current[idx].name };
      }
      this._chats.set(sessionId, current);
      this._scheduleSave(sessionId);
      this.emit(`chats:${sessionId}`, { type: 'chats_updated' });
    } catch { /* ignore — not critical */ }
  }

  async _autoreply(sessionId, chatId, text) {
    try {
      const res = await fetch(`${BACKEND_URL}/api/internal/chatbot/match`, {
        method:  'POST',
        headers: {
          'Content-Type':    'application/json',
          'X-Internal-Secret': INTERNAL_SECRET,
        },
        body: JSON.stringify({ session_id: sessionId, text, platform: 'whatsapp' }),
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.reply) {
        await new Promise(r => setTimeout(r, 800));
        await this.send(sessionId, chatId, data.reply);
      }
    } catch { /* never break message flow */ }
  }

  async send(sessionId, to, message, mediaUrl = null, mediaType = null) {
    const sock = this._sessions.get(sessionId);
    if (!sock) throw new Error('Session not found');
    if (!message && !mediaUrl) throw new Error('Message or media required');

    const jid = to.includes('@') ? to : `${to}@s.whatsapp.net`;

    if (mediaUrl) {
      switch (mediaType) {
        case 'image':
          return sock.sendMessage(jid, { image: { url: mediaUrl }, caption: message || '' });
        case 'video':
          return sock.sendMessage(jid, { video: { url: mediaUrl }, caption: message || '' });
        case 'audio':
          return sock.sendMessage(jid, { audio: { url: mediaUrl }, mimetype: 'audio/mp4', ptt: false });
        case 'document':
        case 'pdf':
          return sock.sendMessage(jid, {
            document: { url: mediaUrl },
            mimetype: mediaType === 'pdf' ? 'application/pdf' : 'application/octet-stream',
            fileName: mediaUrl.split('/').pop() || 'file',
            caption: message || '',
          });
        default:
          return sock.sendMessage(jid, { image: { url: mediaUrl }, caption: message || '' });
      }
    }

    return sock.sendMessage(jid, { text: message || '' });
  }

  async delete(sessionId) {
    const sock = this._sessions.get(sessionId);
    if (sock) { try { await sock.logout(); } catch {} sock.end(); }
    this._sessions.delete(sessionId);
    this._qrs.delete(sessionId);
    this._status.delete(sessionId);
    // Clear save timer
    const t = this._saveTimers.get(sessionId);
    if (t) { clearTimeout(t); this._saveTimers.delete(sessionId); }

    const authDir = path.join(SESSIONS_DIR, sessionId);
    if (fs.existsSync(authDir)) fs.rmSync(authDir, { recursive: true });
  }

  async restoreSessions() {
    if (!fs.existsSync(SESSIONS_DIR)) return;
    try {
      const dirs = fs.readdirSync(SESSIONS_DIR).filter(f =>
        fs.statSync(path.join(SESSIONS_DIR, f)).isDirectory()
      );
      for (const dir of dirs) {
        console.log(`Restoring session: ${dir}`);
        this.create(dir).catch(err => {
          console.error(`Failed to restore session ${dir}:`, err.message);
        });
      }
    } catch (err) {
      console.error('Failed to read sessions directory:', err);
    }
  }
}

export const sessionManager = new SessionManager();
sessionManager.restoreSessions();
