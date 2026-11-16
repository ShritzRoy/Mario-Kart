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
  mapId: string;
  weatherChoice: string;
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
      mapId: 'plaza',
      weatherChoice: 'sunny',
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
    mapId: room.mapId,
    weatherChoice: room.weatherChoice,
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

import fs from 'fs';

interface CloudPlayerProfileInternal {
  username: string;
  level: number;
  xp: number;
  playtimeSeconds: number;
  racesCompleted: number;
  wins: number;
  podiums: number;
  favoriteCharacter: string;
  favoriteVehicle: string;
  lastActiveMs: number;
}

const PROFILES_FILE = path.resolve(__dirname, 'cloud_profiles.json');
const profiles = new Map<string, CloudPlayerProfileInternal>();

function loadProfilesFromDisk() {
  try {
    if (fs.existsSync(PROFILES_FILE)) {
      const raw = fs.readFileSync(PROFILES_FILE, 'utf-8');
      const list = JSON.parse(raw) as CloudPlayerProfileInternal[];
      if (Array.isArray(list)) {
        for (const p of list) {
          if (p && p.username) profiles.set(p.username.toLowerCase(), p);
        }
      }
    }
  } catch (err) {
    console.warn('Could not load profiles file:', err);
  }
}

let saveDebounceTimer: NodeJS.Timeout | null = null;
function saveProfilesToDisk() {
  if (saveDebounceTimer) return;
  saveDebounceTimer = setTimeout(() => {
    saveDebounceTimer = null;
    try {
      const arr = Array.from(profiles.values());
      fs.writeFileSync(PROFILES_FILE, JSON.stringify(arr, null, 2), 'utf-8');
    } catch (err) {
      console.warn('Failed to persist profiles:', err);
    }
  }, 1000);
}

loadProfilesFromDisk();

function getOrCreateProfile(rawUsername: string): CloudPlayerProfileInternal {
  const clean = (rawUsername || 'Racer').trim().slice(0, 16);
  const key = clean.toLowerCase();
  let p = profiles.get(key);
  if (!p) {
    p = {
      username: clean,
      level: 1,
      xp: 0,
      playtimeSeconds: 0,
      racesCompleted: 0,
      wins: 0,
      podiums: 0,
      favoriteCharacter: 'mario',
      favoriteVehicle: 'standard_kart',
      lastActiveMs: Date.now(),
    };
    profiles.set(key, p);
    saveProfilesToDisk();
  }
  return p;
}

function calculateNextLevelXp(level: number): number {
  return 100 + level * 50;
}

const MAP_NAMES: Record<string, string> = {
  plaza: 'Shritiz Coconut Plaza',
  meadow: 'Sunlit Meadow Highway',
  stadium: 'Coliseum Grand Prix',
  skyline: 'Skyline Overpass',
  slanted_canyon: 'Red Rock Slanted Canyon (45° Bank)',
  rainbow_road: 'Rainbow Galaxy Road',
  volcano_ridge: "Bowser's Molten Ridge",
  shritiz_circuit: 'Royal Shritiz GP Circuit',
};

