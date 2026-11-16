import * as THREE from 'three';
import type { HazardKind, HitNoticeKind, ItemKind } from '../shared/protocol.ts';
import { getRacerWithVariant, type RacerSpec } from './roster.ts';
import { getVehicleById, type VehicleId, type VehicleSpec } from './vehicles.ts';
import {
  BARRIER_HALF_WIDTH,
  SAMPLE_COUNT,
  TRACK_HALF_WIDTH,
  type StadiumTrack,
  type TrackProjection,
} from './track.ts';

export interface KartInputState {
  throttle: boolean;
  brake: boolean;
  left: boolean;
  right: boolean;
  steerAnalog?: number; // optional smooth -1..1 steering
  hop: boolean;
  hopJustPressed: boolean;
  useItemJustPressed: boolean;
}

export type BoostReason = 'drift' | 'nitro' | 'air' | 'mushroom' | 'star' | 'bell' | 'cloud';

export interface KartPhysicsState {
  id: string;
  name: string;
  spec: RacerSpec;
  variantId: string;
  vehicle: VehicleSpec;
  isPlayer: boolean;
  isRemoteHuman: boolean;
  x: number;
  y: number;
  z: number;
  upX: number;
  upY: number;
  upZ: number;
  tanX: number;
  tanY: number;
  tanZ: number;
  inLoop: boolean;
  loopRelSteer: number;
  heading: number;
  speed: number;
  steerVisual: number;
  hopY: number;
  hopVelY: number;
  grounded: boolean;
  driftDir: number; // -1 left, 0 none, +1 right
  driftCharge: number;
  driftLevel: 0 | 1 | 2 | 3;
  boostTimer: number;
  boostStrength: number;
  boostReason: BoostReason;
  starTimer: number;
  bellTimer: number;
  drillTimer: number;
  miniTimer: number;
  beeTimer: number;
  elephantTimer: number;
  cannonBoxTimer: number;
  cannonCooldown: number;
  cloudHopsLeft: number;
  cloneActive: boolean;
  cloneTimer: number;
  poisonTimer: number;
  shieldCount: number; // 0..3 P-Balloon hits absorbed
  scaleFactor: number;
  spinTimer: number;
  claimSpinTimer: number;
  heldItem: ItemKind;
  heldSeconds: number;
  rouletteTimer: number;
  lap: number;
  maxCheckpoint: number; // 0..3 quarterly checkpoints to prevent reverse-lap cheating
  trackIndex: number;
  trackT: number;
  totalProgress: number;
  rank: number;
  finished: boolean;
  finishTimeMs: number;
  aiLaneOffset: number;
  aiSeed: number;
  wheelAngle: number;
  padCooldown: number;
  rampCooldown: number;
  hazardCooldown: number;
}

export interface ActiveHazard {
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
  mesh: THREE.Group;
}

export interface PhysicsCallbacks {
  onHop: (kart: KartPhysicsState) => void;
  onDriftLevel: (kart: KartPhysicsState, level: number) => void;
  onBoost: (kart: KartPhysicsState, power: number, reason: BoostReason) => void;
  onItemPickup: (kart: KartPhysicsState, item: ItemKind) => void;
  onItemClaim?: (kart: KartPhysicsState, item: ItemKind) => void;
  onItemUse: (kart: KartPhysicsState, item: ItemKind) => void;
  onShieldPop?: (kart: KartPhysicsState) => void;
  onCannonFire?: (kart: KartPhysicsState) => void;
  onElephantShockwave?: (kart: KartPhysicsState) => void;
  onHit: (victim: KartPhysicsState, attackerId: string, kind: HitNoticeKind) => void;
  onBump: (a: KartPhysicsState, b: KartPhysicsState) => void;
  onWallScrape?: (kart: KartPhysicsState, side: number) => void;
  onLapComplete: (kart: KartPhysicsState, newLap: number) => void;
  onFinish: (kart: KartPhysicsState) => void;
}

