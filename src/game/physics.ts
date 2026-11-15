import * as THREE from 'three';
import type { ItemKind } from '../shared/protocol.ts';
import { getRacerById, type RacerSpec } from './roster.ts';
import { getVehicleById, type VehicleId, type VehicleSpec } from './vehicles.ts';
import {
  BARRIER_HALF_WIDTH,
  SAMPLE_COUNT,
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

export type BoostReason = 'drift' | 'nitro' | 'air' | 'mushroom' | 'star';

export interface KartPhysicsState {
  id: string;
  name: string;
  spec: RacerSpec;
  vehicle: VehicleSpec;
  isPlayer: boolean;
  isRemoteHuman: boolean;
  x: number;
  y: number;
  z: number;
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
  spinTimer: number;
  claimSpinTimer: number;
  heldItem: ItemKind;
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
  kind: 'shell' | 'banana';
  ownerId: string;
  x: number;
  y: number;
  z: number;
  vx: number;
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
  onHit: (
    victim: KartPhysicsState,
    attackerId: string,
    kind: 'shell' | 'banana' | 'star' | 'bumper' | 'oil'
  ) => void;
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
  vehicleId: VehicleId | string = 'standard_kart'
): KartPhysicsState {
  const spec = getRacerById(characterId);
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
    vehicle,
    isPlayer,
    isRemoteHuman,
    x,
    y: s.point.y,
    z,
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
    spinTimer: 0,
    claimSpinTimer: 0,
    heldItem: 'none',
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
  const r = Math.random();
  if (rank <= 2) {
    if (r < 0.45) return 'banana';
    if (r < 0.85) return 'shell';
    return 'mushroom';
  }
  if (rank <= 5) {
    if (r < 0.42) return 'mushroom';
    if (r < 0.72) return 'shell';
    if (r < 0.88) return 'banana';
    return 'star';
  }
  if (r < 0.42) return 'star';
  if (r < 0.84) return 'mushroom';
  return 'shell';
}

function wrapAngle(a: number): number {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

export function stepKartPhysics(
  kart: KartPhysicsState,
  input: KartInputState,
  track: StadiumTrack,
  dt: number,
  elapsedRaceMs: number,
  playerProgress: number,
  cb: PhysicsCallbacks,
  options?: { isTimeTrial?: boolean; totalLaps?: number }
): TrackProjection {
  if (kart.isRemoteHuman) {
    return track.projectOnTrack(kart.x, kart.z, kart.trackIndex);
  }

  const isTimeTrial = options?.isTimeTrial ?? false;
  const totalLaps = options?.totalLaps ?? 3;

  let effectiveInput = input;
  if (!kart.isPlayer || kart.finished) {
    effectiveInput = computeAiInput(kart, track, playerProgress);
  }

  // Combine driver stats + chosen vehicle deltas (clamped 25..100)
  const effTopSpeed = THREE.MathUtils.clamp(kart.spec.stats.topSpeed + kart.vehicle.deltas.topSpeed, 25, 100);
  const effAccel = THREE.MathUtils.clamp(kart.spec.stats.acceleration + kart.vehicle.deltas.acceleration, 25, 100);
  const effHandling = THREE.MathUtils.clamp(kart.spec.stats.handling + kart.vehicle.deltas.handling, 25, 100);

  // Normalized arcade speed tuning (~34..42 u/s cruise -> 105..130 km/h; fair boost -> 135..170 km/h)
  const baseTopSpeed = 34 + (effTopSpeed / 100) * 8;
  const accelRate = 22 + (effAccel / 100) * 14;
  const turnRate = 1.78 + (effHandling / 100) * 0.72;

  if (kart.spinTimer > 0) kart.spinTimer = Math.max(0, kart.spinTimer - dt);
  if (kart.claimSpinTimer > 0) kart.claimSpinTimer = Math.max(0, kart.claimSpinTimer - dt);
  if (kart.boostTimer > 0) kart.boostTimer = Math.max(0, kart.boostTimer - dt);
  if (kart.starTimer > 0) kart.starTimer = Math.max(0, kart.starTimer - dt);
  if (kart.rouletteTimer > 0) {
    kart.rouletteTimer = Math.max(0, kart.rouletteTimer - dt);
    if (kart.rouletteTimer === 0 && kart.heldItem !== 'none') {
      kart.claimSpinTimer = 0.52;
      cb.onItemClaim?.(kart, kart.heldItem);
    }
  }
  if (kart.padCooldown > 0) kart.padCooldown = Math.max(0, kart.padCooldown - dt);
  if (kart.rampCooldown > 0) kart.rampCooldown = Math.max(0, kart.rampCooldown - dt);
  if (kart.hazardCooldown > 0) kart.hazardCooldown = Math.max(0, kart.hazardCooldown - dt);

  const proj = track.projectOnTrack(kart.x, kart.z, kart.trackIndex);
  kart.trackIndex = proj.sampleIndex;

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
    kart.boostTimer = Math.max(kart.boostTimer, 1.1);
    kart.boostStrength = Math.max(kart.boostStrength, 1.24);
    kart.boostReason = 'nitro';
    cb.onBoost(kart, 1.1, 'nitro');
  }

  // Ramp Launch -> Air Boost!
  if (proj.onRamp && kart.grounded && kart.speed > 18 && kart.rampCooldown <= 0) {
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
    // steerAnalog input is -1 (left) to +1 (right); heading increases counter-clockwise (+left, -right)
    steerAnalog = THREE.MathUtils.clamp(-effectiveInput.steerAnalog, -1, 1);
  } else {
    steerAnalog = (effectiveInput.left ? 1 : 0) - (effectiveInput.right ? 1 : 0);
  }
  const steerSign = Math.abs(steerAnalog) > 0.18 ? Math.sign(steerAnalog) : 0;

  // Hop & Drift Initiation
  if (effectiveInput.hopJustPressed && kart.grounded && kart.spinTimer <= 0) {
    kart.hopVelY = 7.2;
    kart.grounded = false;
    cb.onHop(kart);
    if (steerSign !== 0 && kart.speed > 14) {
      kart.driftDir = steerSign; // +1 left, -1 right
      kart.driftCharge = 0;
      kart.driftLevel = 0;
    }
  }

  // Hop vertical gravity
  if (!kart.grounded || kart.hopY > 0) {
    kart.hopVelY -= 28 * dt;
    kart.hopY += kart.hopVelY * dt;
    if (kart.hopY <= 0) {
      kart.hopY = 0;
      kart.hopVelY = 0;
      kart.grounded = true;
    }
  }

  // Active Drift charging & Level-based Nitro release
  if (kart.driftDir !== 0) {
    if (!effectiveInput.hop || kart.speed < 12 || kart.spinTimer > 0) {
      if (kart.driftLevel > 0) {
        const durations = [0, 0.75, 1.25, 1.75];
        const strengths = [1, 1.15, 1.22, 1.3];
        kart.boostTimer = Math.max(kart.boostTimer, durations[kart.driftLevel]);
        kart.boostStrength = Math.max(kart.boostStrength, strengths[kart.driftLevel]);
        kart.boostReason = 'drift';
        cb.onBoost(kart, 0.85 + kart.driftLevel * 0.18, 'drift');
      }
      kart.driftDir = 0;
      kart.driftCharge = 0;
      kart.driftLevel = 0;
    } else {
      const inwardBonus = steerSign === kart.driftDir ? 1.5 : 0.78;
      kart.driftCharge += dt * inwardBonus;
      const prevLv = kart.driftLevel;
      if (kart.driftCharge >= 2.4) kart.driftLevel = 3;
      else if (kart.driftCharge >= 1.4) kart.driftLevel = 2;
      else if (kart.driftCharge >= 0.58) kart.driftLevel = 1;
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
      const driftTurn = kart.driftDir * turnRate * 0.92 + steerAnalog * turnRate * 0.54;
      kart.heading += driftTurn * dt;
      kart.steerVisual = THREE.MathUtils.lerp(
        kart.steerVisual,
        kart.driftDir * 0.55 + steerAnalog * 0.22,
        dt * 10
      );
    } else {
      kart.heading += steerAnalog * turnRate * speedSteerScale * reverseSign * dt;
      kart.steerVisual = THREE.MathUtils.lerp(kart.steerVisual, steerAnalog * 0.45, dt * 12);
    }
  }

  // Forward speed & surface drag
  const isOffroad = proj.surface === 'offroad' && kart.boostTimer <= 0 && kart.starTimer <= 0;
  let maxSpd = baseTopSpeed;
  if (!kart.isPlayer && !kart.finished && !isTimeTrial) {
    const gap = playerProgress - kart.totalProgress;
    const rubber = THREE.MathUtils.clamp(gap * 7.5, -3.5, 4.2);
    maxSpd += rubber;
  }
  if (kart.starTimer > 0) maxSpd *= 1.24;
  else if (kart.boostTimer > 0) maxSpd *= kart.boostStrength;
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

  // Integrate XZ motion
  kart.x += Math.sin(kart.heading) * kart.speed * dt;
  kart.z += Math.cos(kart.heading) * kart.speed * dt;
  kart.wheelAngle += kart.speed * dt * 2.3;

  const postProj = track.projectOnTrack(kart.x, kart.z, kart.trackIndex);
  kart.y = Math.max(postProj.point.y, THREE.MathUtils.lerp(kart.y, postProj.point.y, dt * 16));

  // Anti-Stuck Smooth Wall-Slide Boundary Resolution against 3D Dividers (strictly zero tire/pod clipping)
  const wallLimit = BARRIER_HALF_WIDTH - 1.35;
  if (Math.abs(postProj.lateral) > wallLimit) {
    const sign = Math.sign(postProj.lateral);
    const safeLat = sign * (wallLimit - 0.15);
    kart.x = postProj.point.x + postProj.right.x * safeLat;
    kart.z = postProj.point.z + postProj.right.z * safeLat;

    const fwdX = Math.sin(kart.heading);
    const fwdZ = Math.cos(kart.heading);
    const tangentDot = fwdX * postProj.tangent.x + fwdZ * postProj.tangent.z;
    const tangentDir = tangentDot >= -0.15 ? 1 : -1;
    const tangentAngle = Math.atan2(
      tangentDir * postProj.tangent.x,
      tangentDir * postProj.tangent.z
    );
    const diff = wrapAngle(tangentAngle - kart.heading);
    kart.heading = wrapAngle(kart.heading + diff * Math.min(1, 0.4 + dt * 11));
    kart.speed *= 0.88;
    if (Math.abs(kart.speed) > 12) {
      cb.onWallScrape?.(kart, sign);
    }
  }

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
          if (kart.starTimer <= 0 && kart.spinTimer <= 0) {
            kart.spinTimer = 0.72;
            cb.onHit(kart, 'track_bumper', 'bumper');
          }
        } else if (hz.kind === 'oil') {
          if (kart.starTimer <= 0 && kart.boostTimer <= 0 && kart.spinTimer <= 0) {
            kart.spinTimer = 0.95;
            cb.onHit(kart, 'track_oil', 'oil');
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
    const dz = kart.z - box.position.z;
    if (dx * dx + dz * dz < 4.2) {
      box.respawnTimer = 4.2;
      box.mesh.visible = false;
      if (kart.heldItem === 'none') {
        const item = rollItemForRank(kart.rank, isTimeTrial);
        kart.heldItem = item;
        kart.rouletteTimer = 0.85;
        cb.onItemPickup(kart, item);
      }
    }
  }

  // Use Held Item
  if (effectiveInput.useItemJustPressed && kart.heldItem !== 'none' && kart.rouletteTimer <= 0.15) {
    const used = kart.heldItem;
    kart.heldItem = 'none';
    if (used === 'mushroom') {
      kart.boostTimer = 1.4;
      kart.boostStrength = 1.28;
      kart.boostReason = 'mushroom';
      cb.onBoost(kart, 1.2, 'mushroom');
    } else if (used === 'star') {
      kart.starTimer = 6.0;
      kart.boostReason = 'star';
      cb.onBoost(kart, 1.25, 'star');
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

  const shouldDrift = Math.abs(diff) > 0.34 && kart.speed > 24;
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
  const minDist = 2.45;
  const minDistSq = minDist * minDist;

  for (let i = 0; i < karts.length; i++) {
    for (let j = i + 1; j < karts.length; j++) {
      const a = karts[i];
      const b = karts[j];
      if (Math.abs(a.y - b.y) > 2.5) continue;

      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const d2 = dx * dx + dz * dz;
      if (d2 > 0.0001 && d2 < minDistSq) {
        const d = Math.sqrt(d2);
        const nx = dx / d;
        const nz = dz / d;
        const overlap = minDist - d;

        const wA = THREE.MathUtils.clamp(a.spec.stats.weight + a.vehicle.deltas.weight, 25, 100);
        const wB = THREE.MathUtils.clamp(b.spec.stats.weight + b.vehicle.deltas.weight, 25, 100);
        const ratioA = wB / (wA + wB);
        const ratioB = wA / (wA + wB);

        a.x -= nx * overlap * ratioA * 1.15;
        a.z -= nz * overlap * ratioA * 1.15;
        b.x += nx * overlap * ratioB * 1.15;
        b.z += nz * overlap * ratioB * 1.15;

        // Crisp arcade momentum deflection & micro suspension bounce
        if (overlap > 0.12) {
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

        if (a.starTimer > 0 && b.starTimer <= 0 && b.spinTimer <= 0) {
          b.spinTimer = 1.2;
          cb.onHit(b, a.id, 'star');
        } else if (b.starTimer > 0 && a.starTimer <= 0 && a.spinTimer <= 0) {
          a.spinTimer = 1.2;
          cb.onHit(a, b.id, 'star');
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
