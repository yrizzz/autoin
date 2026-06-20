'use strict';

require('dotenv').config();

const express = require('express');
const { sessionManager } = require('./sessions');

const app = express();
app.use(express.json());

const PORT       = process.env.PORT       || 3002;
const API_SECRET = process.env.API_SECRET || 'autoin-tg-secret';

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type,x-api-secret');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

function auth(req, res, next) {
  const secret = req.headers['x-api-secret'] || req.query.secret;
  if (secret !== API_SECRET) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

// ── Step 1: mulai login, kirim OTP ke HP ─────────────────────────────────
app.post('/sessions/:sessionId', auth, async (req, res) => {
  const { sessionId } = req.params;
  const { phoneNumber } = req.body || {};
  if (!phoneNumber) return res.status(400).json({ error: 'phoneNumber required' });

  try {
    const result = await sessionManager.startLogin(sessionId, phoneNumber);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Step 2: verifikasi kode OTP ───────────────────────────────────────────
app.post('/sessions/:sessionId/verify', auth, (req, res) => {
  const { sessionId } = req.params;
  const { code } = req.body || {};
  if (!code) return res.status(400).json({ error: 'code required' });

  try {
    sessionManager.submitCode(sessionId, code);
    res.json({ status: sessionManager.getStatus(sessionId) });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ── Step 3 (opsional): verifikasi password 2FA ────────────────────────────
app.post('/sessions/:sessionId/verify-2fa', auth, (req, res) => {
  const { sessionId } = req.params;
  const { password } = req.body || {};
  if (!password) return res.status(400).json({ error: 'password required' });

  try {
    sessionManager.submitPassword(sessionId, password);
    res.json({ status: sessionManager.getStatus(sessionId) });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ── Status sesi ───────────────────────────────────────────────────────────
app.get('/sessions/:sessionId/status', auth, (req, res) => {
  res.json({ status: sessionManager.getStatus(req.params.sessionId) });
});

// ── Contacts ──────────────────────────────────────────────────────────────
app.get('/sessions/:sessionId/contacts', auth, (req, res) => {
  try {
    res.json({ contacts: sessionManager.getContacts(req.params.sessionId) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Chats / dialogs ───────────────────────────────────────────────────────
app.get('/sessions/:sessionId/chats', auth, (req, res) => {
  try {
    res.json({ chats: sessionManager.getChats(req.params.sessionId) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Groups & channels ─────────────────────────────────────────────────────
app.get('/sessions/:sessionId/groups', auth, async (req, res) => {
  try {
    const groups = await sessionManager.getGroups(req.params.sessionId);
    res.json({ groups });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Riwayat pesan sebuah chat ─────────────────────────────────────────────
app.get('/sessions/:sessionId/messages/:chatId', auth, async (req, res) => {
  const { sessionId, chatId } = req.params;
  try {
    const messages = await sessionManager.getMessages(sessionId, decodeURIComponent(chatId));
    res.json({ messages });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Kirim pesan ───────────────────────────────────────────────────────────
app.post('/sessions/:sessionId/send', auth, async (req, res) => {
  const { sessionId } = req.params;
  const { to, message, mediaUrl } = req.body || {};

  if (!sessionManager.isConnected(sessionId)) {
    return res.status(400).json({ error: 'Session not connected' });
  }

  try {
    const result = await sessionManager.send(sessionId, to, message, mediaUrl);
    res.json({ ok: true, result });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ── Hapus / logout sesi ───────────────────────────────────────────────────
app.delete('/sessions/:sessionId', auth, async (req, res) => {
  await sessionManager.delete(req.params.sessionId);
  res.json({ status: 'deleted' });
});

app.get('/health', (_, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => {
  console.log(`Telegram service running on :${PORT}`);
  if (process.env.TELEGRAM_API_ID && process.env.TELEGRAM_API_HASH) {
    sessionManager.restoreSessions().catch(console.error);
  } else {
    console.warn('[!] TELEGRAM_API_ID / TELEGRAM_API_HASH belum diset — sesi tidak dapat di-restore');
  }
});