export function createKartState(
  id: string,
  name: string,
  characterId: string,
  gridSlot: number,
  track: StadiumTrack,
  isPlayer: boolean,
  isRemoteHuman: boolean,
  vehicleId: VehicleId | string = 'standard_kart',
  variantId = 'classic'
): KartPhysicsState {
  const spec = getRacerWithVariant(characterId, variantId);
  const vehicle = getVehicleById(vehicleId);
  const row = Math.floor(gridSlot / 2);
  const col = gridSlot % 2 === 0 ? -1 : 1;
  const startIdx = (SAMPLE_COUNT - 8 - row * 4 + SAMPLE_COUNT) % SAMPLE_COUNT;
  const s = track.samples[startIdx];
  const lat = col * 3.8;
  const x = s.point.x + s.right.x * lat;
  const z = s.point.z + s.right.z * lat;
  const heading = Math.atan2(s.tangent.x, s.tangent.z);

  return {
    id,
    name,
    spec,
    variantId: spec.activeVariant.id,
    vehicle,
    isPlayer,
    isRemoteHuman,
    x,
    y: s.point.y,
    z,
    upX: s.up.x,
    upY: s.up.y,
    upZ: s.up.z,
    tanX: s.tangent.x,
    tanY: s.tangent.y,
    tanZ: s.tangent.z,
    inLoop: s.isInLoop,
    loopRelSteer: 0,
    heading,
    speed: 0,
    steerVisual: 0,
    hopY: 0,
    hopVelY: 0,
    grounded: true,
    driftDir: 0,
    driftCharge: 0,
    driftLevel: 0,
    boostTimer: 0,
    boostStrength: 1,
    boostReason: 'drift',
    starTimer: 0,
    bellTimer: 0,
    drillTimer: 0,
    miniTimer: 0,
    beeTimer: 0,
    elephantTimer: 0,
    cannonBoxTimer: 0,
    cannonCooldown: 0,
    cloudHopsLeft: 0,
    cloneActive: false,
    cloneTimer: 0,
    poisonTimer: 0,
    shieldCount: 0,
    scaleFactor: 1,
    spinTimer: 0,
    claimSpinTimer: 0,
    heldItem: 'none',
    heldSeconds: 0,
    rouletteTimer: 0,
    lap: 1,
    maxCheckpoint: 0,
    trackIndex: startIdx,
    trackT: s.t,
    totalProgress: -0.05 - gridSlot * 0.005,
    rank: gridSlot + 1,
    finished: false,
    finishTimeMs: 0,
    aiLaneOffset: (Math.random() - 0.5) * 9.5,
    aiSeed: Math.random() * 100,
    wheelAngle: 0,
    padCooldown: 0,
    rampCooldown: 0,
    hazardCooldown: 0,
  };
}

function rollItemForRank(rank: number, isTimeTrial: boolean): ItemKind {
  if (isTimeTrial) return 'mushroom';
  const topPool: Exclude<ItemKind, 'none'>[] = [
    'banana',
    'shell',
    'p_balloon',
    'cloud_flower',
    'super_bell',
    'mushroom',
    'double_cherry',
    'banana',
  ];
  const midPool: Exclude<ItemKind, 'none'>[] = [
    'mushroom',
    'shell',
    'golden_flower',
    'super_bell',
    'bee_mushroom',
    'drill_mushroom',
    'purple_shell',
    'cannon_box',
    'double_cherry',
    'p_balloon',
    'cloud_flower',
    'banana',
  ];
  const backPool: Exclude<ItemKind, 'none'>[] = [
    'star',
    'blue_shell',
    'elephant_fruit',
    'cannon_box',
    'golden_flower',
    'drill_mushroom',
    'purple_shell',
    'mini_mushroom',
    'mushroom',
    'bee_mushroom',
  ];
  if (rank <= 2) return topPool[Math.floor(Math.random() * topPool.length)];
  if (rank <= 5) return midPool[Math.floor(Math.random() * midPool.length)];
  return backPool[Math.floor(Math.random() * backPool.length)];
}

