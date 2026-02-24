import dotenv from 'dotenv';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { createServer } from 'http';
import { Server } from 'socket.io';

dotenv.config();

const app = express();
app.use(helmet());
app.use(morgan('combined'));

const server = createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

const PORT = Number(process.env.PORT || 5000);
const CHAT_LIMIT = Number(process.env.CHAT_MSG_LIMIT_PER_10S || 10);
const REACTION_LIMIT = Number(process.env.REACTION_LIMIT_PER_10S || 20);

const rateStore = new Map();
const mutedUsers = new Map();

function checkRateLimit(key, limit) {
  const now = Date.now();
  const windowStart = now - 10000;
  const events = rateStore.get(key) || [];
  const recent = events.filter((t) => t > windowStart);

  if (recent.length >= limit) {
    rateStore.set(key, recent);
    return false;
  }

  recent.push(now);
  rateStore.set(key, recent);
  return true;
}

app.get('/healthz', (_, res) => {
  res.status(200).json({ ok: true, service: 'data-plane' });
});

io.on('connection', (socket) => {
  const { roomId, participantId, role = 'audience' } = socket.handshake.query;

  if (!roomId || !participantId) {
    socket.emit('error_event', { code: 'INVALID_HANDSHAKE', message: 'roomId and participantId are required' });
    socket.disconnect();
    return;
  }

  socket.join(roomId);
  io.to(roomId).emit('presence.join', { roomId, participantId, role, ts: Date.now() });

  socket.on('chat.send', (payload) => {
    const muteKey = `${roomId}:${participantId}`;
    const muteUntil = mutedUsers.get(muteKey);
    if (muteUntil && muteUntil > Date.now()) {
      socket.emit('chat.rejected', { reason: 'temporarily_muted' });
      return;
    }

    const key = `chat:${roomId}:${participantId}`;
    if (!checkRateLimit(key, CHAT_LIMIT)) {
      mutedUsers.set(muteKey, Date.now() + 30000);
      socket.emit('chat.rejected', { reason: 'rate_limited_temp_mute_30s' });
      return;
    }

    io.to(roomId).emit('chat.message', {
      participantId,
      message: String(payload?.message || '').slice(0, 500),
      ts: Date.now()
    });
  });

  socket.on('reaction.send', (payload) => {
    const key = `reaction:${roomId}:${participantId}`;
    if (!checkRateLimit(key, REACTION_LIMIT)) {
      socket.emit('reaction.rejected', { reason: 'rate_limited' });
      return;
    }

    io.to(roomId).emit('reaction.event', {
      participantId,
      reaction: String(payload?.reaction || '👍').slice(0, 10),
      ts: Date.now()
    });
  });

  socket.on('handraise.send', () => {
    io.to(roomId).emit('handraise.event', { participantId, ts: Date.now() });
  });

  socket.on('moderation.command', (payload) => {
    if (role !== 'host') {
      socket.emit('moderation.rejected', { reason: 'not_authorized' });
      return;
    }

    io.to(roomId).emit('moderation.event', {
      actor: participantId,
      command: payload?.command || 'noop',
      targetParticipantId: payload?.targetParticipantId || null,
      ts: Date.now()
    });
  });

  socket.on('disconnect', () => {
    io.to(roomId).emit('presence.leave', { roomId, participantId, ts: Date.now() });
  });
});

server.listen(PORT, () => {
  console.log(`data-plane listening on :${PORT}`);
});
