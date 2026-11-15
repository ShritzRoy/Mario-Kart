import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';
import type {
  ClientToServerMessage,
  NetHazard,
  NetKartState,
  NetPlayerInfo,
  NetRoomSnapshot,
  ServerToClientMessage,
} from './src/shared/protocol.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const IS_PROD = process.env.NODE_ENV === 'production';

interface RoomInternal {
  roomCode: string;
  phase: 'lobby' | 'countdown' | 'racing' | 'finished';
  countdownValue: number;
  raceStartTimeMs: number;
  players: Map<string, NetPlayerInfo>;
  karts: Map<string, NetKartState>;
  hazards: Map<string, NetHazard>;
  sockets: Map<string, WebSocket>;
  countdownTimer?: ReturnType<typeof setInterval>;
}

const rooms = new Map<string, RoomInternal>();
const socketToMeta = new Map<WebSocket, { playerId: string; roomCode: string }>();

function makeId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeRoomCode(raw: string): string {
  const clean = (raw || 'GP01').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
  return clean || 'GP01';
}

function getOrCreateRoom(roomCode: string): RoomInternal {
  const code = normalizeRoomCode(roomCode);
  let room = rooms.get(code);
  if (!room) {
    room = {
      roomCode: code,
      phase: 'lobby',
      countdownValue: 3,
      raceStartTimeMs: 0,
      players: new Map(),
      karts: new Map(),
      hazards: new Map(),
      sockets: new Map(),
    };
    rooms.set(code, room);
  }
  return room;
}

function serializeRoom(room: RoomInternal): NetRoomSnapshot {
  const kartsObj: Record<string, NetKartState> = {};
  for (const [id, st] of room.karts.entries()) {
    kartsObj[id] = st;
  }
  return {
    roomCode: room.roomCode,
    phase: room.phase,
    countdownValue: room.countdownValue,
    raceStartTimeMs: room.raceStartTimeMs,
    players: Array.from(room.players.values()).sort((a, b) => a.slotIndex - b.slotIndex),
    karts: kartsObj,
    hazards: Array.from(room.hazards.values()),
  };
}

function sendJson(ws: WebSocket, msg: ServerToClientMessage): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg));
  }
}

function broadcastRoom(room: RoomInternal, msg?: ServerToClientMessage): void {
  const payload = JSON.stringify(msg ?? { type: 'room:snapshot', room: serializeRoom(room) });
  for (const ws of room.sockets.values()) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(payload);
    }
  }
}

function assignNextSlot(room: RoomInternal): number {
  const used = new Set(Array.from(room.players.values()).map((p) => p.slotIndex));
  for (let i = 0; i < 8; i++) {
    if (!used.has(i)) return i;
  }
  return room.players.size;
}

function startCountdown(room: RoomInternal): void {
  if (room.countdownTimer) clearInterval(room.countdownTimer);
  room.phase = 'countdown';
  room.countdownValue = 3;
  room.hazards.clear();
  room.karts.clear();
  broadcastRoom(room);

  room.countdownTimer = setInterval(() => {
    room.countdownValue -= 1;
    if (room.countdownValue <= 0) {
      if (room.countdownTimer) {
        clearInterval(room.countdownTimer);
        room.countdownTimer = undefined;
      }
      room.phase = 'racing';
      room.countdownValue = 0;
      room.raceStartTimeMs = Date.now();
    }
    broadcastRoom(room);
  }, 950);
}

function removePlayerFromRoom(ws: WebSocket): void {
  const meta = socketToMeta.get(ws);
  if (!meta) return;
  socketToMeta.delete(ws);

  const room = rooms.get(meta.roomCode);
  if (!room) return;

  const wasHost = room.players.get(meta.playerId)?.isHost ?? false;
  room.players.delete(meta.playerId);
  room.karts.delete(meta.playerId);
  room.sockets.delete(meta.playerId);

  if (room.players.size === 0) {
    if (room.countdownTimer) clearInterval(room.countdownTimer);
    rooms.delete(meta.roomCode);
    return;
  }

  if (wasHost) {
    const next = room.players.values().next().value;
    if (next) next.isHost = true;
  }
  broadcastRoom(room);
}