function wrapAngle(a: number): number {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

export function applyKartShieldOrSpin(
  kart: KartPhysicsState,
  attackerId: string,
  kind: HitNoticeKind,
  cb: PhysicsCallbacks,
  spinDuration = 1.15
): boolean {
  if (kart.starTimer > 0 || kart.elephantTimer > 0) return false;
  if (kart.shieldCount > 0 && kind !== 'star') {
    kart.shieldCount = Math.max(0, kart.shieldCount - 1);
    kart.hazardCooldown = 0.85;
    cb.onShieldPop?.(kart);
    return false;
  }
  if (kart.spinTimer > 0) return false;
  kart.spinTimer = spinDuration;
  if (kind === 'purple_shell') {
    kart.poisonTimer = 3.2;
  }
  cb.onHit(kart, attackerId, kind);
  return true;
}

export function stepKartPhysics(
  kart: KartPhysicsState,
  input: KartInputState,
  track: StadiumTrack,
  dt: number,
  elapsedRaceMs: number,
  playerProgress: number,
  cb: PhysicsCallbacks,
  options?: {
    isTimeTrial?: boolean;
    totalLaps?: number;
    smartSteering?: boolean;
    autoUseItem?: boolean;
  }
): TrackProjection {
  if (kart.isRemoteHuman) {
    const rProj = track.projectOnTrack(kart.x, kart.z, kart.trackIndex, kart.y);
    kart.trackIndex = rProj.sampleIndex;
    kart.upX = rProj.up.x;
    kart.upY = rProj.up.y;
    kart.upZ = rProj.up.z;
    kart.tanX = rProj.tangent.x;
    kart.tanY = rProj.tangent.y;
    kart.tanZ = rProj.tangent.z;
    kart.inLoop = rProj.isInLoop;
    return rProj;
  }

  const isTimeTrial = options?.isTimeTrial ?? false;
  const totalLaps = options?.totalLaps ?? 3;
  const smartSteering = options?.smartSteering ?? false;
  const autoUseItem = options?.autoUseItem ?? false;

  let effectiveInput = input;
  if (!kart.isPlayer || kart.finished) {
    effectiveInput = computeAiInput(kart, track, playerProgress);
  }

  // Combine driver stats + chosen vehicle deltas (clamped 25..100)
  const effTopSpeed = THREE.MathUtils.clamp(
    kart.spec.stats.topSpeed + kart.vehicle.deltas.topSpeed,
    25,
    100
  );
  const effAccel = THREE.MathUtils.clamp(
    kart.spec.stats.acceleration + kart.vehicle.deltas.acceleration,
    25,
    100
  );
  const effHandling = THREE.MathUtils.clamp(
    kart.spec.stats.handling + kart.vehicle.deltas.handling,
    25,
    100
  );

  // Normalized arcade speed tuning (~34..42 u/s cruise -> 105..130 km/h; fair boost -> 135..170 km/h)
  const baseTopSpeed = 34 + (effTopSpeed / 100) * 8;
  const accelRate = 22 + (effAccel / 100) * 14;
  const turnRate = (1.78 + (effHandling / 100) * 0.72) * (kart.miniTimer > 0 ? 1.18 : 1.0);

  if (kart.spinTimer > 0) kart.spinTimer = Math.max(0, kart.spinTimer - dt);
  if (kart.claimSpinTimer > 0) kart.claimSpinTimer = Math.max(0, kart.claimSpinTimer - dt);
  if (kart.boostTimer > 0) kart.boostTimer = Math.max(0, kart.boostTimer - dt);
  if (kart.starTimer > 0) kart.starTimer = Math.max(0, kart.starTimer - dt);
  if (kart.bellTimer > 0) kart.bellTimer = Math.max(0, kart.bellTimer - dt);
  if (kart.drillTimer > 0) kart.drillTimer = Math.max(0, kart.drillTimer - dt);
  if (kart.miniTimer > 0) kart.miniTimer = Math.max(0, kart.miniTimer - dt);
  if (kart.beeTimer > 0) kart.beeTimer = Math.max(0, kart.beeTimer - dt);
  if (kart.elephantTimer > 0) kart.elephantTimer = Math.max(0, kart.elephantTimer - dt);
  if (kart.poisonTimer > 0) kart.poisonTimer = Math.max(0, kart.poisonTimer - dt);
  if (kart.cloneTimer > 0) {
    kart.cloneTimer = Math.max(0, kart.cloneTimer - dt);
    kart.cloneActive = kart.cloneTimer > 0;
  } else {
    kart.cloneActive = false;
  }

  if (kart.cannonBoxTimer > 0) {
    kart.cannonBoxTimer = Math.max(0, kart.cannonBoxTimer - dt);
    kart.cannonCooldown -= dt;
    if (kart.cannonCooldown <= 0) {
      kart.cannonCooldown = 0.85;
      cb.onCannonFire?.(kart);
    }
  }

  const targetScale = kart.elephantTimer > 0 ? 1.42 : kart.miniTimer > 0 ? 0.62 : 1.0;
  kart.scaleFactor = THREE.MathUtils.lerp(kart.scaleFactor, targetScale, Math.min(1, dt * 8));

  if (kart.rouletteTimer > 0) {
    kart.rouletteTimer = Math.max(0, kart.rouletteTimer - dt);
    if (kart.rouletteTimer === 0 && kart.heldItem !== 'none') {
      kart.claimSpinTimer = 0.52;
      kart.heldSeconds = 0;
      cb.onItemClaim?.(kart, kart.heldItem);
    }
  } else if (kart.heldItem !== 'none') {
    kart.heldSeconds += dt;
  } else {
    kart.heldSeconds = 0;
  }

  if (kart.padCooldown > 0) kart.padCooldown = Math.max(0, kart.padCooldown - dt);
  if (kart.rampCooldown > 0) kart.rampCooldown = Math.max(0, kart.rampCooldown - dt);
  if (kart.hazardCooldown > 0) kart.hazardCooldown = Math.max(0, kart.hazardCooldown - dt);

  const proj = track.projectOnTrack(kart.x, kart.z, kart.trackIndex, kart.y);
  kart.trackIndex = proj.sampleIndex;
  const wasInLoop = kart.inLoop;

  // Lap & Checkpoint Validation
  const prevT = kart.trackT;
  kart.trackT = proj.t;
  const quarter = Math.floor(proj.t * 4);
  if (quarter === kart.maxCheckpoint + 1) {
    kart.maxCheckpoint = quarter;
  }
  if (prevT > 0.82 && proj.t < 0.18 && kart.maxCheckpoint >= 3 && !kart.finished) {
    kart.lap += 1;
    kart.maxCheckpoint = 0;
    if (kart.lap > totalLaps) {
      kart.finished = true;
      kart.finishTimeMs = elapsedRaceMs;
      cb.onFinish(kart);
    } else {
      cb.onLapComplete(kart, kart.lap);
    }
  }
  kart.totalProgress =
    kart.lap - 1 + (kart.maxCheckpoint === 0 && proj.t > 0.85 ? proj.t - 1 : proj.t);

  // Nitro Boost Pad interaction
  if (proj.onBoostPad && kart.padCooldown <= 0) {
    kart.padCooldown = 0.7;
    kart.boostTimer = Math.max(kart.boostTimer, 1.15);
    kart.boostStrength = Math.max(kart.boostStrength, 1.24);
    kart.boostReason = 'nitro';
    cb.onBoost(kart, 1.15, 'nitro');
  }

  // Ramp Launch -> Air Boost!
  if (proj.onRamp && kart.grounded && kart.speed > 18 && kart.rampCooldown <= 0 && !proj.isInLoop) {
    kart.rampCooldown = 1.1;
    kart.hopVelY = 11.2;
    kart.grounded = false;
    kart.boostTimer = Math.max(kart.boostTimer, 1.0);
    kart.boostStrength = Math.max(kart.boostStrength, 1.2);
    kart.boostReason = 'air';
    cb.onBoost(kart, 1.05, 'air');
  }

  // Determine steering value (-1 right to +1 left in heading coordinates)
  let steerAnalog = 0;
  if (effectiveInput.steerAnalog !== undefined && Math.abs(effectiveInput.steerAnalog) > 0.02) {
    steerAnalog = THREE.MathUtils.clamp(-effectiveInput.steerAnalog, -1, 1);
  } else {
    steerAnalog = (effectiveInput.left ? 1 : 0) - (effectiveInput.right ? 1 : 0);
  }
  const steerSign = Math.abs(steerAnalog) > 0.12 ? Math.sign(steerAnalog) : 0;

  // Smart Steering Assist (gentle edge guard keeping driver on asphalt without jarring snaps)
  if (smartSteering && kart.isPlayer && kart.spinTimer <= 0 && !proj.isInLoop) {
    if (Math.abs(proj.lateral) > TRACK_HALF_WIDTH - 1.1) {
      const inwardSign = -Math.sign(proj.lateral);
      const tanAngle = Math.atan2(proj.tangent.x, proj.tangent.z);
      const err = wrapAngle(tanAngle - kart.heading);
      kart.heading = wrapAngle(kart.heading + (err * 0.45 + inwardSign * 0.65) * dt * 2.2);
      if (Math.sign(steerAnalog) === Math.sign(proj.lateral)) {
        steerAnalog *= 0.28;
      }
    }
  }

  // Hop, Cloud Flower Mid-Air Hop & Drift Initiation
  if (effectiveInput.hopJustPressed && kart.spinTimer <= 0) {
    if (kart.grounded) {
      kart.hopVelY = 6.8;
      kart.grounded = false;
      cb.onHop(kart);
      if (steerSign !== 0 && kart.speed > 10) {
        kart.driftDir = steerSign; // +1 left, -1 right
        kart.driftCharge = 0;
        kart.driftLevel = 0;
      }
    } else if (kart.cloudHopsLeft > 0) {
      kart.cloudHopsLeft -= 1;
      kart.hopVelY = 8.4;
      kart.boostTimer = Math.max(kart.boostTimer, 0.78);
      kart.boostStrength = Math.max(kart.boostStrength, 1.2);
      kart.boostReason = 'cloud';
      cb.onHop(kart);
      cb.onBoost(kart, 1.0, 'cloud');
    }
  }

  // Continuous Drift Lock-On whenever Space/Shift/Drift is held while turning!
  if (
    effectiveInput.hop &&
    kart.driftDir === 0 &&
    kart.speed > 10 &&
    steerSign !== 0 &&
    kart.spinTimer <= 0
  ) {
    kart.driftDir = steerSign;
    kart.driftCharge = 0;
    kart.driftLevel = 0;
  }

  // Hop vertical gravity
  if (!kart.grounded || kart.hopY > 0) {
    const grav = kart.beeTimer > 0 ? 18 : 28;
    kart.hopVelY -= grav * dt;
    kart.hopY += kart.hopVelY * dt;
    if (kart.hopY <= 0) {
      kart.hopY = 0;
      kart.hopVelY = 0;
      kart.grounded = true;
    }
  }

  // Active Drift charging & Level-based Nitro release
  if (kart.driftDir !== 0) {
    if (!effectiveInput.hop || kart.speed < 10 || kart.spinTimer > 0) {
      if (kart.driftLevel > 0) {
        const durations = [0, 0.78, 1.28, 1.8];
        const strengths = [1, 1.16, 1.23, 1.32];
        kart.boostTimer = Math.max(kart.boostTimer, durations[kart.driftLevel]);
        kart.boostStrength = Math.max(kart.boostStrength, strengths[kart.driftLevel]);
        kart.boostReason = 'drift';
        cb.onBoost(kart, 0.85 + kart.driftLevel * 0.18, 'drift');
      }
      kart.driftDir = 0;
      kart.driftCharge = 0;
      kart.driftLevel = 0;
    } else {
      const inwardBonus = steerSign === kart.driftDir ? 1.55 : 0.82;
      kart.driftCharge += dt * inwardBonus;
      const prevLv = kart.driftLevel;
      if (kart.driftCharge >= 2.25) kart.driftLevel = 3;
      else if (kart.driftCharge >= 1.32) kart.driftLevel = 2;
      else if (kart.driftCharge >= 0.52) kart.driftLevel = 1;
      if (kart.driftLevel > prevLv) {
        cb.onDriftLevel(kart, kart.driftLevel);
      }
    }
  }

  // Steering & Heading integration
  const speedSteerScale = Math.min(1, Math.abs(kart.speed) / 11);
  const reverseSign = kart.speed < -0.5 ? -1 : 1;
  if (kart.spinTimer <= 0) {
    if (kart.driftDir !== 0) {
      const driftTurn = kart.driftDir * turnRate * 0.9 + steerAnalog * turnRate * 0.55;
      kart.heading = wrapAngle(kart.heading + driftTurn * dt);
      kart.steerVisual = THREE.MathUtils.lerp(
        kart.steerVisual,
        kart.driftDir * 0.58 + steerAnalog * 0.22,
        dt * 10
      );
    } else {
      kart.heading = wrapAngle(
        kart.heading + steerAnalog * turnRate * speedSteerScale * reverseSign * dt
      );
      kart.steerVisual = THREE.MathUtils.lerp(kart.steerVisual, steerAnalog * 0.45, dt * 12);
    }
  }

  // Forward speed & surface drag
  const ignoresOffroad =
    kart.boostTimer > 0 ||
    kart.starTimer > 0 ||
    kart.drillTimer > 0 ||
    kart.beeTimer > 0 ||
    kart.elephantTimer > 0;
  const isOffroad = proj.surface === 'offroad' && !ignoresOffroad;
  let maxSpd = baseTopSpeed;
  if (!kart.isPlayer && !kart.finished && !isTimeTrial) {
    const gap = playerProgress - kart.totalProgress;
    const rubber = THREE.MathUtils.clamp(gap * 7.5, -3.5, 4.2);
    maxSpd += rubber;
  }
  if (kart.starTimer > 0) maxSpd *= 1.25;
  else if (kart.boostTimer > 0) maxSpd *= kart.boostStrength;
  if (kart.bellTimer > 0) maxSpd *= 1.14;
  if (kart.elephantTimer > 0) maxSpd *= 1.12;
  if (kart.drillTimer > 0 || kart.beeTimer > 0) maxSpd *= 1.08;
  if (kart.cloneActive) maxSpd *= 1.09;
  if (kart.poisonTimer > 0) maxSpd *= 0.72;
  if (isOffroad) maxSpd *= 0.66;

  if (kart.spinTimer > 0) {
    kart.speed = THREE.MathUtils.lerp(kart.speed, 0, dt * 4.5);
  } else if (effectiveInput.throttle) {
    const accelMul = kart.boostTimer > 0 || kart.starTimer > 0 ? 2.0 : 1.0;
    kart.speed = Math.min(maxSpd, kart.speed + accelRate * accelMul * dt);
  } else if (effectiveInput.brake) {
    if (kart.speed > 2) {
      kart.speed = Math.max(0, kart.speed - accelRate * 2.1 * dt);
    } else {
      kart.speed = Math.max(-14, kart.speed - accelRate * 0.85 * dt);
    }
  } else {
    kart.speed = THREE.MathUtils.lerp(kart.speed, 0, dt * 1.6);
  }

  if (kart.boostTimer > 0 && kart.speed < maxSpd * 0.92) {
    kart.speed = THREE.MathUtils.lerp(kart.speed, maxSpd, dt * 5.2);
  }

  let postProj: TrackProjection;
  const wallLimit = BARRIER_HALF_WIDTH - 1.35;

  if (proj.isInLoop) {
    // Anti-gravity 360-degree vertical loop adhesion & steering
    if (!wasInLoop) {
      const flatHeading = Math.atan2(proj.tangent.x, proj.tangent.z);
      kart.loopRelSteer = THREE.MathUtils.clamp(wrapAngle(kart.heading - flatHeading), -0.45, 0.45);
    }
    if (kart.speed >= 0 && kart.speed < 28) {
      kart.speed = Math.max(kart.speed, 28);
    }
    kart.loopRelSteer = THREE.MathUtils.clamp(
      kart.loopRelSteer + steerAnalog * turnRate * 0.55 * dt,
      -0.48,
      0.48
    );
    kart.loopRelSteer = THREE.MathUtils.lerp(kart.loopRelSteer, 0, dt * 1.2);

    const cosL = Math.cos(kart.loopRelSteer);
    const sinL = Math.sin(kart.loopRelSteer);
    const moveX = (proj.tangent.x * cosL - proj.right.x * sinL) * kart.speed * dt;
    const moveY = (proj.tangent.y * cosL - proj.right.y * sinL) * kart.speed * dt;
    const moveZ = (proj.tangent.z * cosL - proj.right.z * sinL) * kart.speed * dt;

    kart.x += moveX;
    kart.y += moveY;
    kart.z += moveZ;
    kart.wheelAngle += kart.speed * dt * 2.3;

    postProj = track.projectOnTrack(kart.x, kart.z, kart.trackIndex, kart.y);
    const clampedLat = THREE.MathUtils.clamp(postProj.lateral, -(wallLimit - 0.15), wallLimit - 0.15);
    if (Math.abs(postProj.lateral) > wallLimit && Math.abs(kart.speed) > 12) {
      cb.onWallScrape?.(kart, Math.sign(postProj.lateral));
      kart.speed *= 0.94;
    }

    kart.x = postProj.point.x + postProj.right.x * clampedLat;
    kart.y = postProj.point.y + postProj.right.y * clampedLat;
    kart.z = postProj.point.z + postProj.right.z * clampedLat;
    kart.trackIndex = postProj.sampleIndex;

    const horizLen = Math.hypot(postProj.tangent.x, postProj.tangent.z);
    if (postProj.up.y > 0.3 && horizLen > 0.35) {
      kart.heading = wrapAngle(Math.atan2(postProj.tangent.x, postProj.tangent.z) + kart.loopRelSteer);
    }
  } else {
    // Standard 3D Road & Elevation Motion
    kart.x += Math.sin(kart.heading) * kart.speed * dt;
    kart.z += Math.cos(kart.heading) * kart.speed * dt;
    kart.wheelAngle += kart.speed * dt * 2.3;

    postProj = track.projectOnTrack(kart.x, kart.z, kart.trackIndex, kart.y);
    kart.trackIndex = postProj.sampleIndex;

    if (wasInLoop && !postProj.isInLoop) {
      const exitTanAngle = Math.atan2(postProj.tangent.x, postProj.tangent.z);
      kart.heading = wrapAngle(exitTanAngle + kart.loopRelSteer * 0.5);
      kart.loopRelSteer = 0;
    }

    kart.y = Math.max(postProj.point.y, THREE.MathUtils.lerp(kart.y, postProj.point.y, dt * 16));

    // Clean Wall Bounce & Separation (Zero Magnetism / Instant Push-Off)
    if (Math.abs(postProj.lateral) > wallLimit) {
      const sign = Math.sign(postProj.lateral);
      const safeLat = sign * (wallLimit - 0.25);
      kart.x = postProj.point.x + postProj.right.x * safeLat;
      kart.z = postProj.point.z + postProj.right.z * safeLat;

      const fwdX = Math.sin(kart.heading);
      const fwdZ = Math.cos(kart.heading);
      const tangentAngle = Math.atan2(postProj.tangent.x, postProj.tangent.z);
      const pushAwayAngle = tangentAngle - sign * 0.45;
      kart.heading = wrapAngle(THREE.MathUtils.lerp(kart.heading, pushAwayAngle, 0.35));
      kart.speed = Math.max(6, Math.abs(kart.speed) * 0.78);
      if (Math.abs(kart.speed) > 10) {
        cb.onWallScrape?.(kart, sign);
      }
    }
  }

  kart.upX = THREE.MathUtils.lerp(kart.upX, postProj.up.x, Math.min(1, dt * 14));
  kart.upY = THREE.MathUtils.lerp(kart.upY, postProj.up.y, Math.min(1, dt * 14));
  kart.upZ = THREE.MathUtils.lerp(kart.upZ, postProj.up.z, Math.min(1, dt * 14));
  const upLen = Math.hypot(kart.upX, kart.upY, kart.upZ) || 1;
  kart.upX /= upLen;
  kart.upY /= upLen;
  kart.upZ /= upLen;
  kart.tanX = postProj.tangent.x;
  kart.tanY = postProj.tangent.y;
  kart.tanZ = postProj.tangent.z;
  kart.inLoop = postProj.isInLoop;

  // Environmental Track Hazards (Patrolling Bumpers & Oil Slicks)
  if (kart.hazardCooldown <= 0 && kart.hopY < 1.35) {
    for (const hz of track.trackHazards) {
      const dx = kart.x - hz.x;
      const dz = kart.z - hz.z;
      const hitR = hz.radius + 1.1;
      if (dx * dx + dz * dz < hitR * hitR && Math.abs(kart.y - hz.y) < 2.2) {
        kart.hazardCooldown = 0.9;
        if (hz.kind === 'bumper') {
          const dist = Math.max(0.1, Math.hypot(dx, dz));
          kart.x = hz.x + (dx / dist) * (hitR + 0.5);
          kart.z = hz.z + (dz / dist) * (hitR + 0.5);
          kart.speed = Math.max(10, Math.abs(kart.speed) * 0.48);
          applyKartShieldOrSpin(kart, 'track_bumper', 'bumper', cb, 0.72);
        } else if (hz.kind === 'oil') {
          if (kart.boostTimer <= 0) {
            applyKartShieldOrSpin(kart, 'track_oil', 'oil', cb, 0.95);
          }
        }
        break;
      }
    }
  }

  // Item Box Pickup check
  for (const box of track.itemBoxes) {
    if (box.respawnTimer > 0) continue;
    const dx = kart.x - box.position.x;
    const dy = kart.y - box.position.y;
    const dz = kart.z - box.position.z;
    if (dx * dx + dz * dz < 4.4 && Math.abs(dy) < 3.2) {
      box.respawnTimer = 4.2;
      box.mesh.visible = false;
      if (kart.heldItem === 'none') {
        const item = rollItemForRank(kart.rank, isTimeTrial);
        kart.heldItem = item;
        kart.heldSeconds = 0;
        kart.rouletteTimer = 0.85;
        cb.onItemPickup(kart, item);
      }
    }
  }

  // Use Held Item (manual trigger OR Auto-Use Item option)
  const shouldAutoFire =
    autoUseItem && kart.isPlayer && kart.heldItem !== 'none' && kart.rouletteTimer <= 0 && kart.heldSeconds >= 0.85;
  if (
    (effectiveInput.useItemJustPressed || shouldAutoFire) &&
    kart.heldItem !== 'none' &&
    kart.rouletteTimer <= 0.15
  ) {
    const used = kart.heldItem;
    kart.heldItem = 'none';
    kart.heldSeconds = 0;

    switch (used) {
      case 'mushroom':
        kart.boostTimer = 1.45;
        kart.boostStrength = 1.28;
        kart.boostReason = 'mushroom';
        cb.onBoost(kart, 1.2, 'mushroom');
        break;
      case 'star':
        kart.starTimer = 6.5;
        kart.boostReason = 'star';
        cb.onBoost(kart, 1.25, 'star');
        break;
      case 'super_bell':
        kart.bellTimer = 5.5;
        kart.boostTimer = Math.max(kart.boostTimer, 1.2);
        kart.boostStrength = Math.max(kart.boostStrength, 1.2);
        kart.boostReason = 'bell';
        cb.onBoost(kart, 1.15, 'bell');
        break;
      case 'p_balloon':
        kart.shieldCount = 3;
        break;
      case 'mini_mushroom':
        kart.miniTimer = 6.5;
        kart.boostTimer = Math.max(kart.boostTimer, 0.9);
        kart.boostStrength = Math.max(kart.boostStrength, 1.18);
        kart.boostReason = 'mushroom';
        cb.onBoost(kart, 1.05, 'mushroom');
        break;
      case 'double_cherry':
        kart.cloneTimer = 8.0;
        kart.cloneActive = true;
        break;
      case 'bee_mushroom':
        kart.beeTimer = 6.0;
        break;
      case 'elephant_fruit':
        kart.elephantTimer = 5.5;
        cb.onElephantShockwave?.(kart);
        break;
      case 'drill_mushroom':
        kart.drillTimer = 6.0;
        kart.boostTimer = Math.max(kart.boostTimer, 1.1);
        kart.boostStrength = Math.max(kart.boostStrength, 1.2);
        kart.boostReason = 'mushroom';
        cb.onBoost(kart, 1.1, 'mushroom');
        break;
      case 'cannon_box':
        kart.cannonBoxTimer = 5.5;
        kart.cannonCooldown = 0.05;
        break;
      case 'cloud_flower':
        kart.cloudHopsLeft = 3;
        kart.hopVelY = Math.max(kart.hopVelY, 8.2);
        kart.grounded = false;
        kart.boostTimer = Math.max(kart.boostTimer, 0.78);
        kart.boostStrength = Math.max(kart.boostStrength, 1.18);
        kart.boostReason = 'cloud';
        cb.onBoost(kart, 1.0, 'cloud');
        break;
      default:
        // projectile / hazard items handled in cb.onItemUse (shell, banana, golden_flower, blue_shell, purple_shell)
        break;
    }

    cb.onItemUse(kart, used);
  }

  return postProj;
}

function computeAiInput(kart: KartPhysicsState, track: StadiumTrack, _playerProgress: number): KartInputState {
  const lookAheadIdx = (kart.trackIndex + 10) % SAMPLE_COUNT;
  const targetSample = track.samples[lookAheadIdx];
  const tx = targetSample.point.x + targetSample.right.x * kart.aiLaneOffset;
  const tz = targetSample.point.z + targetSample.right.z * kart.aiLaneOffset;

  const desiredAngle = Math.atan2(tx - kart.x, tz - kart.z);
  const diff = wrapAngle(desiredAngle - kart.heading);

  const shouldDrift = Math.abs(diff) > 0.34 && kart.speed > 24 && !kart.inLoop;
  const useItem =
    kart.heldItem !== 'none' &&
    kart.rouletteTimer <= 0 &&
    Math.random() < 0.025;

  return {
    throttle: true,
    brake: false,
    left: diff > 0.07,
    right: diff < -0.07,
    hop: shouldDrift,
    hopJustPressed: shouldDrift && kart.driftDir === 0 && kart.grounded && Math.random() < 0.25,
    useItemJustPressed: useItem,
  };
}

export function resolveKartCollisions(karts: KartPhysicsState[], cb: PhysicsCallbacks): void {
  for (let i = 0; i < karts.length; i++) {
    for (let j = i + 1; j < karts.length; j++) {
      const a = karts[i];
      const b = karts[j];
      if (Math.abs(a.y - b.y) > 2.6) continue;

      const minDist = 1.25 * (a.scaleFactor + b.scaleFactor);
      const minDistSq = minDist * minDist;

      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const d2 = dx * dx + dz * dz;
      if (d2 > 0.0001 && d2 < minDistSq) {
        const d = Math.sqrt(d2);
        const nx = dx / d;
        const nz = dz / d;
        const overlap = minDist - d;

        const wA =
          THREE.MathUtils.clamp(a.spec.stats.weight + a.vehicle.deltas.weight, 25, 100) *
          (a.elephantTimer > 0 ? 2.2 : a.miniTimer > 0 ? 0.55 : 1);
        const wB =
          THREE.MathUtils.clamp(b.spec.stats.weight + b.vehicle.deltas.weight, 25, 100) *
          (b.elephantTimer > 0 ? 2.2 : b.miniTimer > 0 ? 0.55 : 1);
        const ratioA = wB / (wA + wB);
        const ratioB = wA / (wA + wB);

        a.x -= nx * overlap * ratioA * 1.15;
        a.z -= nz * overlap * ratioA * 1.15;
        b.x += nx * overlap * ratioB * 1.15;
        b.z += nz * overlap * ratioB * 1.15;

        if (overlap > 0.1) {
          a.speed *= 0.96;
          b.speed *= 0.96;
          if (a.grounded && a.hopVelY <= 0) {
            a.hopVelY = Math.max(a.hopVelY, 2.8);
            a.grounded = false;
          }
          if (b.grounded && b.hopVelY <= 0) {
            b.hopVelY = Math.max(b.hopVelY, 2.8);
            b.grounded = false;
          }
        }

        if (a.starTimer > 0 && b.starTimer <= 0) {
          applyKartShieldOrSpin(b, a.id, 'star', cb, 1.2);
        } else if (b.starTimer > 0 && a.starTimer <= 0) {
          applyKartShieldOrSpin(a, b.id, 'star', cb, 1.2);
        } else if (a.elephantTimer > 0 && b.elephantTimer <= 0) {
          applyKartShieldOrSpin(b, a.id, 'elephant_wave', cb, 1.15);
        } else if (b.elephantTimer > 0 && a.elephantTimer <= 0) {
          applyKartShieldOrSpin(a, b.id, 'elephant_wave', cb, 1.15);
        } else if (a.bellTimer > 0 && b.bellTimer <= 0) {
          applyKartShieldOrSpin(b, a.id, 'bumper', cb, 0.85);
        } else if (b.bellTimer > 0 && a.bellTimer <= 0) {
          applyKartShieldOrSpin(a, b.id, 'bumper', cb, 0.85);
        } else {
          cb.onBump(a, b);
        }
      }
    }
  }
}

export function updateStandings(karts: KartPhysicsState[]): void {
  const sorted = [...karts].sort((a, b) => {
    if (a.finished && b.finished) return a.finishTimeMs - b.finishTimeMs;
    if (a.finished) return -1;
    if (b.finished) return 1;
    return b.totalProgress - a.totalProgress;
  });
  sorted.forEach((k, idx) => {
    k.rank = idx + 1;
  });
}
