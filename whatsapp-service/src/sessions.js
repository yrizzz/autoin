import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
  downloadMediaMessage,
  BufferJSON,
  initAuthCreds,
  proto,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import QRCode from 'qrcode';
import pino from 'pino';
import { EventEmitter } from 'events';
import { runPlugin } from './pluginRunner.js';

const MEDIA_DIR = './media-temp';
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8001';
const INTERNAL_SECRET = process.env.INTERNAL_SECRET || 'autoin-internal-secret';

if (!fs.existsSync(MEDIA_DIR)) fs.mkdirSync(MEDIA_DIR, { recursive: true });

const logger = pino({ level: 'info' });

function saveRemoteDebugLog(key, value) {
  // Best-effort telemetry. Fire-and-forget with a hard timeout so a slow/stuck
  // backend can NEVER block or delay a real send response. Previously this was
  // awaited with no timeout, so a hanging POST here would stall the whole
  // /send request (message already delivered to WhatsApp) until Laravel's 30s
  // cURL timeout fired — i.e. "chat masuk tapi result API error".
  fetch(`${BACKEND_URL}/api/internal/whatsapp/auth`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Internal-Secret': INTERNAL_SECRET,
    },
    body: JSON.stringify({
      session_id: 'debug_logs',
      data: { [key]: typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value) }
    }),
    signal: AbortSignal.timeout(5000),
  }).catch(e => console.error('Failed to save remote debug log:', e?.message || e));
}

// ── Persisted via Laravel MySQL database API ─────────────────────────────────
const KEY_MAP = {
  'pre-key': 'pre-key-',
  'session': 'session-',
  'sender-key': 'sender-key-',
  'sender-key-memory': 'sender-key-memory-',
  'app-state-sync-key': 'app-state-sync-key-',
  'app-state-sync-version': 'app-state-sync-version-'
};

async function useMySQLAuthState(sessionId) {
  const getUrl = `${BACKEND_URL}/api/internal/whatsapp/auth?session_id=${sessionId}`;
  let dbData = {};
  let success = false;
  
  // Try up to 3 times to load auth state from database to avoid transient errors on restart
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      console.log(`[useMySQLAuthState] Loading auth state for ${sessionId} (attempt ${attempt})...`);
      const res = await fetch(getUrl, {
        headers: { 'X-Internal-Secret': INTERNAL_SECRET },
        signal: AbortSignal.timeout(10000)
      });
      if (res.ok) {
        dbData = await res.json();
        success = true;
        break;
      } else {
        throw new Error(`Server returned status ${res.status}`);
      }
    } catch (err) {
      console.error(`[useMySQLAuthState] Failed to load auth state (attempt ${attempt}):`, err.message || err);
      if (attempt < 3) {
        await new Promise(r => setTimeout(r, 3000));
      }
    }
  }

  if (!success) {
    throw new Error(`Failed to load auth state for session ${sessionId} after 3 attempts. Aborting connection to prevent session reset.`);
  }

  const authCache = {};
  for (const [key, value] of Object.entries(dbData)) {
    try {
      authCache[key] = JSON.parse(JSON.stringify(value), BufferJSON.reviver);
    } catch { }
  }

  let pendingUpdates = {};
  let updateTimeout = null;

  const flushUpdates = () => {
    if (updateTimeout) clearTimeout(updateTimeout);
    updateTimeout = null;

    const payload = { ...pendingUpdates };
    if (Object.keys(payload).length === 0) return Promise.resolve();
    pendingUpdates = {};

    console.log(`[useMySQLAuthState] Flushing ${Object.keys(payload).length} updates to MySQL:`, Object.keys(payload));

    const saveUrl = `${BACKEND_URL}/api/internal/whatsapp/auth`;
    return fetch(saveUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Secret': INTERNAL_SECRET
      },
      body: JSON.stringify({
        session_id: sessionId,
        data: payload
      }),
      signal: AbortSignal.timeout(15000)
    })
    .then(r => r.json().then(d => console.log(`[useMySQLAuthState] Save response:`, d)))
    .catch(err => console.error('[useMySQLAuthState] Failed to save auth state to database:', err));
  };

  const queueUpdate = (key, value) => {
    console.log(`[useMySQLAuthState] Queued update for key: ${key}`);
    if (value) {
      pendingUpdates[key] = JSON.parse(JSON.stringify(value, BufferJSON.replacer));
    } else {
      pendingUpdates[key] = null;
    }

    if (!updateTimeout) {
      updateTimeout = setTimeout(flushUpdates, 2000);
    }
  };

  if (!authCache['creds']) {
    console.log(`[useMySQLAuthState] Credentials missing, initializing and saving creds to database...`);
    authCache['creds'] = initAuthCreds();
    queueUpdate('creds', authCache['creds']);
  }

  const creds = authCache['creds'];

  return {
    state: {
      creds,
      keys: {
        get: async (type, ids) => {
          const dict = {};
          const keyPrefix = KEY_MAP[type] || `${type}-`;
          for (const id of ids) {
            const cacheKey = `${keyPrefix}${id}`;
            let value = authCache[cacheKey];
            if (value) {
              if (type === 'app-state-sync-key') {
                value = proto.Message.AppStateSyncKeyData.fromObject(value);
              }
              dict[id] = value;
            }
          }
          return dict;
        },
        set: async (data) => {
          for (const type of Object.keys(data)) {
            const keyPrefix = KEY_MAP[type] || `${type}-`;
            for (const id of Object.keys(data[type])) {
              const cacheKey = `${keyPrefix}${id}`;
              const value = data[type][id];
              if (value) {
                authCache[cacheKey] = value;
                queueUpdate(cacheKey, value);
              } else {
                delete authCache[cacheKey];
                queueUpdate(cacheKey, null);
              }
            }
          }
        }
      }
    },
    saveCreds: () => {
      authCache['creds'] = creds;
      queueUpdate('creds', creds);
      flushUpdates(); // Flush credentials immediately!
    },
    flush: () => flushUpdates()
  };
}

