const express  = require('express');
const http     = require('http');
const { Server } = require('socket.io');
const path     = require('path');

const app        = express();
const httpServer = http.createServer(app);
const io         = new Server(httpServer, { cors: { origin: '*' } });
const PORT       = process.env.PORT || 3000;

// rooms: code -> { code, trackId, players: [{socketId, kartId, isHost}], state }
const rooms = new Map();

function genCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code;
  do { code = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join(''); }
  while (rooms.has(code));
  return code;
}

io.on('connection', socket => {
  let myRoom = null;

  socket.on('create-room', ({ kartId, trackId }) => {
    const code = genCode();
    myRoom = code;
    rooms.set(code, {
      code, trackId,
      players: [{ socketId: socket.id, kartId, isHost: true }],
      state: 'waiting'
    });
    socket.join(code);
    socket.emit('room-created', { code, trackId });
  });

  socket.on('join-room', ({ code, kartId }) => {
    const key = (code || '').toString().toUpperCase().trim();
    const room = rooms.get(key);
    if (!room)                    return socket.emit('join-error', 'Room not found. Check the code.');
    if (room.players.length >= 2) return socket.emit('join-error', 'Room is already full.');
    if (room.state !== 'waiting') return socket.emit('join-error', 'Race already started.');

    myRoom = key;
    room.players.push({ socketId: socket.id, kartId, isHost: false });
    socket.join(key);

    const hostKartId = room.players[0].kartId;
    socket.emit('room-joined', { code: key, trackId: room.trackId, hostKartId });
    socket.to(key).emit('opponent-joined', { kartId });

    room.state = 'countdown';
    // Give both clients 300ms to render before the race-start fires
    setTimeout(() => io.to(key).emit('race-start'), 300);
  });

  // Live kart position broadcast (~20 fps from client)
  socket.on('kart-update', data => {
    if (myRoom) socket.to(myRoom).emit('opponent-update', data);
  });

  // Opponent completed a lap
  socket.on('lap-complete', data => {
    if (myRoom) socket.to(myRoom).emit('opponent-lap', data);
  });

  // Opponent finished all laps
  socket.on('race-finish', () => {
    if (myRoom) socket.to(myRoom).emit('opponent-finished');
  });

  socket.on('disconnect', () => {
    if (!myRoom || !rooms.has(myRoom)) return;
    socket.to(myRoom).emit('opponent-disconnected');
    const room = rooms.get(myRoom);
    room.players = room.players.filter(p => p.socketId !== socket.id);
    if (room.players.length === 0) rooms.delete(myRoom);
  });
});

app.use(express.static(path.join(__dirname, 'public')));

httpServer.listen(PORT, () => {
  console.log(`\n  Karting Game  →  http://localhost:${PORT}`);
  console.log('  Share that URL with a friend on the same network to race online!\n');
});
