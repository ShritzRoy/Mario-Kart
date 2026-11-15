export type ItemKind =
  | 'none'
  | 'mushroom'
  | 'shell'
  | 'banana'
  | 'star'
  | 'golden_flower'
  | 'super_bell'
  | 'p_balloon'
  | 'mini_mushroom'
  | 'double_cherry'
  | 'bee_mushroom'
  | 'blue_shell'
  | 'elephant_fruit'
  | 'drill_mushroom'
  | 'purple_shell'
  | 'cannon_box'
  | 'cloud_flower';

export type HazardKind =
  | 'shell'
  | 'banana'
  | 'golden_fireball'
  | 'blue_shell'
  | 'purple_shell'
  | 'cannonball'
  | 'honey_puddle';

export type HitNoticeKind = HazardKind | 'star' | 'bumper' | 'oil' | 'elephant_wave';

export interface NetPlayerInfo {
  id: string;
  name: string;
  characterId: string;
  variantId?: string;
  vehicleId: string;
  ready: boolean;
  isHost: boolean;
  slotIndex: number;
}

export interface NetKartState {
  id: string;
  characterId: string;
  variantId?: string;
  vehicleId: string;
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
  scaleFactor?: number;
  shieldCount?: number;
  bellTimer?: number;
  drillTimer?: number;
  cloneActive?: boolean;
  lap: number;
  progress: number;
  rank: number;
  finished: boolean;
  finishTimeMs: number;
}

export interface NetHazard {
  id: string;
  kind: HazardKind;
  ownerId: string;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy?: number;
  vz: number;
  bouncesLeft: number;
  ttl: number;
}

export interface NetRoomSnapshot {
  roomCode: string;
  phase: 'lobby' | 'countdown' | 'racing' | 'finished';
  countdownValue: number;
  raceStartTimeMs: number;
  mapId: string;
  weatherChoice: string;
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
      variantId?: string;
      vehicleId?: string;
    }
  | {
      type: 'room:selectCharacter';
      characterId: string;
      variantId?: string;
    }
  | {
      type: 'room:selectVehicle';
      vehicleId: string;
    }
  | {
      type: 'room:setCourse';
      mapId: string;
      weatherChoice: string;
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
      kind: HitNoticeKind;
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
      kind: HitNoticeKind;
    }
  | {
      type: 'room:error';
      message: string;
    };
