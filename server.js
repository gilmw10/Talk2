import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
    methods: ["GET", "POST"],
    credentials: true
  }
});

app.use(express.static(path.join(__dirname, 'dist')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const rooms = new Map();
let matchQueue = [];

function generateRoomCode(prefix = 'ROOM') {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 5; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${prefix}-${result}`;
}

io.on('connection', (socket) => {
  socket.on('join-room', ({ username, roomCode }) => {
    if (!username || !roomCode) {
      socket.emit('error-msg', '닉네임과 방 코드를 입력해주세요.');
      return;
    }

    const formattedRoomCode = roomCode.trim().toUpperCase();
    const room = rooms.get(formattedRoomCode) || [];

    if (room.length >= 2) {
      socket.emit('error-msg', '이 대화방은 이미 가득 찼습니다. 최대 2명까지 입장 가능합니다.');
      return;
    }

    socket.join(formattedRoomCode);

    room.push({ socketId: socket.id, username });
    rooms.set(formattedRoomCode, room);

    socket.roomCode = formattedRoomCode;
    socket.username = username;

    socket.emit('room-joined', { roomCode: formattedRoomCode, users: room });
    socket.to(formattedRoomCode).emit('user-joined', { username, socketId: socket.id });

    if (room.length === 2) {
      io.in(formattedRoomCode).emit('chat-ready', { users: room });
    }
  });

  socket.on('start-match', ({ username }) => {
    if (!username) {
      socket.emit('error-msg', '닉네임을 입력해주세요.');
      return;
    }

    socket.username = username;

    const isQueued = matchQueue.some(user => user.socketId === socket.id);
    if (isQueued) return;

    if (matchQueue.length > 0) {
      const partner = matchQueue.shift();
      const partnerSocket = io.sockets.sockets.get(partner.socketId);

      if (partnerSocket) {
        const roomCode = generateRoomCode('MATCH');

        socket.join(roomCode);
        partnerSocket.join(roomCode);

        const roomUsers = [
          { socketId: partner.socketId, username: partner.username },
          { socketId: socket.id, username }
        ];
        rooms.set(roomCode, roomUsers);

        socket.roomCode = roomCode;
        partnerSocket.roomCode = roomCode;

        io.in(roomCode).emit('room-joined', { roomCode, users: roomUsers });
        io.in(roomCode).emit('chat-ready', { users: roomUsers });
      } else {
        matchQueue.push({ socketId: socket.id, username });
        socket.emit('match-queued');
      }
    } else {
      matchQueue.push({ socketId: socket.id, username });
      socket.emit('match-queued');
    }
  });

  socket.on('leave-queue', () => {
    matchQueue = matchQueue.filter(user => user.socketId !== socket.id);
    socket.emit('match-cancelled');
  });

  socket.on('chat-message', (msgData) => {
    const roomCode = socket.roomCode;
    if (roomCode) {
      io.in(roomCode).emit('chat-message', {
        sender: socket.username,
        senderId: socket.id,
        content: msgData.content,
        type: msgData.type || 'text',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
    }
  });

  socket.on('typing', ({ isTyping }) => {
    const roomCode = socket.roomCode;
    if (roomCode) {
      socket.to(roomCode).emit('typing', {
        username: socket.username,
        isTyping
      });
    }
  });

  socket.on('leave-room', () => {
    handleRoomExit(socket);
  });

  socket.on('disconnect', () => {
    matchQueue = matchQueue.filter(user => user.socketId !== socket.id);
    handleRoomExit(socket);
  });
});

function handleRoomExit(socket) {
  const roomCode = socket.roomCode;
  if (!roomCode) return;

  const room = rooms.get(roomCode);
  if (room) {
    const updatedRoom = room.filter(user => user.socketId !== socket.id);
    if (updatedRoom.length === 0) {
      rooms.delete(roomCode);
    } else {
      rooms.set(roomCode, updatedRoom);
      socket.to(roomCode).emit('user-left', { username: socket.username });
      socket.to(roomCode).emit('chat-broken', { message: `${socket.username}님이 대화방을 나갔습니다.` });
    }
  }

  socket.leave(roomCode);
  socket.roomCode = null;
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Talk2 서버가 포트 ${PORT}에서 실행 중입니다.`);
});
