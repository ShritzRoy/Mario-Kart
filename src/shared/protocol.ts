export type ItemKind = 'none' | 'mushroom' | 'shell' | 'banana' | 'star';

export interface NetPlayerInfo {
  id: string;
  name: string;
  characterId: string;
  ready: boolean;
  isHost: boolean;
  slotIndex: number;
}

export interface NetKartState {
  id: string;
  characterId: string;
  x: number;
  y: number;
  z: number;
  heading: number;
  speed: number;
  steer: number;
  driftDir: number;
  driftLevel: number;
  boostTimer: number;
  starTimer: number;
  spinTimer: number;
  hopY: number;
  lap: number;
  progress: number;
  rank: number;
  finished: boolean;
  finishTimeMs: number;
}

export interface NetHazard {
  id: string;
  kind: 'shell' | 'banana';
  ownerId: string;
  x: number;
  y: number;
  z: number;
  vx: number;
  vz: number;
  bouncesLeft: number;
  ttl: number;
}

export interface NetRoomSnapshot {
  roomCode: string;
  phase: 'lobby' | 'countdown' | 'racing' | 'finished';
  countdownValue: number;
  raceStartTimeMs: number;
  players: NetPlayerInfo[];
  karts: Record<string, NetKartState>;
  hazards: NetHazard[];
}

export type ClientToServerMessage =
  | {
      type: 'room:join';
      roomCode: string;
      playerName: string;
      characterId: string;
    }
  | {
      type: 'room:selectCharacter';
      characterId: string;
    }
  | {
      type: 'room:setReady';
      ready: boolean;
    }
  | {
      type: 'room:startRace';
    }
  | {
      type: 'room:returnLobby';
    }
  | {
      type: 'player:state';
      state: NetKartState;
    }
  | {
      type: 'item:spawnHazard';
      hazard: NetHazard;
    }
  | {
      type: 'item:removeHazard';
      hazardId: string;
    }
  | {
      type: 'item:hitPlayer';
      targetId: string;
      attackerId: string;
      kind: 'shell' | 'banana' | 'star';
    };

export type ServerToClientMessage =
  | {
      type: 'session:welcome';
      playerId: string;
      room: NetRoomSnapshot;
    }
  | {
      type: 'room:snapshot';
      room: NetRoomSnapshot;
    }
  | {
      type: 'item:hitNotice';
      targetId: string;
      attackerId: string;
      kind: 'shell' | 'banana' | 'star';
    }
  | {
      type: 'room:error';
      message: string;
    };
