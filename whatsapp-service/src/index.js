import 'dotenv/config'; // Trigger reload
import express from 'express';
import { sessionManager } from './sessions.js';
import { runPlugin } from './pluginRunner.js';

const app = express();
app.use(express.json());
app.use('/media', (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  next();
}, express.static('./media-temp'));

const PORT = process.env.PORT || 3001;
const API_SECRET = process.env.API_SECRET || 'autoin-wa-secret';

// Enable CORS for frontend browser access (direct EventSource connections)
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type,x-api-secret');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

function auth(req, res, next) {
  const secret = req.headers['x-api-secret'] || req.query.secret;
  if (secret !== API_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

// Create / connect a WhatsApp session
app.post('/sessions/:sessionId', auth, async (req, res) => {
  const { sessionId } = req.params;
  const { usePairingCode, phoneNumber } = req.body || {};

  // If the session is already fully connected, return that status
  if (sessionManager.isConnected(sessionId)) {
    return res.json({ status: 'connected' });
  }

  // If session exists but is not connected (e.g. connecting, qr_pending, pairing_pending, disconnected),
  // clean it up first before creating a fresh one to avoid stuck/conflicting states.
  if (sessionManager.has(sessionId)) {
    console.log(`[index] Session ${sessionId} exists but not connected. Deleting old session before reconnecting...`);
    await sessionManager.delete(sessionId);
  }

  try {
    sessionManager.create(sessionId, usePairingCode, phoneNumber).catch(err => {
      console.error(`[Session Error] Failed to create session ${sessionId}:`, err);
    });

    res.json({ status: 'connecting' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get QR for existing session waiting for scan
app.get('/sessions/:sessionId/qr', auth, async (req, res) => {
  const { sessionId } = req.params;
  const qr = sessionManager.getQr(sessionId);

  if (!qr) return res.status(404).json({ error: 'No QR available' });
  res.json({ qr });
});

// Session status
app.get('/sessions/:sessionId/status', auth, (req, res) => {
  const sessionId = req.params.sessionId;
  const status = sessionManager.getStatus(sessionId);
  const code = sessionManager.getPairingCode(sessionId);
  const qr = sessionManager.getQr(sessionId);
  res.json({ status, code, qr });
});

// Get contacts
app.get('/sessions/:sessionId/contacts', auth, (req, res) => {
  const { sessionId } = req.params;
  try {
    const contacts = sessionManager.getContacts(sessionId);
    res.json({ contacts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update contacts
app.post('/sessions/:sessionId/contacts', auth, (req, res) => {
  const { sessionId } = req.params;
  const { contacts } = req.body || {};
  if (!Array.isArray(contacts)) {
    return res.status(400).json({ error: 'Contacts array required' });
  }
  try {
    sessionManager.updateContacts(sessionId, contacts);
    res.json({ status: 'success' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get chats
app.get('/sessions/:sessionId/chats', auth, (req, res) => {
  const { sessionId } = req.params;
  try {
    const chats = sessionManager.getChats(sessionId);
    res.json({ chats });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get groups
app.get('/sessions/:sessionId/groups', auth, async (req, res) => {
  const { sessionId } = req.params;
  try {
    const groups = await sessionManager.getGroups(sessionId);
    res.json({ groups });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get group metadata (including participants)
app.get('/sessions/:sessionId/groups/:groupId', auth, async (req, res) => {
  const { sessionId, groupId } = req.params;
  try {
    const metadata = await sessionManager.getGroupMetadata(sessionId, decodeURIComponent(groupId));
    res.json({ metadata });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get message history for a specific chat
app.get('/sessions/:sessionId/messages/:chatId', auth, (req, res) => {
  const { sessionId, chatId } = req.params;
  try {
    const messages = sessionManager.getMessages(sessionId, decodeURIComponent(chatId));
    res.json({ messages });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Manual sync: re-fetch groups and populate chat list
app.post('/sessions/:sessionId/sync', auth, async (req, res) => {
  const { sessionId } = req.params;
  try {
    const sock = sessionManager._sessions.get(sessionId);
    if (!sock) return res.status(404).json({ error: 'Session not found' });
    await sessionManager._syncGroups(sessionId, sock);
    const chats = sessionManager.getChats(sessionId);
    res.json({ ok: true, chats });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Flush/Soft reset session (reorganizes chat/data cache and triggers a soft reconnect)
app.post('/sessions/:sessionId/flush', auth, async (req, res) => {
  const { sessionId } = req.params;
  try {
    if (!sessionManager.has(sessionId)) {
      return res.status(404).json({ error: 'Session not found' });
    }
    await sessionManager.flushSession(sessionId);
    res.json({ ok: true, status: 'flushing' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete/logout session
app.delete('/sessions/:sessionId', auth, (req, res) => {
  sessionManager.delete(req.params.sessionId).catch(err => {
    console.error('[index] Failed to delete session:', err);
  });
  res.json({ status: 'deleted' });
});

// Send a message
app.post('/sessions/:sessionId/send', auth, async (req, res) => {
  const { sessionId } = req.params;
  const {
    to, message, mediaUrl, mediaType, backgroundColor, font,
    statusJidList, mentions, statusExcludeJidList,
    typingSimulation = false,
  } = req.body;
  console.log(`[index] POST /sessions/${sessionId}/send to:${to} message:${message?.slice(0,50)} mediaUrl:${mediaUrl} mediaType:${mediaType} typingSimulation:${typingSimulation} statusJidListLength:${statusJidList?.length ?? 0} mentionsLength=${mentions?.length ?? 0}`);

  if (!sessionManager.isConnected(sessionId)) {
    console.warn(`[index] Session ${sessionId} not connected`);
    return res.status(400).json({ error: 'Session not connected' });
  }

  try {
    // ── Typing simulation: simulasikan "sedang mengetik" sebelum kirim ──────
    // Ini sangat penting untuk anti-ban — membuat perilaku lebih natural.
    // Durasi typing proporsional dengan panjang pesan (1-4 detik).
    if (typingSimulation && to && !to.includes('status@broadcast')) {
      const sock = sessionManager._sessions?.get?.(sessionId);
      if (sock) {
        const jid = to.includes('@') ? to : `${to}@s.whatsapp.net`;
        // Hitung durasi typing: minimal 1s, maksimal 4s, proporsional panjang pesan
        const msgLen = (message || '').length;
        const typingMs = Math.min(4000, Math.max(1000, msgLen * 30 + Math.random() * 1000));
        try {
          await sock.presenceSubscribe(jid);
          await sock.sendPresenceUpdate('composing', jid);
          await new Promise(r => setTimeout(r, Math.round(typingMs)));
          await sock.sendPresenceUpdate('paused', jid);
        } catch (e) {
          // Jangan blokir send jika typing simulation gagal
          console.warn(`[index] Typing simulation failed (non-fatal):`, e?.message || e);
        }
      }
    }

    const result = await sessionManager.send(
      sessionId, to, message, mediaUrl, mediaType,
      null, backgroundColor, font, statusJidList, mentions, statusExcludeJidList
    );
    console.log(`[index] Send success for ${sessionId}`);
    res.json({ ok: true, result });
  } catch (err) {
    console.error(`[index] Send error for ${sessionId}:`, err);
    res.status(500).json({ ok: false, error: err.message });
  }
});


// ── Plugin sandbox: jalankan kode plugin sekali (dipakai fitur "Tes" dashboard) ──
app.post('/plugins/run', auth, async (req, res) => {
  const { code, ctx } = req.body || {};
  const timeoutMs = req.body?.timeout_ms ?? req.body?.timeoutMs;
  if (!code || typeof code !== 'string') {
    return res.status(400).json({ ok: false, error: 'Kode plugin wajib diisi' });
  }
  try {
    const result = await runPlugin(code, ctx || {}, { timeoutMs });
    res.json(result);
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ── Server-Sent Events: stream new messages for a specific chat ──────────────
app.get('/sessions/:sessionId/events/messages/:chatId', auth, (req, res) => {
  const { sessionId, chatId } = req.params;
  const decodedChatId = decodeURIComponent(chatId);

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  // Send a heartbeat every 25s to keep the connection alive
  const heartbeat = setInterval(() => res.write(':heartbeat\n\n'), 25000);

  const eventName = `message:${sessionId}:${decodedChatId}`;
  const onMessage = (payload) => {
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  };

  sessionManager.on(eventName, onMessage);

  req.on('close', () => {
    clearInterval(heartbeat);
    sessionManager.off(eventName, onMessage);
  });
});

// ── Server-Sent Events: stream chat list updates ──────────────────────────────
app.get('/sessions/:sessionId/events/chats', auth, (req, res) => {
  const { sessionId } = req.params;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const heartbeat = setInterval(() => res.write(':heartbeat\n\n'), 25000);

  const eventName = `chats:${sessionId}`;
  const onUpdate = (payload) => {
    // Send current full chat list on every update
    const chats = sessionManager.getChats(sessionId);
    res.write(`data: ${JSON.stringify({ type: 'chats_updated', chats })}\n\n`);
  };

  sessionManager.on(eventName, onUpdate);

  req.on('close', () => {
    clearInterval(heartbeat);
    sessionManager.off(eventName, onUpdate);
  });
});

// Health check
app.get('/health', (_, res) => res.json({ status: 'ok' }));

const server = app.listen(PORT, () => {
  console.log(`WhatsApp service running on :${PORT}`);
});

// Graceful shutdown handling
let shuttingDown = false;
async function gracefulShutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`Received ${signal}. Gracefully shutting down...`);
  
  // Set a hard timeout to force exit if flushing takes too long
  setTimeout(() => {
    console.error('Graceful shutdown timed out. Force exiting...');
    process.exit(1);
  }, 3000);

  // Stop accepting new requests
  server.close(() => {
    console.log('HTTP server closed.');
  });

  try {
    // Flush all WhatsApp sessions and credentials to database
    await sessionManager.flushAll();
    console.log('Graceful shutdown completed successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Error during graceful shutdown:', err);
    process.exit(1);
  }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
