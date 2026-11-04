'use strict';

const crypto = require('node:crypto');
const http = require('node:http');
const path = require('node:path');
const express = require('express');
const { WebSocketServer, WebSocket } = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/multiplayer', maxPayload: 16 * 1024 });
const rooms = new Map();
const quickQueue = [];
const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const seats = [[0, 0], [1, 0], [0, 1], [1, 1]];
const stadiumIds = new Set(['neon', 'desert', 'ice', 'forest', 'lunar']);

app.get('/health', (_req, res) => res.json({ ok: true, rooms: rooms.size, queued: quickQueue.length }));
app.get('/', (_req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/index.html', (_req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/manifest.webmanifest', (_req, res) => res.sendFile(path.join(__dirname, 'manifest.webmanifest')));
app.get('/icon.svg', (_req, res) => res.sendFile(path.join(__dirname, 'icon.svg')));
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
function cleanProfile(profile) {
  const p = profile || {};
  return {
    name: String(p.name || 'Driver').replace(/[<>]/g, '').trim().slice(0, 16) || 'Driver',
    paint: /^#[0-9a-f]{6}$/i.test(p.paint) ? p.paint : '#ffd23f',
    accent: /^#[0-9a-f]{6}$/i.test(p.accent) ? p.accent : '#9b6cff',
    skin: ['racing', 'twin', 'solid'].includes(p.skin) ? p.skin : 'solid',
  };
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
    if (msg.profile) ws.profile = cleanProfile(msg.profile);
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
