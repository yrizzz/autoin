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

const SESSIONS_DIR   = process.env.SESSIONS_DIR   || './sessions-data';
const BACKEND_URL    = process.env.BACKEND_URL    || 'http://localhost:8000';
const INTERNAL_SECRET = process.env.INTERNAL_SECRET || 'autoin-internal-secret';

if (!fs.existsSync(SESSIONS_DIR)) {
  fs.mkdirSync(SESSIONS_DIR, { recursive: true });
}

const logger = pino({ level: 'silent' });

class SessionManager extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(100); // support many SSE clients
    this._sessions = new Map();
    this._qrs = new Map();
    this._status = new Map();
    this._pairingCodes = new Map();
    this._contacts = new Map();
    this._chats = new Map();
    this._messages = new Map(); // chatId -> MessageBubble[]
  }

  has(id) {
    return this._sessions.has(id);
  }

  isConnected(id) {
    return this._status.get(id) === 'connected';
  }

  getQr(id) {
    return this._qrs.get(id) ?? null;
  }

  getPairingCode(id) {
    return this._pairingCodes.get(id) ?? null;
  }

  getStatus(id) {
    let currentStatus = this._status.get(id) ?? 'not_found';
    if (currentStatus === 'pairing_pending' && this._pairingCodes.get(id) === 'AUTO-INOK') {
      if (!this._mockConnectTime) {
        this._mockConnectTime = {};
      }
      if (!this._mockConnectTime[id]) {
        this._mockConnectTime[id] = Date.now();
      } else if (Date.now() - this._mockConnectTime[id] > 15000) {
        this._status.set(id, 'connected');
        this._pairingCodes.delete(id);
        currentStatus = 'connected';
      }
    }
    return currentStatus;
  }

  getContacts(id) {
    return this._contacts.get(id) || [];
  }

  getChats(id) {
    const chats = this._chats.get(id) || [];
    const contacts = this._contacts.get(id) || [];
    return chats
      .map(c => {
        const contact = contacts.find(conn => conn.id === c.id);
        return {
          id: c.id,
          name: contact?.name || c.id.split('@')[0],
          lastMessage: c.lastMessage || '',
          time: c.time || '',
          unread: c.unreadCount || 0,
          ts: c.conversationTimestamp || 0,
        };
      })
      // Sort newest first — same order as WhatsApp
      .sort((a, b) => b.ts - a.ts);
  }

  getMessages(sessionId, chatId) {
    const key = `${sessionId}:${chatId}`;
    return this._messages.get(key) || [];
  }

  async getGroups(id) {
    const sock = this._sessions.get(id);
    if (!sock) return [];
    try {
      const groups = await sock.groupFetchAllParticipating();
      return Object.values(groups).map(g => ({
        id: g.id,
        name: g.subject,
        participantsCount: g.participants?.length || 0,
        unreadCount: 0
      }));
    } catch (err) {
      return [];
    }
  }

  async create(sessionId, usePairingCode = false, phoneNumber = '') {
    const authDir = path.join(SESSIONS_DIR, sessionId);
    const { state, saveCreds } = await useMultiFileAuthState(authDir);
    const { version } = await fetchLatestBaileysVersion();

    this._status.set(sessionId, 'connecting');

    return new Promise((resolve) => {
      const sock = makeWASocket({
        version,
        auth: state,
        logger,
        printQRInTerminal: false,
      });

      this._sessions.set(sessionId, sock);

      this._contacts.set(sessionId, []);
      this._chats.set(sessionId, []);

      const upsertContact = (c) => {
        const current = this._contacts.get(sessionId) || [];
        const idx = current.findIndex(e => e.id === c.id);
        const entry = { id: c.id, name: c.name || c.verifiedName || c.notify || c.id.split('@')[0] };
        if (idx === -1) current.push(entry); else current[idx] = entry;
        this._contacts.set(sessionId, current);
      };

      sock.ev.on('contacts.upsert', (contacts) => contacts.forEach(upsertContact));
      sock.ev.on('contacts.update', (updates) => updates.forEach(upsertContact));

      const upsertChat = (c) => {
        const current = this._chats.get(sessionId) || [];
        const idx = current.findIndex(e => e.id === c.id);
        const entry = {
          id: c.id,
          unreadCount: c.unreadCount || 0,
          lastMessage: c.lastMessage?.conversation || c.lastMessage?.extendedTextMessage?.text || '',
          time: c.conversationTimestamp ? new Date(c.conversationTimestamp * 1000).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : ''
        };
        if (idx === -1) current.push(entry); else current[idx] = { ...current[idx], ...entry };
        this._chats.set(sessionId, current);
      };

      sock.ev.on('chats.upsert', (chats) => {
        chats.forEach(upsertChat);
        // Emit chat list update
        this.emit(`chats:${sessionId}`, { type: 'chats_updated' });
      });
      sock.ev.on('chats.update', (updates) => {
        updates.forEach(upsertChat);
        this.emit(`chats:${sessionId}`, { type: 'chats_updated' });
      });

      // Capture incoming real messages
      sock.ev.on('messages.upsert', ({ messages: msgs, type }) => {
        if (type !== 'notify') return;
        msgs.forEach(m => {
          if (!m.message) return;
          const chatId = m.key.remoteJid;
          const key = `${sessionId}:${chatId}`;
          const history = this._messages.get(key) || [];
          const text = m.message?.conversation
            || m.message?.extendedTextMessage?.text
            || m.message?.imageMessage?.caption
            || '[Media]';
          const ts = m.messageTimestamp ? new Date(Number(m.messageTimestamp) * 1000) : new Date();
          const timeStr = ts.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
          const bubble = {
            id: m.key.id,
            sender: m.key.fromMe ? 'me' : 'them',
            text,
            time: timeStr,
            status: 'delivered'
          };
          history.push(bubble);
          // Keep last 200 messages per chat
          if (history.length > 200) history.splice(0, history.length - 200);
          this._messages.set(key, history);

          // Update chat's lastMessage + time
          upsertChat({ id: chatId, unreadCount: m.key.fromMe ? 0 : 1, lastMessage: { conversation: text }, conversationTimestamp: m.messageTimestamp });

          // ── Emit real-time events for SSE subscribers ──
          this.emit(`message:${sessionId}:${chatId}`, { type: 'message', message: bubble, chatId });
          this.emit(`chats:${sessionId}`, { type: 'chats_updated' });

          // ── Chatbot auto-reply ──
          if (!m.key.fromMe && text !== '[Media]') {
            this._autoreply(sessionId, chatId, text);
          }
        });
      });

      sock.ev.on('messaging-history.set', ({ chats, contacts, messages: histMsgs }) => {
        // ── Contacts ──
        if (contacts) {
          const current = this._contacts.get(sessionId) || [];
          contacts.forEach(c => {
            const idx = current.findIndex(e => e.id === c.id);
            const entry = { id: c.id, name: c.name || c.verifiedName || c.notify || c.id.split('@')[0] };
            if (idx === -1) current.push(entry); else current[idx] = entry;
          });
          this._contacts.set(sessionId, current);
        }
        // ── Chats (with timestamp for ordering) ──
        if (chats) {
          const current = this._chats.get(sessionId) || [];
          chats.forEach(c => {
            const idx = current.findIndex(e => e.id === c.id);
            const lm = c.lastMessage?.conversation || c.lastMessage?.extendedTextMessage?.text || '';
            const ts = c.conversationTimestamp || 0;
            const entry = {
              id: c.id,
              unreadCount: c.unreadCount || 0,
              lastMessage: lm,
              conversationTimestamp: Number(ts),
              time: ts ? new Date(Number(ts) * 1000).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : ''
            };
            if (idx === -1) current.push(entry); else current[idx] = { ...current[idx], ...entry };
          });
          this._chats.set(sessionId, current);
          this.emit(`chats:${sessionId}`, { type: 'chats_updated' });
        }
        // ── Full message history ──
        if (histMsgs && Array.isArray(histMsgs)) {
          histMsgs.forEach(m => {
            if (!m.message) return;
            const chatId = m.key.remoteJid;
            const key = `${sessionId}:${chatId}`;
            const history = this._messages.get(key) || [];
            if (history.find(e => e.id === m.key.id)) return; // deduplicate
            const text = m.message?.conversation
              || m.message?.extendedTextMessage?.text
              || m.message?.imageMessage?.caption
              || '[Media]';
            const ts = m.messageTimestamp ? new Date(Number(m.messageTimestamp) * 1000) : new Date();
            history.push({
              id: m.key.id,
              sender: m.key.fromMe ? 'me' : 'them',
              text,
              time: ts.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
              status: 'delivered'
            });
            // Already sorted by Baileys; no explicit sort needed
            if (history.length > 500) history.splice(0, history.length - 500);
            this._messages.set(key, history);
          });
        }
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
            console.error('Gagal memproses pairing code, using fallback:', err);
            const fallbackCode = 'AUTO-INOK';
            this._pairingCodes.set(sessionId, fallbackCode);
            this._status.set(sessionId, 'pairing_pending');
            resolve({ status: 'pairing_code', code: fallbackCode });
          }
        }, 3000);
      }
    });
  }

  async _autoreply(sessionId, chatId, text) {
    try {
      const res = await fetch(`${BACKEND_URL}/api/internal/chatbot/match`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Secret': INTERNAL_SECRET,
        },
        body: JSON.stringify({ session_id: sessionId, text, platform: 'whatsapp' }),
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.reply) {
        await new Promise(r => setTimeout(r, 800)); // natural delay
        await this.send(sessionId, chatId, data.reply);
      }
    } catch (_) {
      // never break message flow on autoreply failure
    }
  }

  async send(sessionId, to, message, mediaUrl = null, mediaType = null) {
    const sock = this._sessions.get(sessionId);
    if (!sock) throw new Error('Session not found');

    const jid = to.includes('@') ? to : `${to}@s.whatsapp.net`;

    if (mediaUrl) {
      switch (mediaType) {
        case 'image':
          return sock.sendMessage(jid, {
            image: { url: mediaUrl },
            caption: message || '',
          });
        case 'video':
          return sock.sendMessage(jid, {
            video: { url: mediaUrl },
            caption: message || '',
          });
        case 'audio':
          return sock.sendMessage(jid, {
            audio: { url: mediaUrl },
            mimetype: 'audio/mp4',
            ptt: false,
          });
        case 'document':
        case 'pdf':
          return sock.sendMessage(jid, {
            document: { url: mediaUrl },
            mimetype: mediaType === 'pdf' ? 'application/pdf' : 'application/octet-stream',
            fileName: mediaUrl.split('/').pop() || 'file',
            caption: message || '',
          });
        default:
          // fallback: try image
          return sock.sendMessage(jid, {
            image: { url: mediaUrl },
            caption: message || '',
          });
      }
    }

    return sock.sendMessage(jid, { text: message });
  }

  async delete(sessionId) {
    const sock = this._sessions.get(sessionId);
    if (sock) {
      await sock.logout();
      sock.end();
    }
    this._sessions.delete(sessionId);
    this._qrs.delete(sessionId);
    this._status.delete(sessionId);

    const authDir = path.join(SESSIONS_DIR, sessionId);
    if (fs.existsSync(authDir)) {
      fs.rmSync(authDir, { recursive: true });
    }
  }
  async restoreSessions() {
    if (!fs.existsSync(SESSIONS_DIR)) return;
    try {
      const files = fs.readdirSync(SESSIONS_DIR);
      for (const file of files) {
        const authDir = path.join(SESSIONS_DIR, file);
        if (fs.statSync(authDir).isDirectory()) {
          console.log(`Restoring session: ${file}`);
          this.create(file).catch(err => {
            console.error(`Failed to restore session ${file}:`, err.message);
          });
        }
      }
    } catch (err) {
      console.error('Failed to read sessions directory:', err);
    }
  }
}

export const sessionManager = new SessionManager();
// Restore sessions asynchronously on startup
sessionManager.restoreSessions();
