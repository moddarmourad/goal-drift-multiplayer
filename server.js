'use strict';

const crypto = require('node:crypto');
const http = require('node:http');
const path = require('node:path');
const express = require('express');
const { WebSocketServer, WebSocket } = require('ws');
const skinCatalog = require('./skins');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/multiplayer', maxPayload: 16 * 1024 });
const skinById = new Map(skinCatalog.map((skin) => [skin.id, skin]));
const allowedOrigins = new Set([
  'https://moddar-game.vercel.app',
  'https://goal-drift-multiplayer.onrender.com',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
]);
app.use(express.json({ limit: '128kb' }));
app.use('/api', (req, res, next) => {
  const origin = req.get('origin');
  if (origin && !allowedOrigins.has(origin)) return res.status(403).json({ error: 'This game origin is not allowed.' });
  if (origin) {
    res.set('Access-Control-Allow-Origin', origin);
    res.set('Vary', 'Origin');
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
  }
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});
const rooms = new Map();
const quickQueue = [];
const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const seats = [[0, 0], [1, 0], [0, 1], [1, 1]];
const stadiumIds = new Set(['neon', 'desert', 'ice', 'forest', 'lunar', 'tokyo', 'paris', 'dubai']);

app.get('/health', (_req, res) => res.json({ ok: true, rooms: rooms.size, queued: quickQueue.length }));
app.get('/api/skins', (_req, res) => res.json(skinCatalog.map(({ id, name, paint, accent, price, pattern, flag, countryCode }) => ({ id, name, paint, accent, price, pattern, ...(flag ? { flag, countryCode } : {}) }))));
app.post('/api/skins/checkout', async (req, res) => {
  const skin = skinById.get(String(req.body && req.body.skinId || ''));
  const accessToken = process.env.ZIINA_ACCESS_TOKEN;
  if (!accessToken || !process.env.SKIN_TOKEN_SECRET) {
    return res.status(503).json({ error: 'The shop is not configured yet. Add the Ziina and skin-signing secrets to the game server.' });
  }
  if (!skin) return res.status(400).json({ error: 'That skin is not available.' });

  const origin = allowedOrigins.has(req.get('origin')) ? req.get('origin') : 'https://moddar-game.vercel.app';
  const orderRef = crypto.randomUUID();
  const message = `GD-${skin.id}-${orderRef.replace(/-/g, '').slice(0, 8)}`;
  const successUrl = `${origin}/?payment=success&skin_id=${encodeURIComponent(skin.id)}&order_ref=${encodeURIComponent(orderRef)}&payment_intent_id={PAYMENT_INTENT_ID}`;
  try {
    const response = await fetch('https://api-v2.ziina.com/api/payment_intent', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: skin.price * 100,
        currency_code: 'AED',
        message,
        success_url: successUrl,
        cancel_url: `${origin}/?payment=cancelled`,
        failure_url: `${origin}/?payment=failed`,
        ...(process.env.ZIINA_TEST_MODE === 'true' ? { test: true } : {}),
      }),
      signal: AbortSignal.timeout(15000),
    });
    const intent = await response.json().catch(() => ({}));
    if (!response.ok || !intent.redirect_url) {
      console.error('Ziina checkout creation failed:', response.status, intent.message || intent.error || 'No checkout URL returned');
      return res.status(502).json({ error: 'Ziina could not start checkout. Check the merchant token and try again.' });
    }
    res.json({ redirectUrl: intent.redirect_url });
  } catch (error) {
    console.error('Ziina checkout request failed:', error.name || 'request error');
    res.status(502).json({ error: 'Could not reach Ziina. Please try again.' });
  }
});
app.post('/api/skins/claim', async (req, res) => {
  const skin = skinById.get(String(req.body && req.body.skinId || ''));
  const paymentIntentId = String(req.body && req.body.paymentIntentId || '');
  const orderRef = String(req.body && req.body.orderRef || '');
  const accessToken = process.env.ZIINA_ACCESS_TOKEN;
  if (!accessToken || !process.env.SKIN_TOKEN_SECRET) return res.status(503).json({ error: 'The shop is not configured yet.' });
  if (!skin || !/^[0-9a-f-]{36}$/i.test(paymentIntentId) || !/^[0-9a-f-]{36}$/i.test(orderRef)) {
    return res.status(400).json({ error: 'Payment receipt is invalid.' });
  }
  try {
    const response = await fetch(`https://api-v2.ziina.com/api/payment_intent/${encodeURIComponent(paymentIntentId)}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(15000),
    });
    const intent = await response.json().catch(() => ({}));
    const expectedMessage = `GD-${skin.id}-${orderRef.replace(/-/g, '').slice(0, 8)}`;
    if (!response.ok || intent.id !== paymentIntentId || intent.status !== 'completed'
      || intent.amount !== skin.price * 100 || intent.currency_code !== 'AED' || intent.message !== expectedMessage) {
      return res.status(402).json({ error: 'Ziina has not confirmed this skin payment yet.' });
    }
    const payload = Buffer.from(JSON.stringify({ skinId: skin.id, paymentIntentId, amount: skin.price * 100, currency: 'AED' })).toString('base64url');
    const signature = crypto.createHmac('sha256', process.env.SKIN_TOKEN_SECRET).update(payload).digest('base64url');
    res.json({ ticket: `${payload}.${signature}`, skinId: skin.id });
  } catch (error) {
    console.error('Ziina payment verification failed:', error.name || 'request error');
    res.status(502).json({ error: 'Could not verify the payment with Ziina yet. Please retry.' });
  }
});
app.post('/api/skins/verify', (req, res) => {
  const secret = process.env.SKIN_TOKEN_SECRET;
  if (!secret) return res.status(503).json({ error: 'The shop is not configured yet.' });
  const tickets = Array.isArray(req.body && req.body.tickets) ? req.body.tickets.slice(0, 250) : [];
  const owned = [];
  for (const ticket of tickets) {
    const value = verifySkinTicket(ticket, secret);
    if (value) owned.push(value.skinId);
  }
  res.json({ owned: [...new Set(owned)] });
});
app.get('/', (_req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/index.html', (_req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/manifest.webmanifest', (_req, res) => res.sendFile(path.join(__dirname, 'manifest.webmanifest')));
app.get('/icon.svg', (_req, res) => res.sendFile(path.join(__dirname, 'icon.svg')));
app.get('/skins.js', (_req, res) => res.sendFile(path.join(__dirname, 'skins.js')));
app.get('/service-worker.js', (_req, res) => res.sendFile(path.join(__dirname, 'service-worker.js')));
app.use('/icons', express.static(path.join(__dirname, 'icons')));
app.use('/screenshots', express.static(path.join(__dirname, 'screenshots')));
app.get('*', (_req, res) => res.sendFile(path.join(__dirname, 'index.html')));

function send(ws, data) {
  if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(data));
}
function code() {
  let value;
  do {
    value = Array.from({ length: 6 }, () => alphabet[crypto.randomInt(alphabet.length)]).join('');
  } while (rooms.has(value));
  return value;
}
function verifySkinTicket(ticket, secret = process.env.SKIN_TOKEN_SECRET) {
  if (typeof ticket !== 'string' || !secret) return null;
  const [payload, signature, extra] = ticket.split('.');
  if (!payload || !signature || extra) return null;
  const expected = crypto.createHmac('sha256', secret).update(payload).digest();
  let actual;
  try { actual = Buffer.from(signature, 'base64url'); } catch { return null; }
  if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) return null;
  try {
    const value = JSON.parse(Buffer.from(payload, 'base64url').toString());
    const skin = skinById.get(value.skinId);
    return skin && value.amount === skin.price * 100 && value.currency === 'AED' && typeof value.paymentIntentId === 'string'
      ? value : null;
  } catch { return null; }
}
function cleanProfile(profile, ownedSkins = new Set()) {
  const p = profile || {};
  const skin = skinById.get(String(p.skin || ''));
  if (skin && ownedSkins.has(skin.id)) {
    return { name: String(p.name || 'Driver').replace(/[<>]/g, '').trim().slice(0, 16) || 'Driver', paint: skin.paint, accent: skin.accent, skin: skin.id };
  }
  return {
    name: String(p.name || 'Driver').replace(/[<>]/g, '').trim().slice(0, 16) || 'Driver',
    paint: /^#[0-9a-f]{6}$/i.test(p.paint) ? p.paint : '#ffd23f',
    accent: /^#[0-9a-f]{6}$/i.test(p.accent) ? p.accent : '#9b6cff',
    skin: ['racing', 'twin', 'solid'].includes(p.skin) ? p.skin : 'solid',
  };
}
function updateSocketProfile(ws, profile) {
  const tickets = profile && profile.skinTickets && typeof profile.skinTickets === 'object' ? Object.values(profile.skinTickets) : [];
  ws.ownedSkins = new Set(tickets.map((ticket) => verifySkinTicket(ticket)).filter(Boolean).map((ticket) => ticket.skinId));
  ws.profile = cleanProfile(profile, ws.ownedSkins);
}
function cleanGameSettings(value) {
  const settings = value || {};
  return {
    stadium: stadiumIds.has(settings.stadium) ? settings.stadium : 'neon',
    minutes: [2, 3, 5].includes(Number(settings.minutes)) ? Number(settings.minutes) : 3,
  };
}
function roster(room) {
  return room.players.map((ws, index) => ({
    id: ws.id,
    name: ws.profile.name,
    paint: ws.profile.paint,
    accent: ws.profile.accent,
    skin: ws.profile.skin,
    team: seats[index][0],
    slot: seats[index][1],
  }));
}
function broadcastRoom(room, type) {
  const players = roster(room);
  room.players.forEach((ws) => send(ws, {
    type,
    room: room.code,
    role: ws === room.host ? 'host' : 'guest',
    playerId: ws.id,
    players,
    ...(type === 'start' ? { settings: room.gameSettings } : {}),
  }));
}
function removeFromQueue(ws) {
  const index = quickQueue.indexOf(ws);
  if (index >= 0) quickQueue.splice(index, 1);
}
function removeFromRoom(ws) {
  const room = rooms.get(ws.roomCode);
  if (!room) return;
  const wasHost = room.host === ws;
  room.players = room.players.filter((player) => player !== ws);
  ws.roomCode = '';
  if (room.players.length === 0 || wasHost) {
    room.players.forEach((peer) => {
      peer.roomCode = '';
      peer.role = '';
      send(peer, { type: 'peerLeft', message: wasHost ? 'The room host left.' : 'The room closed.' });
    });
    rooms.delete(room.code);
    return;
  }
  broadcastRoom(room, 'peerLeft');
}
function joinRoom(ws, room, type) {
  if (room.started) {
    send(ws, { type: 'error', message: 'This match has already started.' });
    return false;
  }
  if (room.players.length >= 4) {
    send(ws, { type: 'error', message: 'This room is full (maximum 4 players).' });
    return false;
  }
  removeFromQueue(ws);
  ws.roomCode = room.code;
  ws.profile = cleanProfile(ws.profile);
  room.players.push(ws);
  send(ws, { type: 'joined', room: room.code });
  broadcastRoom(room, type || 'roomState');
  return true;
}
function createRoom(host, isPublic) {
  const room = { code: code(), host, players: [host], isPublic: !!isPublic, started: false, gameSettings: cleanGameSettings(host.gameSettings) };
  rooms.set(room.code, room);
  host.roomCode = room.code;
  host.role = 'host';
  broadcastRoom(room, 'roomState');
  return room;
}
function startRoom(room, gameSettings) {
  if (!room || room.players.length < 2) return;
  if (gameSettings && room.host) room.host.gameSettings = cleanGameSettings(gameSettings);
  room.gameSettings = cleanGameSettings(room.host && room.host.gameSettings);
  room.started = true;
  broadcastRoom(room, 'start');
}
function peerInput(room, ws, input) {
  const seatIndex = room.players.indexOf(ws);
  if (seatIndex <= 0) return;
  const [team, slot] = seats[seatIndex];
  const value = input || {};
  send(room.host, {
    type: 'input', team, slot,
    input: {
      throttle: Math.max(-1, Math.min(1, Number(value.throttle) || 0)),
      steer: Math.max(-1, Math.min(1, Number(value.steer) || 0)),
      pitch: Math.max(-1, Math.min(1, Number(value.pitch) || 0)),
      yaw: Math.max(-1, Math.min(1, Number(value.yaw) || 0)),
      roll: Math.max(-1, Math.min(1, Number(value.roll) || 0)),
      jump: !!value.jump,
      turbo: !!value.turbo,
      drift: !!value.drift,
      pulse: !!value.pulse,
    },
  });
}
function safeSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== 'object') return null;
  return JSON.stringify(snapshot).length <= 12000 ? snapshot : null;
}
function beginQuickMatch(first, second) {
  const room = createRoom(first, true);
  joinRoom(second, room, 'roomState');
  room.players.forEach((ws) => send(ws, { type: 'matchFound' }));
  startRoom(room);
}

wss.on('connection', (ws) => {
  ws.id = crypto.randomUUID();
  ws.roomCode = '';
  ws.role = '';
  ws.profile = cleanProfile(null);
  ws.ownedSkins = new Set();
  ws.gameSettings = cleanGameSettings(null);
  ws.rateWindow = Date.now();
  ws.rateCount = 0;

  ws.on('message', (raw) => {
    const now = Date.now();
    if (now - ws.rateWindow >= 1000) { ws.rateWindow = now; ws.rateCount = 0; }
    if (++ws.rateCount > 100) { ws.close(1008, 'rate limit'); return; }

    let msg;
    try { msg = JSON.parse(raw.toString()); } catch { return; }
    if (!msg || typeof msg.type !== 'string') return;
    if (msg.profile) updateSocketProfile(ws, msg.profile);
    if (msg.settings) ws.gameSettings = cleanGameSettings(msg.settings);

    if (msg.type === 'create') {
      if (ws.roomCode) removeFromRoom(ws);
      removeFromQueue(ws);
      createRoom(ws, false);
      return;
    }

    if (msg.type === 'join') {
      if (ws.roomCode) removeFromRoom(ws);
      removeFromQueue(ws);
      const room = rooms.get(String(msg.code || '').toUpperCase());
      if (!room) {
        send(ws, { type: 'error', message: 'Room not found. Check the code and try again.' });
        return;
      }
      joinRoom(ws, room, 'playerJoined');
      return;
    }

    if (msg.type === 'quickPlay') {
      if (ws.roomCode) removeFromRoom(ws);
      removeFromQueue(ws);
      ws.profile = cleanProfile(msg.profile);
      const opponentIndex = quickQueue.findIndex((player) => player.readyState === WebSocket.OPEN && !player.roomCode);
      if (opponentIndex >= 0) {
        const opponent = quickQueue.splice(opponentIndex, 1)[0];
        beginQuickMatch(opponent, ws);
      } else {
        quickQueue.push(ws);
        send(ws, { type: 'queued' });
      }
      return;
    }

    if (msg.type === 'cancelQueue') {
      removeFromQueue(ws);
      send(ws, { type: 'queueCancelled' });
      return;
    }

    const room = rooms.get(ws.roomCode);
    if (!room || !room.players.includes(ws)) return;
    if (msg.type === 'profile') {
      ws.profile = cleanProfile(msg.profile);
      broadcastRoom(room, 'roomState');
    } else if (msg.type === 'input') {
      peerInput(room, ws, msg.input);
    } else if (msg.type === 'snapshot' && room.host === ws) {
      const snapshot = safeSnapshot(msg.snapshot);
      if (snapshot) room.players.forEach((peer) => { if (peer !== ws) send(peer, { type: 'snapshot', snapshot }); });
    } else if (msg.type === 'start' && room.host === ws) {
      startRoom(room, msg.settings);
    }
  });

  ws.on('close', () => {
    removeFromQueue(ws);
    removeFromRoom(ws);
  });
  ws.on('error', () => {
    removeFromQueue(ws);
    removeFromRoom(ws);
  });
});

const port = Number(process.env.PORT) || 3000;
server.listen(port, '0.0.0.0', () => {
  console.log(`Goal Drift server listening on http://localhost:${port}`);
});
