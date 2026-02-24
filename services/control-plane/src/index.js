import dotenv from 'dotenv';
import express from 'express';
import helmet from 'helmet';
import jwt from 'jsonwebtoken';
import morgan from 'morgan';

dotenv.config();

const app = express();
app.use(helmet());
app.use(express.json({ limit: '256kb' }));
app.use(morgan('combined'));

const PORT = Number(process.env.PORT || 4000);
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret';
const TOKEN_TTL_SECONDS = Number(process.env.TOKEN_TTL_SECONDS || 300);

const roomState = new Map();

const ROLE_CAPABILITIES = {
  host: {
    canPublishAudio: true,
    canPublishVideo: true,
    canPublishScreen: true,
    canModerate: true,
    canRecord: true,
    canStreamToCDN: true
  },
  speaker: {
    canPublishAudio: true,
    canPublishVideo: true,
    canPublishScreen: true,
    canModerate: false,
    canRecord: false,
    canStreamToCDN: false
  },
  audience: {
    canPublishAudio: false,
    canPublishVideo: false,
    canPublishScreen: false,
    canModerate: false,
    canRecord: false,
    canStreamToCDN: false
  }
};

function getRoom(roomId) {
  if (!roomState.has(roomId)) {
    roomState.set(roomId, {
      locked: false,
      waitingRoomEnabled: false,
      bannedParticipants: new Set(),
      participants: new Map()
    });
  }
  return roomState.get(roomId);
}

app.get('/healthz', (_, res) => {
  res.status(200).json({ ok: true, service: 'control-plane' });
});

app.post('/v1/token', (req, res) => {
  const { roomId, participantId, role = 'audience' } = req.body;

  if (!roomId || !participantId) {
    return res.status(400).json({ error: 'roomId and participantId are required' });
  }

  const caps = ROLE_CAPABILITIES[role];
  if (!caps) {
    return res.status(400).json({ error: 'invalid role' });
  }

  const room = getRoom(roomId);
  if (room.bannedParticipants.has(participantId)) {
    return res.status(403).json({ error: 'participant banned' });
  }

  const payload = {
    roomId,
    participantId,
    role,
    capabilities: caps
  };

  const token = jwt.sign(payload, JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: TOKEN_TTL_SECONDS
  });

  room.participants.set(participantId, { role, muted: false });

  return res.status(200).json({ token, expiresIn: TOKEN_TTL_SECONDS, ...payload });
});

app.post('/v1/rooms/:roomId/lock', (req, res) => {
  const room = getRoom(req.params.roomId);
  room.locked = true;
  res.status(200).json({ roomId: req.params.roomId, locked: room.locked });
});

app.post('/v1/rooms/:roomId/unlock', (req, res) => {
  const room = getRoom(req.params.roomId);
  room.locked = false;
  res.status(200).json({ roomId: req.params.roomId, locked: room.locked });
});

app.post('/v1/rooms/:roomId/waiting-room', (req, res) => {
  const { enabled } = req.body;
  const room = getRoom(req.params.roomId);
  room.waitingRoomEnabled = Boolean(enabled);
  res.status(200).json({ roomId: req.params.roomId, waitingRoomEnabled: room.waitingRoomEnabled });
});

app.post('/v1/rooms/:roomId/participants/:participantId/promote', (req, res) => {
  const room = getRoom(req.params.roomId);
  room.participants.set(req.params.participantId, { role: 'speaker', muted: false });
  res.status(200).json({ roomId: req.params.roomId, participantId: req.params.participantId, role: 'speaker' });
});

app.post('/v1/rooms/:roomId/participants/:participantId/demote', (req, res) => {
  const room = getRoom(req.params.roomId);
  room.participants.set(req.params.participantId, { role: 'audience', muted: false });
  res.status(200).json({ roomId: req.params.roomId, participantId: req.params.participantId, role: 'audience' });
});

app.post('/v1/rooms/:roomId/participants/:participantId/mute', (req, res) => {
  const room = getRoom(req.params.roomId);
  const current = room.participants.get(req.params.participantId) || { role: 'audience', muted: false };
  room.participants.set(req.params.participantId, { ...current, muted: true });
  res.status(200).json({ roomId: req.params.roomId, participantId: req.params.participantId, muted: true });
});

app.post('/v1/rooms/:roomId/participants/:participantId/kick', (req, res) => {
  const room = getRoom(req.params.roomId);
  room.participants.delete(req.params.participantId);
  res.status(200).json({ roomId: req.params.roomId, participantId: req.params.participantId, kicked: true });
});

app.post('/v1/rooms/:roomId/participants/:participantId/ban', (req, res) => {
  const room = getRoom(req.params.roomId);
  room.bannedParticipants.add(req.params.participantId);
  room.participants.delete(req.params.participantId);
  res.status(200).json({ roomId: req.params.roomId, participantId: req.params.participantId, banned: true });
});

app.listen(PORT, () => {
  console.log(`control-plane listening on :${PORT}`);
});