function getRealMessage(message) {
  if (!message) return null;
  if (message.ephemeralMessage) return getRealMessage(message.ephemeralMessage.message);
  if (message.viewOnceMessage) return getRealMessage(message.viewOnceMessage.message);
  if (message.viewOnceMessageV2) return getRealMessage(message.viewOnceMessageV2.message);
  if (message.documentWithCaptionMessage) return getRealMessage(message.documentWithCaptionMessage.message);
  return message;
}
class SessionManager extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(100);
    this._sessions = new Map();
    this._qrs = new Map();
    this._status = new Map();
    this._pairingCodes = new Map();
    this._contacts = new Map();
    this._chats = new Map();
    this._messages = new Map(); // `${sessionId}:${chatId}` → Msg[]
    this._saveTimers = new Map();
    this._lidToPhone = new Map(); // `${sessionId}:${lid}` → phone JID
    this._flushes = new Map();
  }

  // ── JID Translation ────────────────────────────────────────────────────────
  translateJid(sessionId, jid) {
    if (!jid) return jid;
    if (jid.endsWith('@lid')) {
      const mapped = this._lidToPhone.get(`${sessionId}:${jid}`);
      if (mapped) return mapped;
    }
    return jid;
  }

  async syncToDb(sessionId) {
    const contacts = this._contacts.get(sessionId) || [];
    const chats = this.getChats(sessionId) || [];

    // Collect last 100 messages per chat for persistence
    const messages = {};
    for (const [key, msgs] of this._messages.entries()) {
      if (key.startsWith(`${sessionId}:`)) {
        const chatId = key.slice(sessionId.length + 1);
        messages[chatId] = msgs.slice(-100);
      }
    }

    // Persist LID → phone mapping so it survives restarts
    const lidMap = {};
    const prefix = `${sessionId}:`;
    for (const [k, v] of this._lidToPhone.entries()) {
      if (k.startsWith(prefix)) {
        lidMap[k.slice(prefix.length)] = v;
      }
    }

    try {
      const groups = await this.getGroups(sessionId);
      const url = `${BACKEND_URL}/api/internal/whatsapp/sync`;
      await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Secret': INTERNAL_SECRET
        },
        body: JSON.stringify({
          session_id: sessionId,
          contacts,
          chats,
          groups,
          messages,
          lidMap
        }),
        signal: AbortSignal.timeout(15000)
      });
    } catch (err) {
      console.error('Failed to sync to database:', err);
    }
  }

  // ── Throttled save — at most once per 10s per session to MySQL database ─────
  _scheduleSave(sessionId) {
    if (this._saveTimers.has(sessionId)) return;
    const t = setTimeout(async () => {
      this._saveTimers.delete(sessionId);
      await this.syncToDb(sessionId);
    }, 10000);
    this._saveTimers.set(sessionId, t);
  }

  // ── Restore from MySQL ────────────────────────────────────────────────────
  async _loadFromDb(sessionId) {
    try {
      const url = `${BACKEND_URL}/api/internal/whatsapp/sync-data?session_id=${sessionId}`;
      const res = await fetch(url, {
        headers: {
          'X-Internal-Secret': INTERNAL_SECRET
        },
        signal: AbortSignal.timeout(15000)
      });
      if (res.ok) {
        const store = await res.json();
        if (store.contacts?.length) {
          this._contacts.set(sessionId, store.contacts);
          // Rebuild LID → phone mapping from stored contacts
          // Contacts may have an `lid` field stored if we ever save it, but mostly we rely
          // on the chats list: any @lid chat whose name matches a @s.whatsapp.net contact
          // can be resolved. Store contacts have id in @s.whatsapp.net format.
          // We use the chats list to cross-reference: if a @lid chat name matches a phone contact, map it.
          if (store.chats?.length) {
            const phoneChats = store.chats.filter(c => c.id && c.id.endsWith('@s.whatsapp.net'));
            const lidChats   = store.chats.filter(c => c.id && c.id.endsWith('@lid'));
            for (const lidChat of lidChats) {
              // Find phone chat with same name
              const match = phoneChats.find(p => p.name && lidChat.name && p.name === lidChat.name);
              if (match) {
                this._lidToPhone.set(`${sessionId}:${lidChat.id}`, match.id);
              }
            }
          }
        }
        if (store.chats?.length) {
          const mappedChats = store.chats.map(c => ({
            id: c.id,
            name: c.name,
            unreadCount: c.unread || 0,
            lastMessage: c.lastMessage || '',
            conversationTimestamp: c.ts || 0,
            time: c.time || '',
          }));
          this._chats.set(sessionId, mappedChats);
        }
        // Restore persisted message history
        if (store.messages && typeof store.messages === 'object') {
          for (const [chatId, msgs] of Object.entries(store.messages)) {
            if (Array.isArray(msgs) && msgs.length > 0) {
              this._messages.set(`${sessionId}:${chatId}`, msgs);
            }
          }
          console.log(`[_loadFromDb] Restored messages for ${Object.keys(store.messages).length} chats`);
        }
        // Restore LID → phone mapping
        if (store.lidMap && typeof store.lidMap === 'object') {
          for (const [lid, phone] of Object.entries(store.lidMap)) {
            this._lidToPhone.set(`${sessionId}:${lid}`, phone);
          }
          console.log(`[_loadFromDb] Restored ${Object.keys(store.lidMap).length} LID mappings`);
        }
      }
    } catch (err) {
      console.error('Failed to load sync data from database:', err);
    }
  }

  async _downloadAndGetUrl(m, sock) {
    try {
      const messageContent = getRealMessage(m.message);
      if (!messageContent) return null;

      let mediaType = null;
      let mimetype = '';
      let filename = m.key.id;

      if (messageContent.imageMessage) {
        mediaType = 'image';
        mimetype = messageContent.imageMessage.mimetype || 'image/jpeg';
        filename += mimetype.includes('png') ? '.png' : '.jpg';
      } else if (messageContent.videoMessage) {
        mediaType = 'video';
        mimetype = messageContent.videoMessage.mimetype || 'video/mp4';
        filename += '.mp4';
      } else if (messageContent.audioMessage) {
        mediaType = 'audio';
        mimetype = messageContent.audioMessage.mimetype || 'audio/ogg';
        filename += mimetype.includes('mp4') ? '.m4a' : '.ogg';
      } else if (messageContent.documentMessage) {
        mediaType = 'document';
        mimetype = messageContent.documentMessage.mimetype || 'application/octet-stream';
        const docName = messageContent.documentMessage.fileName || 'file';
        const ext = docName.split('.').pop() || '';
        filename += ext ? `.${ext}` : '';
      }

      if (!mediaType) return null;

      const unwrappedMessage = {
        ...m,
        message: messageContent
      };

      const buffer = await downloadMediaMessage(
        unwrappedMessage,
        'buffer',
        {},
        {
          logger,
          reuploadRequest: sock.updateMediaMessage,
        }
      );

      if (buffer) {
        const mediaPath = path.join(MEDIA_DIR, filename);
        fs.mkdirSync(path.dirname(mediaPath), { recursive: true });
        fs.writeFileSync(mediaPath, buffer);
        const serviceUrl = process.env.WHATSAPP_SERVICE_URL || 'http://localhost:3001';
        return {
          mediaUrl: `${serviceUrl}/media/${filename}`,
          mediaType,
        };
      }
    } catch (err) {
      console.error('Failed to download media:', err);
    }
    return null;
  }

  // Ambil media untuk plugin: dari media yang dikirim bareng command (caption),
  // atau dari pesan yang di-reply (quoted). Dikembalikan sebagai data URL base64
  // supaya bisa dipakai langsung lewat ctx.media + helpers.upload di sandbox.
  async _extractPluginMedia(sessionId, rawMessage) {
    try {
      const sock = this._sessions.get(sessionId);
      if (!sock || !rawMessage?.message || !rawMessage.key) return null;

      const realMsg = getRealMessage(rawMessage.message);
      if (!realMsg) return null;

      const KINDS = ['imageMessage', 'videoMessage', 'audioMessage', 'documentMessage'];
      const kindOf = (msg) => msg && KINDS.find(k => msg[k]);

      let node = null, kind = null, key = null;

      const directKind = kindOf(realMsg);
      if (directKind) {
        // Gambar dikirim langsung bersama command (caption ".hd")
        kind = directKind;
        node = realMsg[directKind];
        key = rawMessage.key;
      } else {
        // Command me-reply pesan lain → ambil dari contextInfo.quotedMessage
        let ci = null;
        for (const k of Object.keys(realMsg)) {
          const c = realMsg[k]?.contextInfo;
          if (c?.quotedMessage) { ci = c; break; }
        }
        if (!ci) return null;
        const quoted = getRealMessage(ci.quotedMessage);
        const qKind = kindOf(quoted);
        if (!qKind) return null;
        kind = qKind;
        node = quoted[qKind];
        key = {
          remoteJid: rawMessage.key.remoteJid,
          id: ci.stanzaId,
          participant: ci.participant,
          fromMe: false,
        };
      }

      const mediaType = kind === 'imageMessage' ? 'image'
        : kind === 'videoMessage' ? 'video'
        : kind === 'audioMessage' ? 'audio' : 'document';
      const mimetype = node.mimetype || (mediaType === 'image' ? 'image/jpeg' : 'application/octet-stream');

      const buffer = await downloadMediaMessage(
        { key, message: { [kind]: node } },
        'buffer',
        {},
        { logger, reuploadRequest: sock.updateMediaMessage }
      );
      if (!buffer || !buffer.length) return null;

      const MAX = 8 * 1024 * 1024; // batasi base64 agar ctx tidak membengkak
      if (buffer.length > MAX) return { mediaType, mimetype, size: buffer.length, tooLarge: true };

      return {
        mediaType,
        mimetype,
        size: buffer.length,
        dataUrl: `data:${mimetype};base64,${buffer.toString('base64')}`,
      };
    } catch (err) {
      console.error('[Plugin] Gagal mengambil media:', err?.message || err);
      return null;
    }
  }

  has(id) { return this._sessions.has(id); }
  isConnected(id) {
    const sock = this._sessions.get(id);
    return this._status.get(id) === 'connected' || !!(sock && sock.user);
  }
  getQr(id) { return this._qrs.get(id) ?? null; }
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

  updateContacts(id, contacts) {
    this._contacts.set(id, contacts);
  }

  getChats(id) {
    const chats = this._chats.get(id) || [];
    const contacts = this._contacts.get(id) || [];

    const mapped = chats.map(c => {
      // Translate LID to phone number if mapping is available
      const resolvedId = this.translateJid(id, c.id);
      const contact = contacts.find(con => con.id === resolvedId || con.id === c.id);
      return {
        id: resolvedId,           // Use resolved (phone) ID when possible
        _rawId: c.id,             // Keep raw for fallback
        name: contact?.name || c.name || resolvedId.split('@')[0],
        lastMessage: c.lastMessage || '',
        time: c.time || '',
        unread: c.unreadCount || 0,
        ts: c.conversationTimestamp || 0,
      };
    });

    // Deduplicate by canonical ID first, then by name as fallback
    const byId = new Map();
    for (const c of mapped) {
      const key = c.id;   // already translated
      if (!byId.has(key)) {
        byId.set(key, c);
      } else {
        const existing = byId.get(key);
        // Merge: keep more recent data
        byId.set(key, {
          ...existing,
          name: existing.name.length > c.name.length ? existing.name : c.name,
          lastMessage: existing.ts >= c.ts ? (existing.lastMessage || c.lastMessage) : (c.lastMessage || existing.lastMessage),
          ts: Math.max(existing.ts, c.ts),
          unread: Math.max(existing.unread, c.unread),
        });
      }
    }

    // Secondary dedup: if two entries share the same name AND one is still @lid, merge them
    const byName = new Map();
    for (const c of byId.values()) {
      const isLid = c.id.endsWith('@lid');
      const key = c.name;
      if (!byName.has(key)) {
        byName.set(key, c);
      } else {
        const existing = byName.get(key);
        const existingIsLid = existing.id.endsWith('@lid');
        if (existingIsLid && !isLid) {
          byName.set(key, { ...c, lastMessage: c.lastMessage || existing.lastMessage, ts: Math.max(c.ts, existing.ts), unread: Math.max(c.unread, existing.unread) });
        } else if (!existingIsLid && isLid) {
          byName.set(key, { ...existing, lastMessage: existing.lastMessage || c.lastMessage, ts: Math.max(existing.ts, c.ts), unread: Math.max(existing.unread, c.unread) });
        } else {
          if (c.ts > existing.ts) byName.set(key, c);
        }
      }
    }

    return Array.from(byName.values())
      .map(({ _rawId, ...rest }) => rest)  // strip internal field
      .sort((a, b) => b.ts - a.ts);
  }
  getMessages(sessionId, chatId) {
    // Primary lookup
    const direct = this._messages.get(`${sessionId}:${chatId}`) || [];
    if (direct.length > 0) return direct;

    // Fallback: if chatId is a phone number, check if there's a LID key with same contact
    // (happens when messages were stored under @lid before translation was available)
    const allKeys = Array.from(this._messages.keys()).filter(k => k.startsWith(`${sessionId}:`));
    for (const key of allKeys) {
      const keyJid = key.slice(sessionId.length + 1);
      // Translate the stored key's JID and see if it resolves to chatId
      const translated = this.translateJid(sessionId, keyJid);
      if (translated === chatId && keyJid !== chatId) {
        return this._messages.get(key) || [];
      }
    }
    return [];
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
        unreadCount: 0,
      }));
    } catch { return []; }
  }

  async getGroupMetadata(id, groupId) {
    const sock = this._sessions.get(id);
    if (!sock) throw new Error('Session not found');
    return await sock.groupMetadata(groupId);
  }

  async create(sessionId, usePairingCode = false, phoneNumber = '') {
    // Load any persisted data before connecting
    await this._loadFromDb(sessionId);

    const { state, saveCreds, flush } = await useMySQLAuthState(sessionId);
    this._flushes.set(sessionId, flush);
    let version = [2, 3000, 1017592466];
    try {
      const latest = await Promise.race([
        fetchLatestBaileysVersion(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 1200))
      ]);
      version = latest.version;
    } catch (err) {
      console.log('[sessions] Using stable fallback Baileys version due to NPM version fetch timeout');
    }

    this._status.set(sessionId, 'connecting');

    return new Promise((resolve) => {
      const sock = makeWASocket({ version, auth: state, logger, printQRInTerminal: false });
      this._sessions.set(sessionId, sock);

      // Ensure maps exist
      if (!this._contacts.has(sessionId)) this._contacts.set(sessionId, []);
      if (!this._chats.has(sessionId)) this._chats.set(sessionId, []);

      // ── Contact helpers ────────────────────────────────────────────────────
      const upsertContact = (c) => {
        if (c.id && c.id.endsWith('@s.whatsapp.net') && c.lid) {
          const lidJid = c.lid.includes('@') ? c.lid : `${c.lid}@lid`;
          this._lidToPhone.set(`${sessionId}:${lidJid}`, c.id);
        }
        const jid = this.translateJid(sessionId, c.id);
        const current = this._contacts.get(sessionId);
        const idx = current.findIndex(e => e.id === jid);
        const entry = { id: jid, name: c.name || c.verifiedName || c.notify || jid.split('@')[0] };
        if (idx === -1) current.push(entry); else current[idx] = entry;
        this._scheduleSave(sessionId);
      };

      sock.ev.on('contacts.upsert', cs => cs.forEach(upsertContact));
      sock.ev.on('contacts.update', cs => cs.forEach(upsertContact));

      sock.ev.on('lid-mapping.update', mapping => {
        if (mapping.lid && mapping.pn) {
          const lid = mapping.lid.includes('@') ? mapping.lid : `${mapping.lid}@lid`;
          const pn = mapping.pn.includes('@') ? mapping.pn : `${mapping.pn}@s.whatsapp.net`;
          this._lidToPhone.set(`${sessionId}:${lid}`, pn);
          this._scheduleSave(sessionId);
        }
      });

      // ── Chat helpers ───────────────────────────────────────────────────────
      const upsertChat = (c) => {
        const jid = this.translateJid(sessionId, c.id);
        const current = this._chats.get(sessionId) || [];
        const idx = current.findIndex(e => e.id === jid);
        const existing = idx !== -1 ? current[idx] : null;
        const ts = c.conversationTimestamp ? Number(c.conversationTimestamp) : 0;
        const entry = {
          id: jid,
          name: c.name || c.subject || (existing ? existing.name : ''),
          unreadCount: c.unreadCount !== undefined ? c.unreadCount : (existing ? existing.unreadCount : 0),
          lastMessage: (c.lastMessage?.conversation
            || c.lastMessage?.extendedTextMessage?.text
            || (typeof c.lastMessage === 'string' ? c.lastMessage : '')
            || (existing ? existing.lastMessage : '')),
          conversationTimestamp: ts || (existing ? existing.conversationTimestamp : 0),
          time: ts
            ? new Date(ts * 1000).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
            : (existing ? existing.time : ''),
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
        const key = `${sessionId}:${chatId}`;
        const history = this._messages.get(key) || [];
        if (history.find(e => e.id === m.id)) return; // dedup
        history.push(m);
        if (history.length > 500) history.splice(0, history.length - 500);
        this._messages.set(key, history);
        this._scheduleSave(sessionId);
      };

      sock.ev.on('messages.upsert', async ({ messages: msgs, type }) => {
        if (type !== 'notify' && type !== 'append') return;
        for (const m of msgs) {
          const realMsg = getRealMessage(m.message);
          if (!realMsg) continue;
          const chatId = this.translateJid(sessionId, m.key.remoteJid);
          const text = realMsg.conversation
            || realMsg.extendedTextMessage?.text
            || realMsg.imageMessage?.caption
            || realMsg.videoMessage?.caption
            || realMsg.documentMessage?.caption
            || '[Media]';
          const ts = m.messageTimestamp
            ? new Date(Number(m.messageTimestamp) * 1000) : new Date();

          let mediaUrl = null;
          let mediaType = null;
          const isMedia = realMsg.imageMessage
            || realMsg.videoMessage
            || realMsg.audioMessage
            || realMsg.documentMessage;

          if (isMedia) {
            const media = await this._downloadAndGetUrl(m, sock);
            if (media) {
              mediaUrl = media.mediaUrl;
              mediaType = media.mediaType;
            }
          }

          const bubble = {
            id: m.key.id,
            sender: m.key.fromMe ? 'me' : 'them',
            text,
            time: ts.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
            status: 'delivered',
            mediaUrl,
            mediaType,
          };
          storeMsg(bubble, chatId);

          const existingChats = this._chats.get(sessionId) || [];
          const existingChat = existingChats.find(e => e.id === chatId);
          const currentUnread = existingChat ? existingChat.unreadCount : 0;

          upsertChat({
            id: chatId,
            unreadCount: m.key.fromMe ? 0 : (currentUnread + 1),
            lastMessage: text,
            conversationTimestamp: m.messageTimestamp,
          });

          this.emit(`message:${sessionId}:${chatId}`, { type: 'message', message: bubble, chatId });
          this.emit(`chats:${sessionId}`, { type: 'chats_updated' });

          if (!m.key.fromMe && text !== '[Media]') {
            this._autoreply(sessionId, chatId, text, m);
          }
        }
      });

      sock.ev.on('messaging-history.set', ({ chats: hChats, contacts: hContacts, messages: hMsgs }) => {
        // ── Contacts ───────────────────────────────────────────────────────
        if (hContacts?.length) {
          const current = this._contacts.get(sessionId);
          hContacts.forEach(c => {
            if (c.id && c.id.endsWith('@s.whatsapp.net') && c.lid) {
              const lidJid = c.lid.includes('@') ? c.lid : `${c.lid}@lid`;
              this._lidToPhone.set(`${sessionId}:${lidJid}`, c.id);
            }
            const jid = this.translateJid(sessionId, c.id);
            const idx = current.findIndex(e => e.id === jid);
            const entry = { id: jid, name: c.name || c.verifiedName || c.notify || jid.split('@')[0] };
            if (idx === -1) current.push(entry); else current[idx] = entry;
          });
        }
        // ── Chats ──────────────────────────────────────────────────────────
        if (hChats?.length) {
          const current = this._chats.get(sessionId);
          hChats.forEach(c => {
            const jid = this.translateJid(sessionId, c.id);
            const idx = current.findIndex(e => e.id === jid);
            const ts = c.conversationTimestamp ? Number(c.conversationTimestamp) : 0;
            const entry = {
              id: jid,
              name: c.name || c.subject || '',
              unreadCount: c.unreadCount || 0,
              lastMessage: c.lastMessage?.conversation
                || c.lastMessage?.extendedTextMessage?.text || '',
              conversationTimestamp: ts,
              time: ts
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
            const realMsg = getRealMessage(m.message);
            if (!realMsg) return;
            const chatId = this.translateJid(sessionId, m.key.remoteJid);
            const text = realMsg.conversation
              || realMsg.extendedTextMessage?.text
              || realMsg.imageMessage?.caption
              || realMsg.videoMessage?.caption
              || realMsg.documentMessage?.caption
              || '[Media]';
            const ts = m.messageTimestamp
              ? new Date(Number(m.messageTimestamp) * 1000) : new Date();
            storeMsg({
              id: m.key.id,
              sender: m.key.fromMe ? 'me' : 'them',
              text,
              time: ts.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
              status: 'delivered',
            }, chatId);
          });
        }
        this._scheduleSave(sessionId);
      });

      sock.ev.on('creds.update', saveCreds);

      sock.ev.on('connection.update', async (update) => {
        console.log(`[connection.update] Session ${sessionId}:`, update);
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
            console.log(`[connection.update] Session closed (reason: ${reason}). Reconnecting in 3 seconds...`);
            if (typeof flush === 'function') {
              flush();
            }
            setTimeout(() => {
              this.create(sessionId, usePairingCode, phoneNumber);
            }, 3000);
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
      const groups = await sock.groupFetchAllParticipating();
      const current = this._chats.get(sessionId) || [];
      for (const g of Object.values(groups)) {
        const idx = current.findIndex(e => e.id === g.id);
        const entry = {
          id: g.id,
          name: g.subject || g.id,
          unreadCount: 0,
          lastMessage: '',
          conversationTimestamp: g.creation || 0,
          time: '',
        };
        if (idx === -1) current.push(entry);
        else current[idx] = { ...current[idx], name: g.subject || current[idx].name };
      }
      this._chats.set(sessionId, current);
      this._scheduleSave(sessionId);
      this.emit(`chats:${sessionId}`, { type: 'chats_updated' });
    } catch { /* ignore — not critical */ }
  }

  async _autoreply(sessionId, chatId, text, rawMessage = null) {
    console.log(`[Chatbot] Triggered for session ${sessionId}, chat ${chatId}, text: "${text}"`);
    const sender = rawMessage?.key?.participant || rawMessage?.participant || chatId;
    try {
      const url = `${BACKEND_URL}/api/internal/chatbot/match`;
      console.log(`[Chatbot] Calling match API: ${url}`);
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Secret': INTERNAL_SECRET,
        },
        body: JSON.stringify({ session_id: sessionId, text, sender, platform: 'whatsapp' }),
        signal: AbortSignal.timeout(10000)
      });
      console.log(`[Chatbot] Match API response status: ${res.status}`);
      if (!res.ok) {
        const errText = await res.text();
        console.error(`[Chatbot] Match API error response:`, errText);
        return;
      }
      const data = await res.json();
      console.log(`[Chatbot] Match API response data:`, data);

      // ── Plugin: jalankan script user di sandbox, kirim output-nya ───────────
      if (data.type === 'plugin' && data.plugin) {
        await this._runPluginReply(sessionId, chatId, data, rawMessage, sender);
        return;
      }

      if (data.reply || data.media_url) {
        console.log(`[Chatbot] Matching rule found! Replying with: "${data.reply}", type: ${data.reply_type || 'normal'}, media: ${data.media_url || 'none'}`);
        await new Promise(r => setTimeout(r, 800));
        const quoted = data.reply_type === 'quote' ? rawMessage : null;
        await this.send(sessionId, chatId, data.reply || '', data.media_url || null, data.media_type || null, quoted);
        console.log(`[Chatbot] Reply sent successfully.`);
      } else {
        console.log(`[Chatbot] No matching rule found.`);
      }
    } catch (err) {
      console.error(`[Chatbot] Exception in autoreply:`, err);
    }
  }

  // Kirim/ubah emoji reaction pada pesan command. Best-effort: gagal = diabaikan.
  // emoji '' menghapus reaction.
  async _react(sessionId, key, emoji) {
    if (!key) return;
    const sock = this._sessions.get(sessionId);
    if (!sock) return;
    try {
      await sock.sendMessage(key.remoteJid, { react: { text: emoji, key } });
    } catch (err) {
      console.warn(`[Plugin] Gagal kirim reaction "${emoji}":`, err?.message || err);
    }
  }

  async _runPluginReply(sessionId, chatId, data, rawMessage, sender) {
    const plugin = data.plugin;
    console.log(`[Plugin] Running "${plugin.name}" (#${plugin.id}) for ${sender}, args:`, data.args);

    // Reaction feedback (setting per-akun): ⏳ saat command terdeteksi.
    const reactKey = data.react_feedback ? (rawMessage?.key || null) : null;
    if (reactKey) await this._react(sessionId, reactKey, '⏳');

    // Hormati mode kirim rule: 'quote' = balas sambil mengutip pesan, selain itu balas biasa.
    const quoted = data.reply_type === 'quote' ? rawMessage : null;
    const ctx = {
      args: data.args || [],
      rawArgs: data.raw_args || '',
      text: data.raw_args || '',
      sender,
      chatId,
      sessionId,
    };

    // Lampirkan media (gambar yang di-reply / dikirim dgn caption) bila ada,
    // supaya plugin bisa memprosesnya (mis. .removebg / .hd).
    try {
      const media = await this._extractPluginMedia(sessionId, rawMessage);
      if (media) ctx.media = media;
    } catch { /* non-fatal */ }

    let result;
    try {
      result = await runPlugin(plugin.code, ctx, { timeoutMs: plugin.timeout_ms || 8000 });
    } catch (err) {
      result = { ok: false, error: String(err?.message || err) };
    }

    if (result.logs?.length) console.log(`[Plugin] Logs (#${plugin.id}):`, result.logs.join('\n'));

    if (!result.ok) {
      console.error(`[Plugin] Error (#${plugin.id}):`, result.error);
      if (reactKey) await this._react(sessionId, reactKey, '❌');
      this._reportPluginRun(plugin.id, result.error).catch(() => {});
      await new Promise(r => setTimeout(r, 500));
      await this.send(sessionId, chatId, `⚠️ Plugin "${plugin.name}" gagal: ${result.error}`, null, null, quoted).catch(() => {});
      return;
    }

    const out = result.output || {};
    if (!out.text && !out.mediaUrl) {
      console.log(`[Plugin] (#${plugin.id}) selesai tanpa output, tidak mengirim balasan.`);
      if (reactKey) await this._react(sessionId, reactKey, '✅');
      this._reportPluginRun(plugin.id, null).catch(() => {});
      return;
    }

    await new Promise(r => setTimeout(r, 500));
    await this.send(sessionId, chatId, out.text || '', out.mediaUrl || null, out.mediaType || null, quoted);
    console.log(`[Plugin] (#${plugin.id}) reply sent.`);
    if (reactKey) await this._react(sessionId, reactKey, '✅');
    this._reportPluginRun(plugin.id, null).catch(() => {});
  }

  async _reportPluginRun(pluginId, error) {
    try {
      await fetch(`${BACKEND_URL}/api/internal/plugins/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Internal-Secret': INTERNAL_SECRET },
        body: JSON.stringify({ plugin_id: pluginId, error: error || null }),
        signal: AbortSignal.timeout(5000),
      });
    } catch { /* non-fatal */ }
  }

  async send(sessionId, to, message, mediaUrl = null, mediaType = null, quoted = null, backgroundColor = null, font = null, statusJidList = null, mentions = null) {
    console.log(`[sessions] send: sessionId=${sessionId} to=${to} messageLength=${message?.length ?? 0} mediaUrl=${mediaUrl} mediaType=${mediaType} backgroundColor=${backgroundColor} font=${font} statusJidListLength=${statusJidList?.length ?? 0} mentionsLength=${mentions?.length ?? 0}`);
    const sock = this._sessions.get(sessionId);
    if (!sock) throw new Error('Session not found');
    if (!message && !mediaUrl) throw new Error('Message or media required');

    const jid = to.includes('@') ? to : `${to}@s.whatsapp.net`;
    let options = {};
    let senderJid = null;
    if (quoted) {
      console.log(`[sessions] send quoted message: targetJid=${jid}, quotedRemoteJid=${quoted.key?.remoteJid}, quotedId=${quoted.key?.id}`);
      options.quoted = quoted;
      senderJid = quoted.key?.participant || quoted.participant || quoted.key?.remoteJid;
    }

    let isTextStatusColor = false;
    let textStatusColor = '#075E54';
    let finalStatusJidList = [];
    if (Array.isArray(statusJidList)) {
      statusJidList.forEach(id => {
        if (id && typeof id === 'string') {
          const parts = id.split('@');
          if (parts.length === 2) {
            const clean = `${parts[0].split(':')[0]}@${parts[1]}`;
            finalStatusJidList.push(clean);
          } else {
            finalStatusJidList.push(id);
          }
        }
      });
    }
    let result;

    if (jid === 'status@broadcast') {
      if (backgroundColor) {
        isTextStatusColor = true;
        textStatusColor = backgroundColor;
      } else if (mediaUrl && mediaUrl.startsWith('#')) {
        isTextStatusColor = true;
        textStatusColor = mediaUrl;
        mediaUrl = null;
      }

      if (finalStatusJidList.length === 0) {
        const contacts = this.getContacts(sessionId) || [];
        const chats = this._chats.get(sessionId) || [];
        const jidSet = new Set();

        contacts.forEach(c => {
          let id = this.translateJid(sessionId, c.id || c.jid);
          if (id) {
            const parts = id.split('@');
            if (parts.length === 2) {
              id = `${parts[0].split(':')[0]}@${parts[1]}`;
            }
            if (id.endsWith('@s.whatsapp.net') || id.endsWith('@lid')) {
              jidSet.add(id);
            }
          }
        });

        chats.forEach(ch => {
          let id = this.translateJid(sessionId, ch.id);
          if (id) {
            const parts = id.split('@');
            if (parts.length === 2) {
              id = `${parts[0].split(':')[0]}@${parts[1]}`;
            }
            if (id.endsWith('@s.whatsapp.net') || id.endsWith('@lid')) {
              jidSet.add(id);
            }
          }
        });

        finalStatusJidList = Array.from(jidSet);
      }

      // Filter finalStatusJidList to only contain valid, clean phone number JIDs ending with @s.whatsapp.net
      // Exclude group JIDs, newsletter JIDs, LID JIDs, broadcast JIDs, and JIDs starting with '0'.
      finalStatusJidList = finalStatusJidList
        .map(id => {
          if (!id || typeof id !== 'string') return null;
          let cleanId = id.trim();
          // Translate LID to Phone JID if mapping exists
          cleanId = this.translateJid(sessionId, cleanId);
          // Strip device/port suffix if any (e.g., 628123:19@s.whatsapp.net -> 628123@s.whatsapp.net)
          const parts = cleanId.split('@');
          if (parts.length === 2) {
            cleanId = `${parts[0].split(':')[0]}@${parts[1]}`;
          }
          return cleanId;
        })
        .filter(id => {
          if (!id) return false;
          // Must end with @s.whatsapp.net and prefix must start with a non-zero digit and contain 6-20 total digits
          return /^[1-9]\d{5,19}@s\.whatsapp\.net$/.test(id);
        });

      // Remove duplicates
      finalStatusJidList = Array.from(new Set(finalStatusJidList));

      // Fallback to own JID when contacts not synced
      if (finalStatusJidList.length === 0) {
        const ownJid = sock?.user?.id;
        if (ownJid) {
          const translatedOwn = this.translateJid(sessionId, ownJid);
          const parts = translatedOwn.split(':');
          const rawNum = parts[0].split('@')[0];
          const normalizedOwn = `${rawNum}@s.whatsapp.net`;
          if (/^[1-9]\d{5,19}@s\.whatsapp\.net$/.test(normalizedOwn)) {
            finalStatusJidList = [normalizedOwn];
            console.log(`[sessions] No contacts synced — using own JID as fallback: ${normalizedOwn}`);
          }
        }
      }

      console.log(`[sessions] statusJidList prepared: count=${finalStatusJidList.length} list=${JSON.stringify(finalStatusJidList)}`);

      options = {
        ...options,
        broadcast: true,
        ...(finalStatusJidList.length > 0 ? { statusJidList: finalStatusJidList } : {}),
        ...(isTextStatusColor ? {
          backgroundColor: textStatusColor,
          font: font !== null && font !== undefined ? Number(font) : 0, // SANS_SERIF
        } : {}),
      };

      if (isTextStatusColor) {
        console.log(`[sessions] Sending text status → jidCount=${finalStatusJidList.length} color=${textStatusColor}`);
        result = await sock.sendMessage(jid, {
          text: message || '',
        }, options);
      }
    }

    if (!result) {
      let content = {};
      let actualMediaType = null;
      if (mediaUrl) {
        const isDataUri = mediaUrl.startsWith('data:');
        await saveRemoteDebugLog('last_media_info', {
          time: new Date().toISOString(),
          mediaUrl: isDataUri ? mediaUrl.slice(0, 64) + `...[data URI, ${mediaUrl.length} chars]` : mediaUrl,
          mediaType,
          jid
        });
        // Handle relative URLs by prepending the backend URL
        if (!isDataUri && mediaUrl.startsWith('/')) {
          mediaUrl = `${BACKEND_URL}${mediaUrl}`;
        }
        let resolvedUrl = mediaUrl;
        let localFileBuffer = null;
        let detectedMime = null;

        // data: URI (mis. hasil olahan gambar dari plugin) → decode langsung ke buffer.
        // Memakai jalur localFileBuffer sehingga sisa alur di bawah tetap sama.
        if (isDataUri) {
          const m = /^data:([^;,]*)(;base64)?,([\s\S]*)$/.exec(mediaUrl);
          if (m) {
            detectedMime = m[1] || 'application/octet-stream';
            localFileBuffer = m[2]
              ? Buffer.from(m[3], 'base64')
              : Buffer.from(decodeURIComponent(m[3]));
            console.log(`[sessions] Decoded data: URI media (${localFileBuffer.length} bytes, ${detectedMime})`);
          }
        }

        if (!isDataUri && mediaUrl.includes('/uploads/')) {
          const filename = mediaUrl.split('/').pop();
          // 1. Try local filesystem paths
          const possiblePaths = [
            path.join(__dirname, '../../backend/public/uploads', filename),
            path.join(__dirname, '../../backend/public/storage/uploads', filename),
            path.join(__dirname, '../../backend/storage/app/public/uploads', filename),
            path.join(__dirname, '../../backend/storage/app/private/uploads', filename),
            path.join(__dirname, '../../backend/storage/app/uploads', filename)
          ];
          
          for (const p of possiblePaths) {
            if (fs.existsSync(p)) {
              try {
                localFileBuffer = fs.readFileSync(p);
                console.log(`[sessions] Resolved local media to filesystem path: ${p} (${localFileBuffer.length} bytes)`);
                break;
              } catch (e) {
                console.error(`[sessions] Failed to read file at ${p}:`, e.message || e);
              }
            }
          }

          // 2. Try fetching from direct backend media proxy (for S3/R2 storage)
          if (!localFileBuffer) {
            const proxyUrl = `${BACKEND_URL}/api/internal/whatsapp/media?path=uploads/${filename}`;
            try {
              console.log(`[sessions] Trying backend media proxy: ${proxyUrl}`);
              const res = await fetch(proxyUrl, {
                headers: { 'X-Internal-Secret': INTERNAL_SECRET },
                signal: AbortSignal.timeout(15000)
              });
              if (res.ok) {
                const ab = await res.arrayBuffer();
                localFileBuffer = Buffer.from(ab);
                detectedMime = res.headers.get('content-type');
                console.log(`[sessions] Successfully fetched from backend media proxy: size=${localFileBuffer.length} bytes, mime=${detectedMime}`);
              }
            } catch (e) {
              console.log(`[sessions] Backend media proxy fetch failed:`, e.message || e);
            }
          }

          // 3. If still not found, try internal loopback URLs
          if (!localFileBuffer) {
            const internalUrls = [
              `${BACKEND_URL}/storage/uploads/${filename}`,
              `${BACKEND_URL}/uploads/${filename}`
            ];
            for (const intUrl of internalUrls) {
              try {
                console.log(`[sessions] Trying internal loopback URL: ${intUrl}`);
                const res = await fetch(intUrl, { signal: AbortSignal.timeout(5000) });
                if (res.ok) {
                  const ab = await res.arrayBuffer();
                  localFileBuffer = Buffer.from(ab);
                  detectedMime = res.headers.get('content-type');
                  console.log(`[sessions] Successfully fetched from internal URL: size=${localFileBuffer.length} bytes, mime=${detectedMime}`);
                  break;
                }
              } catch (e) {
                console.log(`[sessions] Internal loopback fetch failed for ${intUrl}:`, e.message || e);
              }
            }
          }
        }

        let mediaSource = null;
        if (localFileBuffer) {
          mediaSource = localFileBuffer;
        } else if (resolvedUrl.startsWith('http://') || resolvedUrl.startsWith('https://')) {
          // 3. Fallback to public remote URL fetch
          try {
            console.log(`[sessions] Fetching media buffer from public URL: ${resolvedUrl}`);
            const res = await fetch(resolvedUrl, { signal: AbortSignal.timeout(15000) });
            if (res.ok) {
              const ab = await res.arrayBuffer();
              mediaSource = Buffer.from(ab);
              detectedMime = res.headers.get('content-type');
              console.log(`[sessions] Successfully fetched public media buffer: size=${mediaSource.length} bytes, mime=${detectedMime}`);
            } else {
              console.warn(`[sessions] Fetching public media buffer failed with status ${res.status}, using URL object fallback`);
              mediaSource = { url: resolvedUrl };
            }
          } catch (e) {
            console.error(`[sessions] Error fetching public media buffer, using URL object fallback:`, e.message || e);
            mediaSource = { url: resolvedUrl };
          }
        } else {
          mediaSource = { url: resolvedUrl };
        }

        actualMediaType = mediaType;
        if (!actualMediaType && detectedMime) {
          if (detectedMime.startsWith('image/')) {
            actualMediaType = 'image';
          } else if (detectedMime.startsWith('video/')) {
            actualMediaType = 'video';
          } else if (detectedMime.startsWith('audio/')) {
            actualMediaType = 'audio';
          } else if (detectedMime.startsWith('application/pdf')) {
            actualMediaType = 'pdf';
          } else if (detectedMime.startsWith('application/')) {
            actualMediaType = 'document';
          }
        }

        if (!actualMediaType) {
          const lowerUrl = resolvedUrl.toLowerCase();
          if (/\.(jpg|jpeg|png|webp|gif|bmp|svg)$/.test(lowerUrl)) {
            actualMediaType = 'image';
          } else if (/\.(mp4|avi|mov|mkv|webm|3gp)$/.test(lowerUrl)) {
            actualMediaType = 'video';
          } else if (/\.(mp3|ogg|wav|m4a|aac)$/.test(lowerUrl)) {
            actualMediaType = 'audio';
          } else if (lowerUrl.endsWith('.pdf')) {
            actualMediaType = 'pdf';
          } else {
            actualMediaType = 'document';
          }
        }

        switch (actualMediaType) {
          case 'image':
            content = { image: mediaSource };
            if (detectedMime) content.mimetype = detectedMime;
            else if (typeof mediaSource === 'object' && mediaSource.url) {
              // let Baileys resolve MIME automatically for URL string
            } else {
              content.mimetype = resolvedUrl.endsWith('.png') ? 'image/png' : 'image/jpeg';
            }
            if (message) content.caption = message;
            break;
          case 'video':
            content = { video: mediaSource };
            content.mimetype = detectedMime || 'video/mp4';
            if (message) content.caption = message;
            break;
          case 'audio':
            content = { audio: mediaSource };
            content.mimetype = detectedMime || 'audio/mp4';
            content.ptt = false;
            break;
          case 'document':
          case 'pdf':
            content = {
              document: mediaSource,
              mimetype: detectedMime || (actualMediaType === 'pdf' ? 'application/pdf' : 'application/octet-stream'),
              fileName: mediaUrl.split('/').pop() || 'file',
            };
            if (message) content.caption = message;
            break;
          default:
            content = { image: mediaSource };
            if (detectedMime) content.mimetype = detectedMime;
            if (message) content.caption = message;
            break;
        }
      } else {
        content = { text: message || '' };
      }

      if (Array.isArray(mentions) && mentions.length > 0) {
        content.mentions = mentions.map(m => m.includes('@') ? m : `${m}@s.whatsapp.net`);
      } else if (senderJid) {
        content.mentions = [senderJid];
      }

      if (mediaUrl) {
        await saveRemoteDebugLog('last_content_constructed', {
          time: new Date().toISOString(),
          actualMediaType,
          contentKeys: Object.keys(content),
          mimetype: content.mimetype,
          caption: content.caption,
          hasBuffer: (content.video instanceof Buffer || content.image instanceof Buffer || content.audio instanceof Buffer || content.document instanceof Buffer),
          bufferLength: (content.video instanceof Buffer ? content.video.length : (content.image instanceof Buffer ? content.image.length : 0)),
          isUrlObject: (typeof mediaSource === 'object' && mediaSource !== null && 'url' in mediaSource),
          mediaSourceUrl: (typeof mediaSource === 'object' && mediaSource !== null ? mediaSource.url : null)
        });
      }

      try {
        result = await sock.sendMessage(jid, content, options);
        if (mediaUrl) {
          await saveRemoteDebugLog('last_send_status', {
            time: new Date().toISOString(),
            status: 'success',
            messageId: result.key.id
          });
        }
      } catch (err) {
        console.error(`[sessions] Failed to send message to ${jid} with media. Error:`, err);
        if (mediaUrl) {
          await saveRemoteDebugLog('last_send_error', {
            time: new Date().toISOString(),
            error: err.message,
            stack: err.stack
          });
        }
        if (err.message && err.message.includes('unsupported image format')) {
          console.warn(`[sessions] Sharp thumbnail generation failed. Retrying with jpegThumbnail set to null in options...`);
          try {
            result = await sock.sendMessage(jid, content, { ...options, jpegThumbnail: null });
            if (mediaUrl) {
              await saveRemoteDebugLog('last_send_status_retry', {
                time: new Date().toISOString(),
                status: 'success_retry',
                messageId: result.key.id
              });
            }
          } catch (retryErr) {
            if (mediaUrl) {
              await saveRemoteDebugLog('last_send_error_retry', {
                time: new Date().toISOString(),
                error: retryErr.message,
                stack: retryErr.stack
              });
            }
            throw new Error(`Media transmission failed (Sharp retry also failed): ${retryErr.message}`);
          }
        } else {
          throw err;
        }
      }
    }

    if (result) {
      const text = message || (mediaUrl ? '[Media]' : '');
      const ts = new Date();
      const bubble = {
        id: result.key.id,
        sender: 'me',
        text,
        time: ts.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        status: 'delivered',
      };

      const key = `${sessionId}:${jid}`;
      const history = this._messages.get(key) || [];
      if (!history.find(e => e.id === bubble.id)) {
        history.push(bubble);
        if (history.length > 500) history.splice(0, history.length - 500);
        this._messages.set(key, history);
        // Immediately flush this message to DB (don't wait 10s throttle)
        if (this._saveTimers.has(sessionId)) {
          clearTimeout(this._saveTimers.get(sessionId));
          this._saveTimers.delete(sessionId);
        }
        this._scheduleSave(sessionId);
      }

      const current = this._chats.get(sessionId) || [];
      const idx = current.findIndex(e => e.id === jid);
      const entry = {
        id: jid,
        name: current[idx]?.name || jid.split('@')[0],
        unreadCount: 0,
        lastMessage: text,
        conversationTimestamp: Math.floor(Date.now() / 1000),
        time: ts.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      };
      if (idx === -1) current.push(entry); else current[idx] = { ...current[idx], ...entry };
      this._chats.set(sessionId, current);
      this._scheduleSave(sessionId);

      this.emit(`message:${sessionId}:${jid}`, { type: 'message', message: bubble, chatId: jid });
      this.emit(`chats:${sessionId}`, { type: 'chats_updated' });
    }

    return result;
  }

  async delete(sessionId) {
    const sock = this._sessions.get(sessionId);
    if (sock) { try { await sock.logout(); } catch { } sock.end(); }
    this._sessions.delete(sessionId);
    this._qrs.delete(sessionId);
    this._status.delete(sessionId);
    this._flushes.delete(sessionId);
    const t = this._saveTimers.get(sessionId);
    if (t) { clearTimeout(t); this._saveTimers.delete(sessionId); }

    const deleteUrl = `${BACKEND_URL}/api/internal/whatsapp/auth?session_id=${sessionId}`;
    fetch(deleteUrl, {
      method: 'DELETE',
      headers: { 'X-Internal-Secret': INTERNAL_SECRET },
      signal: AbortSignal.timeout(15000)
    }).catch(err => console.error('Failed to delete auth state from database:', err));
  }

  async restoreSessions(attempt = 1) {
    try {
      const url = `${BACKEND_URL}/api/internal/whatsapp/sessions`;
      const res = await fetch(url, {
        headers: { 'X-Internal-Secret': INTERNAL_SECRET },
        signal: AbortSignal.timeout(15000)
      });
      if (res.ok) {
        const sessionIds = await res.json();
        for (const sessionId of sessionIds) {
          console.log(`Restoring session from MySQL: ${sessionId}`);
          this.create(sessionId).catch(err => {
            console.error(`Failed to restore session ${sessionId}:`, err.message);
          });
        }
      } else {
        throw new Error(`Server returned status ${res.status}`);
      }
    } catch (err) {
      console.error(`Failed to restore sessions from database (attempt ${attempt}):`, err.message || err);
      if (attempt < 5) {
        console.log(`Retrying session restoration in 5 seconds (attempt ${attempt + 1})...`);
        setTimeout(() => this.restoreSessions(attempt + 1), 5000);
      }
    }
  }

  async flushAll() {
    console.log('[SessionManager] Flushing all sessions & auth states...');
    
    // Clear save timers to prevent running after flush
    for (const timer of this._saveTimers.values()) {
      clearTimeout(timer);
    }
    this._saveTimers.clear();

    const promises = [];
    
    // Sync all session data (chats, contacts, messages) to database
    for (const sessionId of this._sessions.keys()) {
      promises.push(this.syncToDb(sessionId));
    }
    
    // Flush Baileys credentials
    for (const [sessionId, flush] of this._flushes.entries()) {
      if (typeof flush === 'function') {
        promises.push(flush());
      }
    }

    // Gracefully end all active WASocket connections
    for (const [sessionId, sock] of this._sessions.entries()) {
      console.log(`[SessionManager] Closing socket for session: ${sessionId}`);
      try {
        sock.end();
      } catch (err) {
        console.error(`Failed to close socket for ${sessionId}:`, err);
      }
    }

    await Promise.allSettled(promises);
    console.log('[SessionManager] All sessions & auth states flushed and sockets closed.');
  }
}

export const sessionManager = new SessionManager();
sessionManager.restoreSessions();