async function bootstrap() {
  const app = express();
  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, rooms: rooms.size, profiles: profiles.size });
  });

  // 1. List currently hosted rooms on the game cloud server
  app.get('/api/rooms', (_req, res) => {
    const list = Array.from(rooms.values()).map((r) => {
      const host = Array.from(r.players.values()).find((p) => p.isHost);
      return {
        roomCode: r.roomCode,
        hostName: host ? host.name : 'Host',
        mapId: r.mapId,
        mapName: MAP_NAMES[r.mapId] || 'Shritiz Coconut Plaza',
        weatherChoice: r.weatherChoice,
        playerCount: r.players.size,
        maxPlayers: 8,
        phase: r.phase,
      };
    });

    // If no rooms currently created, offer standard Grand Prix public room so players can immediately hop in
    if (list.length === 0) {
      list.push({
        roomCode: 'GP01',
        hostName: 'Grand Prix Lobby',
        mapId: 'plaza',
        mapName: 'Shritiz Coconut Plaza',
        weatherChoice: 'sunny',
        playerCount: 0,
        maxPlayers: 8,
        phase: 'lobby',
      });
    }

    res.json({ rooms: list });
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

  // 2. Cloud Profile Get
  app.get('/api/profile/:username', (req, res) => {
    const prof = getOrCreateProfile(req.params.username);
    res.json({ profile: prof });
  });

  // 3. Cloud Profile Save / Level Up System with XP & Playtime
  app.post('/api/profile/save', (req, res) => {
    const {
      username,
      xpGain = 0,
      playtimeGainSec = 0,
      raceFinished = false,
      won = false,
      podium = false,
      favoriteCharacter,
      favoriteVehicle,
    } = req.body || {};

    const prof = getOrCreateProfile(username);
    prof.lastActiveMs = Date.now();

    if (favoriteCharacter) prof.favoriteCharacter = favoriteCharacter;
    if (favoriteVehicle) prof.favoriteVehicle = favoriteVehicle;
    if (playtimeGainSec > 0) prof.playtimeSeconds += Math.min(playtimeGainSec, 600);

    let leveledUp = false;
    let oldLevel = prof.level;

    if (raceFinished) {
      prof.racesCompleted += 1;
      if (won) prof.wins += 1;
      if (podium) prof.podiums += 1;
    }

    if (xpGain > 0) {
      prof.xp += Math.round(xpGain);
      let nextReq = calculateNextLevelXp(prof.level);
      while (prof.xp >= nextReq) {
        prof.xp -= nextReq;
        prof.level += 1;
        leveledUp = true;
        nextReq = calculateNextLevelXp(prof.level);
      }
    }

    saveProfilesToDisk();
    res.json({
      ok: true,
      profile: prof,
      leveledUp,
      levelsGained: prof.level - oldLevel,
      newLevel: prof.level,
      nextLevelXpReq: calculateNextLevelXp(prof.level),
    });
  });

  // 4. Global Online Cloud Leaderboard
  app.get('/api/leaderboard', (_req, res) => {
    const sorted = Array.from(profiles.values())
      .sort((a, b) => {
        if (b.level !== a.level) return b.level - a.level;
        if (b.xp !== a.xp) return b.xp - a.xp;
        if (b.playtimeSeconds !== a.playtimeSeconds) return b.playtimeSeconds - a.playtimeSeconds;
        return b.wins - a.wins;
      })
      .slice(0, 50)
      .map((p, idx) => ({
        rank: idx + 1,
        username: p.username,
        level: p.level,
        xp: p.xp,
        nextLevelXp: calculateNextLevelXp(p.level),
        playtimeSeconds: p.playtimeSeconds,
        playtimeFormatted: `${Math.floor(p.playtimeSeconds / 3600)}h ${Math.floor(
          (p.playtimeSeconds % 3600) / 60
        )}m`,
        racesCompleted: p.racesCompleted,
        wins: p.wins,
        podiums: p.podiums,
        favoriteCharacter: p.favoriteCharacter,
        favoriteVehicle: p.favoriteVehicle,
      }));

    res.json({ leaderboard: sorted });
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
          variantId: msg.variantId || 'default',
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
        if (msg.variantId !== undefined) player.variantId = msg.variantId;
        broadcastRoom(room);
      } else if (msg.type === 'room:selectVehicle') {
        player.vehicleId = msg.vehicleId;
        broadcastRoom(room);
      } else if (msg.type === 'room:setCourse') {
        if (player.isHost) {
          room.mapId = msg.mapId || room.mapId;
          room.weatherChoice = msg.weatherChoice || room.weatherChoice;
          broadcastRoom(room);
        }
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
        for (const [id, hz] of room.hazards.entries()) {
          hz.ttl -= dt;
          if (
            hz.kind === 'shell' ||
            hz.kind === 'golden_fireball' ||
            hz.kind === 'blue_shell' ||
            hz.kind === 'purple_shell' ||
            hz.kind === 'cannonball'
          ) {
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