async function bootstrap() {
  const app = express();
  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, rooms: rooms.size });
  });

  app.get('/api/rooms/:code', (req, res) => {
    const code = normalizeRoomCode(req.params.code);
    const room = rooms.get(code);
    res.json({
      exists: Boolean(room),
      playerCount: room ? room.players.size : 0,
      phase: room ? room.phase : 'lobby',
    });
  });

  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws) => {
    ws.on('message', (raw) => {
      let msg: ClientToServerMessage;
      try {
        msg = JSON.parse(raw.toString()) as ClientToServerMessage;
      } catch {
        return;
      }

      if (msg.type === 'room:join') {
        removePlayerFromRoom(ws);
        const room = getOrCreateRoom(msg.roomCode);
        if (room.players.size >= 8) {
          sendJson(ws, { type: 'room:error', message: 'Room is full (8/8 racers).' });
          return;
        }
        const playerId = makeId('racer');
        const info: NetPlayerInfo = {
          id: playerId,
          name: (msg.playerName || 'Driver').slice(0, 16),
          characterId: msg.characterId || 'mario',
          vehicleId: msg.vehicleId || 'standard_kart',
          ready: false,
          isHost: room.players.size === 0,
          slotIndex: assignNextSlot(room),
        };
        room.players.set(playerId, info);
        room.sockets.set(playerId, ws);
        socketToMeta.set(ws, { playerId, roomCode: room.roomCode });

        sendJson(ws, {
          type: 'session:welcome',
          playerId,
          room: serializeRoom(room),
        });
        broadcastRoom(room);
        return;
      }

      const meta = socketToMeta.get(ws);
      if (!meta) return;
      const room = rooms.get(meta.roomCode);
      if (!room) return;
      const player = room.players.get(meta.playerId);
      if (!player) return;

      if (msg.type === 'room:selectCharacter') {
        player.characterId = msg.characterId;
        broadcastRoom(room);
      } else if (msg.type === 'room:selectVehicle') {
        player.vehicleId = msg.vehicleId;
        broadcastRoom(room);
      } else if (msg.type === 'room:setReady') {
        player.ready = msg.ready;
        broadcastRoom(room);
      } else if (msg.type === 'room:startRace') {
        if (player.isHost && room.phase === 'lobby') {
          startCountdown(room);
        }
      } else if (msg.type === 'room:returnLobby') {
        if (player.isHost) {
          if (room.countdownTimer) clearInterval(room.countdownTimer);
          room.phase = 'lobby';
          room.hazards.clear();
          room.karts.clear();
          for (const p of room.players.values()) p.ready = false;
          broadcastRoom(room);
        }
      } else if (msg.type === 'player:state') {
        room.karts.set(meta.playerId, { ...msg.state, id: meta.playerId });
      } else if (msg.type === 'item:spawnHazard') {
        if (!room.hazards.has(msg.hazard.id)) {
          room.hazards.set(msg.hazard.id, msg.hazard);
          broadcastRoom(room);
        }
      } else if (msg.type === 'item:removeHazard') {
        if (room.hazards.delete(msg.hazardId)) {
          broadcastRoom(room);
        }
      } else if (msg.type === 'item:hitPlayer') {
        broadcastRoom(room, {
          type: 'item:hitNotice',
          targetId: msg.targetId,
          attackerId: msg.attackerId,
          kind: msg.kind,
        });
      }
    });

    ws.on('close', () => {
      removePlayerFromRoom(ws);
    });
  });

  // Authoritative 20Hz simulation & snapshot loop for active rooms
  setInterval(() => {
    const dt = 0.05;
    for (const room of rooms.values()) {
      if (room.phase === 'racing') {
        // Tick server-side hazards
        for (const [id, hz] of room.hazards.entries()) {
          hz.ttl -= dt;
          if (hz.kind === 'shell') {
            hz.x += hz.vx * dt;
            hz.z += hz.vz * dt;
          }
          if (hz.ttl <= 0) {
            room.hazards.delete(id);
          }
        }
        broadcastRoom(room);
      }
    }
  }, 50);

  if (!IS_PROD) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Mario Kart Grand Prix server running at http://localhost:${PORT}`);
  });
}

bootstrap();
