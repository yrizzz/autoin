'use strict';

const { TelegramClient, Api } = require('telegram');
const { StringSession } = require('telegram/sessions');
const { NewMessage } = require('telegram/events');
const { EventEmitter } = require('events');
const path = require('path');
const fs = require('fs');

const SESSIONS_DIR    = process.env.SESSIONS_DIR    || './sessions-data';
const BACKEND_URL     = process.env.BACKEND_URL     || 'http://localhost:8000';
const INTERNAL_SECRET = process.env.INTERNAL_SECRET || 'autoin-internal-secret';

function getApiCreds() {
  const apiId = parseInt(process.env.TELEGRAM_API_ID || '0', 10);
  const apiHash = process.env.TELEGRAM_API_HASH || '';
  if (!apiId || !apiHash) throw new Error('TELEGRAM_API_ID dan TELEGRAM_API_HASH harus diset di .env');
  return { apiId, apiHash };
}

function makeClient(stringSession) {
  const { apiId, apiHash } = getApiCreds();
  return new TelegramClient(stringSession, apiId, apiHash, {
    connectionRetries: 5,
    autoReconnect: true,
  });
}

class SessionManager extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(100);
    this._clients  = new Map(); // sessionId -> TelegramClient
    this._status   = new Map(); // sessionId -> string
    this._pending  = new Map(); // sessionId -> { resolveCode, resolvePassword }
    this._contacts = new Map(); // sessionId -> Contact[]
    this._chats    = new Map(); // sessionId -> Chat[]
    this._msgCache = new Map(); // "sessionId:chatId" -> Message[]
  }

  has(id)         { return this._clients.has(id); }
  isConnected(id) { return this._status.get(id) === 'connected'; }
  getStatus(id)   { return this._status.get(id) ?? 'not_found'; }
  getContacts(id) { return this._contacts.get(id) || []; }
  getChats(id)    { return this._chats.get(id) || []; }

  // ── Login Step 1: kirim OTP ke nomor HP ──────────────────────────────────
  async startLogin(sessionId, phoneNumber) {
    // Bersihkan sesi lama jika ada
    if (this._clients.has(sessionId)) {
      try { await this._clients.get(sessionId).disconnect(); } catch (_) {}
      this._clients.delete(sessionId);
    }

    const stringSession = new StringSession('');
    const client = makeClient(stringSession);
    await client.connect();
    client.setLogLevel('none');

    this._clients.set(sessionId, client);
    this._status.set(sessionId, 'connecting');

    const pending = { resolveCode: null, resolvePassword: null };
    this._pending.set(sessionId, pending);

    // Jalankan auth flow di background
    client.start({
      phoneNumber: () => Promise.resolve(phoneNumber),
      phoneCode: () => {
        this._status.set(sessionId, 'code_sent');
        return new Promise(resolve => { pending.resolveCode = resolve; });
      },
      password: () => {
        this._status.set(sessionId, '2fa_required');
        return new Promise(resolve => { pending.resolvePassword = resolve; });
      },
      onError: (err) => {
        console.error(`[TG ${sessionId}] Auth error:`, err.message);
        this._status.set(sessionId, 'error');
      },
    }).then(async () => {
      this._status.set(sessionId, 'connected');
      const sessionStr = stringSession.save();
      this._saveFile(sessionId, { session: sessionStr, phoneNumber });
      await this._loadData(sessionId, client);
      this._registerMessageHandler(sessionId, client);
      console.log(`[TG] Session ${sessionId} connected`);
    }).catch(err => {
      console.error(`[TG ${sessionId}] Auth failed:`, err.message);
      this._status.set(sessionId, 'error');
    });

    // Tunggu sampai code_sent (maks 20 detik)
    await this._waitUntil(sessionId, s => s !== 'connecting', 20000);
    return { status: this._status.get(sessionId) };
  }

  // ── Login Step 2: verifikasi kode OTP ────────────────────────────────────
  submitCode(sessionId, code) {
    const p = this._pending.get(sessionId);
    if (!p?.resolveCode) throw new Error('Tidak ada kode yang menunggu verifikasi');
    p.resolveCode(code);
    p.resolveCode = null;
    this._status.set(sessionId, 'signing_in');
  }

  // ── Login Step 3: verifikasi password 2FA (opsional) ─────────────────────
  submitPassword(sessionId, password) {
    const p = this._pending.get(sessionId);
    if (!p?.resolvePassword) throw new Error('Tidak ada password 2FA yang menunggu');
    p.resolvePassword(password);
    p.resolvePassword = null;
    this._status.set(sessionId, 'signing_in');
  }

  // ── Chatbot auto-reply ────────────────────────────────────────────────────
  _registerMessageHandler(sessionId, client) {
    client.addEventHandler(async (event) => {
      try {
        const msg = event.message;
        if (!msg || msg.out) return;   // skip our own messages
        const text = msg.message || '';
        if (!text.trim()) return;
        const chatId = msg.peerId?.channelId?.toString()
                    || msg.peerId?.userId?.toString()
                    || msg.chatId?.toString()
                    || '';
        if (!chatId) return;
        await this._autoreply(sessionId, chatId, text, client);
      } catch (_) {}
    }, new NewMessage({ incoming: true }));
  }

  async _autoreply(sessionId, chatId, text, client) {
    try {
      const res = await fetch(`${BACKEND_URL}/api/internal/chatbot/match`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Secret': INTERNAL_SECRET,
        },
        body: JSON.stringify({ session_id: sessionId, text, platform: 'telegram' }),
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.reply) {
        await new Promise(r => setTimeout(r, 800));
        await client.sendMessage(chatId, { message: data.reply });
      }
    } catch (_) {}
  }

  // ── Kirim pesan ──────────────────────────────────────────────────────────
  async send(sessionId, to, message, mediaUrl = null) {
    const client = this._clients.get(sessionId);
    if (!client) throw new Error('Sesi tidak ditemukan');

    if (mediaUrl) {
      return client.sendFile(to, {
        file: mediaUrl,
        caption: message || '',
        forceDocument: false,
      });
    }

    return client.sendMessage(to, { message });
  }

  // ── Ambil riwayat pesan ──────────────────────────────────────────────────
  async getMessages(sessionId, chatId) {
    const client = this._clients.get(sessionId);
    if (!client) return [];
    try {
      const msgs = await client.getMessages(chatId, { limit: 50 });
      return [...msgs].reverse().map(m => ({
        id: m.id.toString(),
        sender: m.out ? 'me' : 'them',
        text: m.message || '[Media]',
        time: m.date
          ? new Date(m.date * 1000).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
          : '',
        status: 'delivered',
      }));
    } catch (_) {
      return [];
    }
  }

  // ── Ambil daftar grup/channel ─────────────────────────────────────────────
  async getGroups(sessionId) {
    const client = this._clients.get(sessionId);
    if (!client) return [];
    try {
      const dialogs = await client.getDialogs({ limit: 100 });
      return dialogs
        .filter(d => d.isGroup || d.isChannel)
        .map(d => ({
          id: d.id?.toString() ?? '',
          name: d.title || d.name || '',
          participantsCount: d.entity?.participantsCount || 0,
          type: d.isChannel ? 'channel' : 'group',
        }));
    } catch (_) {
      return [];
    }
  }

  // ── Hapus / logout sesi ───────────────────────────────────────────────────
  async delete(sessionId) {
    const client = this._clients.get(sessionId);
    if (client) {
      try {
        await client.invoke(new Api.auth.LogOut());
        await client.disconnect();
      } catch (_) {}
    }
    this._clients.delete(sessionId);
    this._status.delete(sessionId);
    this._pending.delete(sessionId);
    this._contacts.delete(sessionId);
    this._chats.delete(sessionId);

    const fp = this._filePath(sessionId);
    if (fs.existsSync(fp)) fs.unlinkSync(fp);
  }

  // ── Restore sesi dari disk saat startup ───────────────────────────────────
  async restoreSessions() {
    if (!fs.existsSync(SESSIONS_DIR)) return;
    const files = fs.readdirSync(SESSIONS_DIR).filter(f => f.endsWith('.json'));
    for (const file of files) {
      const sessionId = file.replace('.json', '');
      try {
        const data = JSON.parse(fs.readFileSync(path.join(SESSIONS_DIR, file), 'utf8'));
        await this._restoreSession(sessionId, data);
      } catch (err) {
        console.error(`[TG] Gagal restore sesi ${sessionId}:`, err.message);
      }
    }
  }

  // ── Internal ─────────────────────────────────────────────────────────────
  async _restoreSession(sessionId, data) {
    const stringSession = new StringSession(data.session);
    const client = makeClient(stringSession);
    await client.connect();
    client.setLogLevel('none');

    if (!(await client.isUserAuthorized())) {
      console.log(`[TG] Sesi ${sessionId} sudah tidak valid`);
      return;
    }

    this._clients.set(sessionId, client);
    this._status.set(sessionId, 'connected');
    await this._loadData(sessionId, client);
    this._registerMessageHandler(sessionId, client);
    console.log(`[TG] Restored: ${sessionId}`);
  }

  async _loadData(sessionId, client) {
    try {
      // Contacts
      const result = await client.invoke(new Api.contacts.GetContacts({ hash: BigInt(0) }));
      this._contacts.set(sessionId, (result.users || []).map(u => ({
        id: u.id?.toString() ?? '',
        name: [u.firstName, u.lastName].filter(Boolean).join(' ') || u.username || u.id?.toString() || '',
        username: u.username ? `@${u.username}` : null,
        phone: u.phone ? `+${u.phone}` : null,
      })));

      // Dialogs/Chats
      const dialogs = await client.getDialogs({ limit: 100 });
      this._chats.set(sessionId, dialogs.map(d => ({
        id: d.id?.toString() ?? '',
        name: d.title || d.name || d.id?.toString() || '',
        lastMessage: d.message?.message || '',
        unread: d.unreadCount || 0,
        ts: d.date || 0,
        type: d.isChannel ? 'channel' : d.isGroup ? 'group' : 'private',
      })).sort((a, b) => b.ts - a.ts));
    } catch (err) {
      console.error(`[TG ${sessionId}] Gagal load data:`, err.message);
    }
  }

  _saveFile(sessionId, data) {
    if (!fs.existsSync(SESSIONS_DIR)) fs.mkdirSync(SESSIONS_DIR, { recursive: true });
    fs.writeFileSync(this._filePath(sessionId), JSON.stringify(data, null, 2));
  }

  _filePath(sessionId) {
    return path.join(SESSIONS_DIR, `${sessionId}.json`);
  }

  async _waitUntil(sessionId, condition, timeoutMs) {
    let waited = 0;
    while (waited < timeoutMs) {
      if (condition(this._status.get(sessionId))) break;
      await new Promise(r => setTimeout(r, 250));
      waited += 250;
    }
  }
}

module.exports = { sessionManager: new SessionManager() };
