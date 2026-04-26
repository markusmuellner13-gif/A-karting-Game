const express  = require('express');
const http     = require('http');
const { Server } = require('socket.io');
const path     = require('path');

const app        = express();
const httpServer = http.createServer(app);
const io         = new Server(httpServer, { cors: { origin: '*' } });
const PORT       = process.env.PORT || 3000;

// rooms: code -> { code, trackId, players: [{socketId, kartId, isHost, ready}], state }
const rooms = new Map();

function genCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code;
  do { code = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join(''); }
  while (rooms.has(code));
  return code;
}

function lobbyPayload(room) {
  return room.players.map((p, i) => ({ index: i, kartId: p.kartId, isHost: p.isHost, ready: p.ready }));
}

io.on('connection', socket => {
  let myRoom = null;

  socket.on('create-room', ({ kartId, trackId }) => {
    const code = genCode();
    myRoom = code;
    rooms.set(code, {
      code, trackId,
      players: [{ socketId: socket.id, kartId, isHost: true, ready: false }],
      state: 'waiting'
    });
    socket.join(code);
    socket.emit('room-created', { code, playerIndex: 0 });
    socket.emit('lobby-update', { players: lobbyPayload(rooms.get(code)) });
  });

  socket.on('join-room', ({ code, kartId }) => {
    const key = (code || '').toString().toUpperCase().trim();
    const room = rooms.get(key);
    if (!room)                       return socket.emit('join-error', 'Room not found.');
    if (room.players.length >= 4)    return socket.emit('join-error', 'Room is full (max 4).');
    if (room.state !== 'waiting')    return socket.emit('join-error', 'Race already started.');

    myRoom = key;
    const playerIndex = room.players.length;
    room.players.push({ socketId: socket.id, kartId, isHost: false, ready: false });
    socket.join(key);
    socket.emit('room-joined', { code: key, trackId: room.trackId, playerIndex });
    io.to(key).emit('lobby-update', { players: lobbyPayload(room) });
  });

  socket.on('player-ready', () => {
    if (!myRoom || !rooms.has(myRoom)) return;
    const room = rooms.get(myRoom);
    const p = room.players.find(p => p.socketId === socket.id);
    if (p) { p.ready = true; io.to(myRoom).emit('lobby-update', { players: lobbyPayload(room) }); }
  });

  socket.on('start-race', () => {
    if (!myRoom || !rooms.has(myRoom)) return;
    const room = rooms.get(myRoom);
    const host = room.players.find(p => p.socketId === socket.id);
    if (!host || !host.isHost) return;
    if (room.players.length < 2) return;
    room.state = 'racing';
    setTimeout(() => io.to(myRoom).emit('race-start', { players: lobbyPayload(room) }), 300);
  });

  socket.on('kart-update', data => {
    if (!myRoom || !rooms.has(myRoom)) return;
    const room = rooms.get(myRoom);
    const idx = room.players.findIndex(p => p.socketId === socket.id);
    socket.to(myRoom).emit('opponent-update', { ...data, playerIndex: idx });
  });

  socket.on('lap-complete', data => {
    if (!myRoom || !rooms.has(myRoom)) return;
    const room = rooms.get(myRoom);
    const idx = room.players.findIndex(p => p.socketId === socket.id);
    socket.to(myRoom).emit('opponent-lap', { ...data, playerIndex: idx });
  });

  socket.on('race-finish', () => {
    if (!myRoom || !rooms.has(myRoom)) return;
    const room = rooms.get(myRoom);
    const idx = room.players.findIndex(p => p.socketId === socket.id);
    socket.to(myRoom).emit('opponent-finished', { playerIndex: idx });
  });

  socket.on('disconnect', () => {
    if (!myRoom || !rooms.has(myRoom)) return;
    const room = rooms.get(myRoom);
    const idx = room.players.findIndex(p => p.socketId === socket.id);
    socket.to(myRoom).emit('opponent-disconnected', { playerIndex: idx });
    room.players = room.players.filter(p => p.socketId !== socket.id);
    if (room.players.length === 0) rooms.delete(myRoom);
    else io.to(myRoom).emit('lobby-update', { players: lobbyPayload(room) });
  });
});

app.use(express.static(path.join(__dirname, 'public')));

httpServer.listen(PORT, () => {
  console.log(`\n  Kart Racer  →  http://localhost:${PORT}\n`);
});
