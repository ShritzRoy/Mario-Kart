import * as THREE from 'three';
import type { MapDefinition } from './maps.ts';
import { buildItemBoxMesh, buildTrackBumperMesh } from './models.ts';
import { ROSTER } from './roster.ts';
import {
  createJumbotronTexture,
  updateJumbotronCanvas,
  type ProceduralTextureSet,
} from './textures.ts';

export interface TrackSample {
  t: number;
  point: THREE.Vector3;
  tangent: THREE.Vector3;
  right: THREE.Vector3;
  up: THREE.Vector3;
  isInLoop: boolean;
}

export interface TrackProjection {
  sampleIndex: number;
  t: number;
  point: THREE.Vector3;
  tangent: THREE.Vector3;
  right: THREE.Vector3;
  up: THREE.Vector3;
  isInLoop: boolean;
  lateral: number;
  distance: number;
  surface: 'asphalt' | 'kerb' | 'offroad';
  onBoostPad: boolean;
  onRamp: boolean;
}

export interface ItemBoxNode {
  id: number;
  position: THREE.Vector3;
  mesh: THREE.Group;
  respawnTimer: number;
}

export interface BoostPadNode {
  tCenter: number;
  lateralOffset: number;
  width: number;
  tHalfSpan: number;
}

export interface TrackHazardObstacle {
  kind: 'bumper' | 'oil';
  t: number;
  lateralAmp: number;
  speed: number;
  x: number;
  y: number;
  z: number;
  radius: number;
  mesh: THREE.Object3D;
}

export const TRACK_HALF_WIDTH = 13.0;
export const KERB_WIDTH = 2.0;
export const BARRIER_HALF_WIDTH = 16.4;
export const SAMPLE_COUNT = 560;

export class StadiumTrack {
  public readonly group = new THREE.Group();
  public readonly mapDef: MapDefinition;
  public readonly curve: THREE.CatmullRomCurve3;
  public readonly samples: TrackSample[] = [];
  public readonly itemBoxes: ItemBoxNode[] = [];
  public readonly boostPads: BoostPadNode[] = [];
  public readonly rampTCenters: number[];
  public readonly trackHazards: TrackHazardObstacle[] = [];

  public readonly startLightMeshes: THREE.Mesh[] = [];
  public readonly paddockGroup = new THREE.Group();
  public readonly paddockTurntable = new THREE.Group();

  private spectatorsMesh: THREE.InstancedMesh | null = null;
  private spectatorHeadMesh: THREE.InstancedMesh | null = null;
  private spectatorCapMesh: THREE.InstancedMesh | null = null;
  private spectatorSpotMesh: THREE.InstancedMesh | null = null;
  private spectatorCount = 0;
  private spectatorBaseCoords: { x: number; y: number; z: number; yaw: number; scale: number }[] = [];
  private spectatorPhases: Float32Array = new Float32Array(0);
  private crowdSpotOffsets = [
    new THREE.Vector3(0, 1.56, 0.42),
    new THREE.Vector3(-0.42, 1.48, -0.22),
    new THREE.Vector3(0.42, 1.48, -0.22),
  ];
  private loopCx = 0;
  private loopCz = 0;
  private holoBillboards: THREE.Mesh[] = [];
  private bannerFlags: THREE.Mesh[] = [];
  private searchlights: THREE.Group[] = [];
  private clouds: THREE.Group[] = [];
  private palmCrowns: THREE.Group[] = [];
  private floatingBalloons: { group: THREE.Group; baseY: number; phase: number }[] = [];
  private fountainRings: THREE.Mesh[] = [];
  private paddockBackdropTex: THREE.CanvasTexture | null = null;
  private confettiPoints: THREE.Points | null = null;
  private confettiVel: Float32Array = new Float32Array(0);
  private jumbotrons: {
    ctx: CanvasRenderingContext2D;
    texture: THREE.CanvasTexture;
  }[] = [];
  private boostPadMat: THREE.MeshStandardMaterial;
  private skyUniforms: {
    uTop: { value: THREE.Color };
    uMid: { value: THREE.Color };
    uHorizon: { value: THREE.Color };
  } | null = null;
  private cloudMat: THREE.MeshBasicMaterial | null = null;
  private starMat: THREE.PointsMaterial | null = null;
  private roadMat: THREE.MeshStandardMaterial | null = null;
  private placedProps: { x: number; z: number; r: number }[] = [];
  private disposables: { dispose: () => void }[] = [];

  private _tmpMat = new THREE.Matrix4();
  private _tmpPos = new THREE.Vector3();
  private _tmpQuat = new THREE.Quaternion();
  private _tmpScale = new THREE.Vector3();
  private _upAxis = new THREE.Vector3(0, 1, 0);

  constructor(private textures: ProceduralTextureSet, mapDef: MapDefinition) {
    this.mapDef = mapDef;
    this.rampTCenters = mapDef.rampTCenters;

    this.curve = new THREE.CatmullRomCurve3(mapDef.controlPoints, true, 'centripetal');
    this.sampleCurve();

    this.boostPadMat = new THREE.MeshStandardMaterial({
      map: this.textures.boostPadMap,
      emissive: '#38bdf8',
      emissiveMap: this.textures.boostPadMap,
      emissiveIntensity: 1.4,
      roughness: 0.22,
      metalness: 0.25,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
    this.disposables.push(this.boostPadMat);

    this.buildSkyDome();
    this.buildGroundAndInfield();
    this.buildSolidRoadAndKerbs();
    this.build3DDividerBoundaries();
    this.buildElevatedSupportsAndRamps();
    this.buildStartFinishGantry();
    this.buildBoostPads();
    this.buildItemBoxes();
    this.buildEnvironmentalHazards();

    // Place signature SHRITIZ carved boulder monument & Mushroom Toad Bleachers beside the start straight on EVERY map
    this.buildStartLineShritizMonument();
    const crowdCoords: { x: number; y: number; z: number; yaw: number; scale: number }[] = [];
    this.buildStartStraightBleachers(crowdCoords);

    if (mapDef.theme === 'plaza') {
      this.buildShritizRockArch(0.57, true);
      this.buildCoconutPlazaEnvironment();
      this.buildPlazaFountainAndParasols();
    } else if (mapDef.theme === 'stadium') {
      this.buildStadiumColiseum(crowdCoords);
      this.buildTunnelAndTracksideBoards();
      this.buildFloodlightsAndJumbotrons();
      this.buildConfetti();
    } else if (mapDef.theme === 'sunlit') {
      this.buildSunlitCountrysideProps();
      this.buildHotAirBalloons();
      this.buildTunnelAndTracksideBoards();
    } else {
      this.buildSkylineTowersAndProps();
      this.buildHotAirBalloons();
      this.buildTunnelAndTracksideBoards();
    }

    this.buildToadCrowdMeshes(crowdCoords);

    // Trackside sculpted rocks & foliage added after hero landmarks so nothing overlaps
    this.buildTracksideRocksAndCliffs();
    this.buildPaddockStage();
  }

  private minTrackDistance(x: number, z: number): number {
    let minD2 = Infinity;
    for (let i = 0; i < this.samples.length; i++) {
      const p = this.samples[i].point;
      const dx = x - p.x;
      const dz = z - p.z;
      const d2 = dx * dx + dz * dz;
      if (d2 < minD2) minD2 = d2;
    }
    return Math.sqrt(minD2);
  }

  private minDistanceToOtherTrackSegment(x: number, z: number, originIdx: number, windowSamples = 22): number {
    let minD2 = Infinity;
    for (let i = 0; i < this.samples.length; i++) {
      const diff = Math.abs(i - originIdx);
      const wrapDiff = Math.min(diff, SAMPLE_COUNT - diff);
      if (wrapDiff <= windowSamples) continue;
      const p = this.samples[i].point;
      const dx = x - p.x;
      const dz = z - p.z;
      const d2 = dx * dx + dz * dz;
      if (d2 < minD2) minD2 = d2;
    }
    return Math.sqrt(minD2);
  }

  private isOutwardFromLoop(x: number, z: number, s: TrackSample): boolean {
    const outX = s.point.x - this.loopCx;
    const outZ = s.point.z - this.loopCz;
    const relX = x - s.point.x;
    const relZ = z - s.point.z;
    return relX * outX + relZ * outZ >= 0;
  }

  private canPlaceProp(x: number, z: number, radius: number, extraTrackMargin = 4.2): boolean {
    if (this.minTrackDistance(x, z) < BARRIER_HALF_WIDTH + radius + extraTrackMargin) {
      return false;
    }
    for (let i = 0; i < this.placedProps.length; i++) {
      const p = this.placedProps[i];
      const dx = x - p.x;
      const dz = z - p.z;
      const minSep = radius + p.r;
      if (dx * dx + dz * dz < minSep * minSep) {
        return false;
      }
    }
    return true;
  }

  private reserveProp(x: number, z: number, radius: number, extraTrackMargin = 4.2): boolean {
    if (!this.canPlaceProp(x, z, radius, extraTrackMargin)) return false;
    this.placedProps.push({ x, z, r: radius });
    return true;
  }

  private sampleCurve(): void {
    const worldUp = new THREE.Vector3(0, 1, 0);
    const smoothstep = (edge0: number, edge1: number, x: number) => {
      const k = THREE.MathUtils.clamp((x - edge0) / (edge1 - edge0), 0, 1);
      return k * k * (3 - 2 * k);
    };

    const rawPoints: THREE.Vector3[] = [];
    for (let i = 0; i < SAMPLE_COUNT; i++) {
      const t = i / SAMPLE_COUNT;
      const point = this.curve.getPointAt(t);
      for (const rc of this.rampTCenters) {
        const dt = Math.abs(t - rc);
        if (dt < 0.024) {
          const factor = Math.cos((dt / 0.024) * (Math.PI / 2));
          point.y += factor * 2.6;
        }
      }
      rawPoints.push(point);
    }

    const loop = this.mapDef.loopSegment;
    const isInLoopArr = new Array<boolean>(SAMPLE_COUNT).fill(false);
    let flatFwd = new THREE.Vector3(0, 0, 1);
    let flatRight = new THREE.Vector3(-1, 0, 0);

    if (loop) {
      const idxStart = Math.floor(loop.tStart * SAMPLE_COUNT) % SAMPLE_COUNT;
      const idxEnd = Math.floor(loop.tEnd * SAMPLE_COUNT) % SAMPLE_COUNT;
      const pStart = rawPoints[idxStart].clone();
      const pEnd = rawPoints[idxEnd].clone();

      flatFwd = new THREE.Vector3(pEnd.x - pStart.x, 0, pEnd.z - pStart.z);
      const chordLen = Math.max(40, flatFwd.length());
      flatFwd.normalize();
      flatRight = new THREE.Vector3().crossVectors(flatFwd, worldUp).normalize();

      const leadWin = 0.055;
      const halfL = loop.lateralShift * 0.5;

      for (let i = 0; i < SAMPLE_COUNT; i++) {
        const t = i / SAMPLE_COUNT;
        if (t >= loop.tStart - leadWin && t < loop.tStart) {
          const k = smoothstep(loop.tStart - leadWin, loop.tStart, t);
          rawPoints[i].addScaledVector(flatRight, -halfL * k);
        } else if (t >= loop.tStart && t <= loop.tEnd) {
          const u = (t - loop.tStart) / (loop.tEnd - loop.tStart);
          const theta = u * Math.PI * 2;
          const along = chordLen * u + loop.radius * Math.sin(theta);
          const heightLift = loop.radius * (1 - Math.cos(theta));
          const latShift = THREE.MathUtils.lerp(-halfL, halfL, smoothstep(0.12, 0.88, u));
          const baseY = THREE.MathUtils.lerp(pStart.y, pEnd.y, u);

          rawPoints[i]
            .copy(pStart)
            .addScaledVector(flatFwd, along)
            .addScaledVector(flatRight, latShift);
          rawPoints[i].y = baseY + heightLift;
          isInLoopArr[i] = true;
        } else if (t > loop.tEnd && t <= loop.tEnd + leadWin) {
          const k = 1 - smoothstep(loop.tEnd, loop.tEnd + leadWin, t);
          rawPoints[i].addScaledVector(flatRight, halfL * k);
        }
      }
    }

    let sx = 0;
    let sz = 0;
    for (let i = 0; i < SAMPLE_COUNT; i++) {
      const t = i / SAMPLE_COUNT;
      const prev = rawPoints[(i - 1 + SAMPLE_COUNT) % SAMPLE_COUNT];
      const curr = rawPoints[i];
      const next = rawPoints[(i + 1) % SAMPLE_COUNT];

      const tangent = new THREE.Vector3().subVectors(next, prev).normalize();
      const right = new THREE.Vector3();
      const up = new THREE.Vector3();

      if (isInLoopArr[i]) {
        // Stabilized orthonormal frame around full 360 vertical loop
        right.copy(flatRight).addScaledVector(tangent, -flatRight.dot(tangent)).normalize();
        up.crossVectors(right, tangent).normalize();
      } else {
        right.crossVectors(tangent, worldUp).normalize();
        up.crossVectors(right, tangent).normalize();
      }

      sx += curr.x;
      sz += curr.z;
      this.samples.push({
        t,
        point: curr,
        tangent,
        right,
        up,
        isInLoop: isInLoopArr[i],
      });
    }
    this.loopCx = sx / SAMPLE_COUNT;
    this.loopCz = sz / SAMPLE_COUNT;
  }

  public projectOnTrack(x: number, z: number, hintIndex?: number, y?: number): TrackProjection {
    let bestIdx = 0;
    let bestDistSq = Infinity;

    if (hintIndex !== undefined && hintIndex >= 0 && hintIndex < SAMPLE_COUNT) {
      for (let offset = -36; offset <= 36; offset++) {
        const idx = (hintIndex + offset + SAMPLE_COUNT) % SAMPLE_COUNT;
        const p = this.samples[idx].point;
        const dx = x - p.x;
        const dz = z - p.z;
        const dy = y !== undefined ? y - p.y : 0;
        const d2 = dx * dx + dy * dy + dz * dz;
        if (d2 < bestDistSq) {
          bestDistSq = d2;
          bestIdx = idx;
        }
      }
      if (bestDistSq > 1150) {
        for (let i = 0; i < SAMPLE_COUNT; i++) {
          const p = this.samples[i].point;
          const dx = x - p.x;
          const dz = z - p.z;
          const dy = y !== undefined ? y - p.y : 0;
          const d2 = dx * dx + dy * dy + dz * dz;
          if (d2 < bestDistSq) {
            bestDistSq = d2;
            bestIdx = i;
          }
        }
      }
    } else {
      for (let i = 0; i < SAMPLE_COUNT; i++) {
        const p = this.samples[i].point;
        const dx = x - p.x;
        const dz = z - p.z;
        const d2 = dx * dx + dz * dz;
        if (d2 < bestDistSq) {
          bestDistSq = d2;
          bestIdx = i;
        }
      }
    }

    const s = this.samples[bestIdx];
    const dx = x - s.point.x;
    const dy = y !== undefined ? y - s.point.y : 0;
    const dz = z - s.point.z;
    const lateral = dx * s.right.x + dy * s.right.y + dz * s.right.z;
    const absLat = Math.abs(lateral);

    let surface: 'asphalt' | 'kerb' | 'offroad' = 'asphalt';
    if (absLat > TRACK_HALF_WIDTH + KERB_WIDTH * 0.75) {
      surface = 'offroad';
    } else if (absLat > TRACK_HALF_WIDTH - 0.3) {
      surface = 'kerb';
    }

    let onBoostPad = false;
    for (const bp of this.boostPads) {
      const dt = Math.min(Math.abs(s.t - bp.tCenter), 1 - Math.abs(s.t - bp.tCenter));
      if (dt < bp.tHalfSpan && Math.abs(lateral - bp.lateralOffset) < bp.width * 0.58) {
        onBoostPad = true;
        break;
      }
    }

    let onRamp = false;
    for (const rc of this.rampTCenters) {
      const dt = Math.abs(s.t - rc);
      if (dt < 0.017 && absLat < TRACK_HALF_WIDTH) {
        onRamp = true;
        break;
      }
    }

    return {
      sampleIndex: bestIdx,
      t: s.t,
      point: s.point,
      tangent: s.tangent,
      right: s.right,
      up: s.up,
      isInLoop: s.isInLoop,
      lateral,
      distance: Math.sqrt(bestDistSq),
      surface,
      onBoostPad,
      onRamp,
    };
  }

  private buildSkyDome(): void {
    const topC = new THREE.Color(this.mapDef.skyTop);
    const midC = new THREE.Color(this.mapDef.skyMid);
    const horC = new THREE.Color(this.mapDef.skyHorizon);

    this.skyUniforms = {
      uTop: { value: topC },
      uMid: { value: midC },
      uHorizon: { value: horC },
    };

    const skyGeo = new THREE.SphereGeometry(680, 32, 20);
    const skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: this.skyUniforms,
      vertexShader: `
        varying vec3 vWorldPos;
        void main() {
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorldPos = wp.xyz;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: `
        varying vec3 vWorldPos;
        uniform vec3 uTop;
        uniform vec3 uMid;
        uniform vec3 uHorizon;
        void main() {
          float h = clamp(normalize(vWorldPos).y, 0.0, 1.0);
          vec3 col = mix(uHorizon, uMid, smoothstep(0.0, 0.25, h));
          col = mix(col, uTop, smoothstep(0.24, 0.78, h));
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });
    this.group.add(new THREE.Mesh(skyGeo, skyMat));
    this.disposables.push(skyGeo, skyMat);

    // Starfield dome (visible during Night / Dusk weather)
    const starCount = 420;
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const phi = Math.acos(0.15 + Math.random() * 0.85);
      const theta = Math.random() * Math.PI * 2;
      const r = 635;
      starPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPos[i * 3 + 1] = r * Math.cos(phi);
      starPos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    const starMat = new THREE.PointsMaterial({
      color: '#f8fafc',
      size: 2.6,
      transparent: true,
      opacity: this.mapDef.theme === 'stadium' ? 0.45 : 0.0,
      depthWrite: false,
    });
    this.starMat = starMat;
    this.group.add(new THREE.Points(starGeo, starMat));
    this.disposables.push(starGeo, starMat);

    const cloudMat = new THREE.MeshBasicMaterial({
      color: this.mapDef.theme === 'stadium' ? '#cbd5e1' : '#ffffff',
      transparent: true,
      opacity: this.mapDef.theme === 'stadium' ? 0.24 : 0.94,
    });
    this.cloudMat = cloudMat;
    const puffGeo = new THREE.SphereGeometry(12, 12, 10);
    for (let i = 0; i < 18; i++) {
      const cGroup = new THREE.Group();
      const ang = (i / 18) * Math.PI * 2;
      const dist = 270 + (i % 3) * 65;
      cGroup.position.set(Math.cos(ang) * dist, 82 + (i % 4) * 16, Math.sin(ang) * dist);
      for (let p = 0; p < 3; p++) {
        const puff = new THREE.Mesh(puffGeo, cloudMat);
        puff.position.set((p - 1) * 13, p === 1 ? 4 : 0, 0);
        puff.scale.set(1.25, 0.72, 0.9);
        cGroup.add(puff);
      }
      this.group.add(cGroup);
      this.clouds.push(cGroup);
    }
    this.disposables.push(cloudMat, puffGeo);
  }

  public applyWeatherVisuals(
    skyTop: THREE.Color,
    skyMid: THREE.Color,
    skyHorizon: THREE.Color,
    wetness: number,
    nightFactor: number,
    rainFactor: number
  ): void {
    if (this.skyUniforms) {
      this.skyUniforms.uTop.value.copy(skyTop);
      this.skyUniforms.uMid.value.copy(skyMid);
      this.skyUniforms.uHorizon.value.copy(skyHorizon);
    }
    if (this.roadMat) {
      this.roadMat.roughness = THREE.MathUtils.lerp(0.72, 0.14, wetness);
      this.roadMat.metalness = THREE.MathUtils.lerp(0.05, 0.42, wetness);
    }
    if (this.starMat) {
      const baseNight = this.mapDef.theme === 'stadium' ? 0.35 : 0.0;
      this.starMat.opacity = Math.min(0.95, Math.max(baseNight, nightFactor * (1 - rainFactor * 0.85)));
    }
    if (this.cloudMat) {
      if (rainFactor > 0.2) {
        this.cloudMat.color.set('#64748b').lerp(new THREE.Color('#334155'), rainFactor * 0.65);
        this.cloudMat.opacity = THREE.MathUtils.lerp(0.85, 0.96, rainFactor);
      } else if (nightFactor > 0.3) {
        this.cloudMat.color.set('#475569');
        this.cloudMat.opacity = 0.45;
      } else {
        this.cloudMat.color.set('#ffffff').lerp(skyHorizon, 0.25);
        this.cloudMat.opacity = 0.92;
      }
    }
  }

  private buildGroundAndInfield(): void {
    const groundGeo = new THREE.CircleGeometry(740, 72);
    groundGeo.rotateX(-Math.PI / 2);
    const groundMat = new THREE.MeshStandardMaterial({
      map: this.mapDef.theme === 'plaza' ? undefined : this.textures.grassMap,
      color: this.mapDef.groundTint,
      roughness: 0.9,
      metalness: 0.02,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.position.y = -0.1;
    ground.receiveShadow = true;
    this.group.add(ground);
    this.disposables.push(groundGeo, groundMat);
  }

  private buildSolidRoadAndKerbs(): void {
    // Solid 3D Extruded Road Deck + Raised Curbs + Deep Structural Side Aprons & Underside Slab
    // Eliminates all paper-thin / "looksthrough" transparent rendering from every angle!
    const segs = SAMPLE_COUNT;
    const roadPos: number[] = [];
    const roadUV: number[] = [];
    const roadIdx: number[] = [];

    const slabPos: number[] = [];
    const slabIdx: number[] = [];

    const kerbPos: number[] = [];
    const kerbUV: number[] = [];
    const kerbIdx: number[] = [];

    const deckOuter = TRACK_HALF_WIDTH + KERB_WIDTH + 0.9;
    const deckDepth = 2.2;

    const pt = new THREE.Vector3();
    for (let i = 0; i <= segs; i++) {
      const s = this.samples[i % segs];
      const v = i / segs;

      const lPt = pt.copy(s.point).addScaledVector(s.right, -TRACK_HALF_WIDTH).addScaledVector(s.up, 0.06).clone();
      const rPt = pt.copy(s.point).addScaledVector(s.right, TRACK_HALF_WIDTH).addScaledVector(s.up, 0.06).clone();

      // Top Asphalt Surface (+0.06 along track s.up)
      roadPos.push(lPt.x, lPt.y, lPt.z, rPt.x, rPt.y, rPt.z);
      roadUV.push(0, v, 1, v);

      // Solid Concrete Road Bed Box
      const topL = pt.copy(s.point).addScaledVector(s.right, -deckOuter).addScaledVector(s.up, 0.02).clone();
      const topR = pt.copy(s.point).addScaledVector(s.right, deckOuter).addScaledVector(s.up, 0.02).clone();
      const botL = pt.copy(s.point).addScaledVector(s.right, -deckOuter).addScaledVector(s.up, -deckDepth).clone();
      const botR = pt.copy(s.point).addScaledVector(s.right, deckOuter).addScaledVector(s.up, -deckDepth).clone();
      if (!s.isInLoop) {
        botL.y = Math.min(-0.4, botL.y);
        botR.y = Math.min(-0.4, botR.y);
      }
      slabPos.push(
        topL.x, topL.y, topL.z,
        topR.x, topR.y, topR.z,
        botR.x, botR.y, botR.z,
        botL.x, botL.y, botL.z
      );

      // Raised 3D Curb Blocks aligned to s.up
      const klOut = pt.copy(s.point).addScaledVector(s.right, -(TRACK_HALF_WIDTH + KERB_WIDTH)).addScaledVector(s.up, 0.32).clone();
      const klTopIn = pt.copy(s.point).addScaledVector(s.right, -TRACK_HALF_WIDTH).addScaledVector(s.up, 0.32).clone();
      const krTopIn = pt.copy(s.point).addScaledVector(s.right, TRACK_HALF_WIDTH).addScaledVector(s.up, 0.32).clone();
      const krOut = pt.copy(s.point).addScaledVector(s.right, TRACK_HALF_WIDTH + KERB_WIDTH).addScaledVector(s.up, 0.32).clone();

      kerbPos.push(
        klOut.x, klOut.y, klOut.z,
        klTopIn.x, klTopIn.y, klTopIn.z,
        lPt.x, lPt.y - 0.01, lPt.z,
        rPt.x, rPt.y - 0.01, rPt.z,
        krTopIn.x, krTopIn.y, krTopIn.z,
        krOut.x, krOut.y, krOut.z
      );
      kerbUV.push(0, v, 0.7, v, 1, v, 1, v, 0.7, v, 0, v);

      if (i < segs) {
        const rBase = i * 2;
        roadIdx.push(rBase, rBase + 1, rBase + 2, rBase + 1, rBase + 3, rBase + 2);

        const sBase = i * 4;
        const sNext = sBase + 4;
        // Top, Right Skirt, Bottom, Left Skirt
        slabIdx.push(
          sBase, sBase + 1, sNext, sBase + 1, sNext + 1, sNext,
          sBase + 1, sBase + 2, sNext + 1, sBase + 2, sNext + 2, sNext + 1,
          sBase + 2, sBase + 3, sNext + 2, sBase + 3, sNext + 3, sNext + 2,
          sBase + 3, sBase, sNext + 3, sBase, sNext, sNext + 3
        );

        const kBase = i * 6;
        const kNext = kBase + 6;
        // Left curb top + left curb vertical face; right curb vertical face + right curb top
        kerbIdx.push(
          kBase, kBase + 1, kNext, kBase + 1, kNext + 1, kNext,
          kBase + 1, kBase + 2, kNext + 1, kBase + 2, kNext + 2, kNext + 1,
          kBase + 3, kBase + 4, kNext + 3, kBase + 4, kNext + 4, kNext + 3,
          kBase + 4, kBase + 5, kNext + 4, kBase + 5, kNext + 5, kNext + 4
        );
      }
    }

    const roadGeo = new THREE.BufferGeometry();
    roadGeo.setAttribute('position', new THREE.Float32BufferAttribute(roadPos, 3));
    roadGeo.setAttribute('uv', new THREE.Float32BufferAttribute(roadUV, 2));
    roadGeo.setIndex(roadIdx);
    roadGeo.computeVertexNormals();

    const roadMat = new THREE.MeshStandardMaterial({
      map: this.mapDef.usePlazaRoad ? this.textures.plazaAsphaltMap : this.textures.asphaltMap,
      bumpMap: this.textures.asphaltBump,
      bumpScale: 0.035,
      color: this.mapDef.asphaltTint,
      roughness: 0.72,
      metalness: 0.05,
      side: THREE.DoubleSide,
    });
    this.roadMat = roadMat;
    const roadMesh = new THREE.Mesh(roadGeo, roadMat);
    roadMesh.receiveShadow = true;
    this.group.add(roadMesh);

    const slabGeo = new THREE.BufferGeometry();
    slabGeo.setAttribute('position', new THREE.Float32BufferAttribute(slabPos, 3));
    slabGeo.setIndex(slabIdx);
    slabGeo.computeVertexNormals();
    const slabMat = new THREE.MeshStandardMaterial({
      color: this.mapDef.theme === 'plaza' ? '#d6c3a5' : '#475569',
      roughness: 0.85,
      metalness: 0.08,
      side: THREE.DoubleSide,
    });
    const slabMesh = new THREE.Mesh(slabGeo, slabMat);
    slabMesh.castShadow = true;
    slabMesh.receiveShadow = true;
    this.group.add(slabMesh);

    const kerbGeo = new THREE.BufferGeometry();
    kerbGeo.setAttribute('position', new THREE.Float32BufferAttribute(kerbPos, 3));
    kerbGeo.setAttribute('uv', new THREE.Float32BufferAttribute(kerbUV, 2));
    kerbGeo.setIndex(kerbIdx);
    kerbGeo.computeVertexNormals();
    const kerbMat = new THREE.MeshStandardMaterial({
      map: this.mapDef.usePlazaRoad ? this.textures.plazaKerbMap : this.textures.kerbMap,
      roughness: 0.52,
      metalness: 0.06,
      side: THREE.DoubleSide,
    });
    const kerbMesh = new THREE.Mesh(kerbGeo, kerbMat);
    kerbMesh.receiveShadow = true;
    this.group.add(kerbMesh);

    this.disposables.push(roadGeo, roadMat, slabGeo, slabMat, kerbGeo, kerbMat);
  }

  private build3DDividerBoundaries(): void {
    // Creative Multi-Layer 3D Track Boundaries:
    // 1) Sculpted concrete Jersey barriers with angled inner faces
    // 2) Top chrome/metallic tubular safety rails floating above the wall
    // 3) Glowing directional chevron beacons & 3D tire-barrier stacks on curves
    const segs = SAMPLE_COUNT;
    const divPos: number[] = [];
    const divUV: number[] = [];
    const divIdx: number[] = [];

    const railPos: number[] = [];
    const railIdx: number[] = [];

    const buildSide = (sideSign: -1 | 1) => {
      const startVertex = divPos.length / 3;
      const railStartVertex = railPos.length / 3;
      for (let i = 0; i <= segs; i++) {
        const s = this.samples[i % segs];
        const v = i / segs;
        const inner = BARRIER_HALF_WIDTH - 0.15;
        const mid = BARRIER_HALF_WIDTH + 0.28;
        const outer = BARRIER_HALF_WIDTH + 1.05;

        const pIn = s.point.clone().addScaledVector(s.right, sideSign * inner);
        const pMidTop = s.point.clone().addScaledVector(s.right, sideSign * mid).addScaledVector(s.up, 1.45);
        const pOutTop = s.point.clone().addScaledVector(s.right, sideSign * outer).addScaledVector(s.up, 1.45);
        const pOutBot = s.point.clone().addScaledVector(s.right, sideSign * outer);

        divPos.push(
          pIn.x, pIn.y, pIn.z,
          pMidTop.x, pMidTop.y, pMidTop.z,
          pOutTop.x, pOutTop.y, pOutTop.z,
          pOutBot.x, pOutBot.y, pOutBot.z
        );
        divUV.push(0, v, 0.5, v, 0.8, v, 1, v);

        // Elevated metallic top guardrail tube/beam aligned to s.up
        const rInTop = s.point.clone().addScaledVector(s.right, sideSign * (BARRIER_HALF_WIDTH + 0.25)).addScaledVector(s.up, 1.98);
        const rOutTop = s.point.clone().addScaledVector(s.right, sideSign * (BARRIER_HALF_WIDTH + 0.72)).addScaledVector(s.up, 1.98);
        const rOutBot = s.point.clone().addScaledVector(s.right, sideSign * (BARRIER_HALF_WIDTH + 0.72)).addScaledVector(s.up, 1.72);
        const rInBot = s.point.clone().addScaledVector(s.right, sideSign * (BARRIER_HALF_WIDTH + 0.25)).addScaledVector(s.up, 1.72);
        railPos.push(
          rInTop.x, rInTop.y, rInTop.z,
          rOutTop.x, rOutTop.y, rOutTop.z,
          rOutBot.x, rOutBot.y, rOutBot.z,
          rInBot.x, rInBot.y, rInBot.z
        );

        if (i < segs) {
          const b = startVertex + i * 4;
          const n = b + 4;
          divIdx.push(
            b, b + 1, n, b + 1, n + 1, n,
            b + 1, b + 2, n + 1, b + 2, n + 2, n + 1,
            b + 2, b + 3, n + 2, b + 3, n + 3, n + 2
          );

          const rb = railStartVertex + i * 4;
          const rn = rb + 4;
          railIdx.push(
            rb, rb + 1, rn, rb + 1, rn + 1, rn,
            rb + 1, rb + 2, rn + 1, rb + 2, rn + 2, rn + 1,
            rb + 2, rb + 3, rn + 2, rb + 3, rn + 3, rn + 2,
            rb + 3, rb, rn + 3, rb, rn, rn + 3
          );
        }
      }
    };

    buildSide(-1);
    buildSide(1);

    const divGeo = new THREE.BufferGeometry();
    divGeo.setAttribute('position', new THREE.Float32BufferAttribute(divPos, 3));
    divGeo.setAttribute('uv', new THREE.Float32BufferAttribute(divUV, 2));
    divGeo.setIndex(divIdx);
    divGeo.computeVertexNormals();

    const divMat = new THREE.MeshStandardMaterial({
      map: this.textures.dividerStripeMap,
      color: '#ffffff',
      roughness: 0.45,
      metalness: 0.2,
      side: THREE.DoubleSide,
    });
    const divMesh = new THREE.Mesh(divGeo, divMat);
    divMesh.castShadow = true;
    divMesh.receiveShadow = true;
    this.group.add(divMesh);

    const railGeo = new THREE.BufferGeometry();
    railGeo.setAttribute('position', new THREE.Float32BufferAttribute(railPos, 3));
    railGeo.setIndex(railIdx);
    railGeo.computeVertexNormals();
    const railMat = new THREE.MeshStandardMaterial({
      color: this.mapDef.theme === 'plaza' ? '#fef3c7' : '#e2e8f0',
      roughness: 0.25,
      metalness: 0.78,
      side: THREE.DoubleSide,
    });
    const railMesh = new THREE.Mesh(railGeo, railMat);
    railMesh.castShadow = true;
    this.group.add(railMesh);

    // Instanced Divider Stanchions + Glowing Thematic Boundary Beacons
    const stepStride = 10;
    const postCount = Math.floor(segs / stepStride) * 2;
    const postGeo = new THREE.CylinderGeometry(0.24, 0.3, 1.2, 8);
    const postMat = new THREE.MeshStandardMaterial({
      color: this.mapDef.dividerColor,
      roughness: 0.32,
      metalness: 0.35,
    });
    const postInst = new THREE.InstancedMesh(postGeo, postMat, postCount);

    const lampGeo = new THREE.OctahedronGeometry(0.32, 0);
    const lampMat = new THREE.MeshBasicMaterial({
      color: this.mapDef.theme === 'skyline' ? '#38bdf8' : '#fde047',
    });
    const lampInst = new THREE.InstancedMesh(lampGeo, lampMat, postCount);

    let idxCursor = 0;
    const basisMat = new THREE.Matrix4();
    for (let i = 0; i < segs; i += stepStride) {
      const s = this.samples[i];
      basisMat.makeBasis(s.right, s.up, s.tangent);
      this._tmpQuat.setFromRotationMatrix(basisMat);
      for (const side of [-1, 1]) {
        if (idxCursor >= postCount) break;
        this._tmpPos
          .copy(s.point)
          .addScaledVector(s.right, side * (BARRIER_HALF_WIDTH + 0.5))
          .addScaledVector(s.up, 1.8);
        this._tmpScale.set(1, 1, 1);
        this._tmpMat.compose(this._tmpPos, this._tmpQuat, this._tmpScale);
        postInst.setMatrixAt(idxCursor, this._tmpMat);

        this._tmpPos
          .copy(s.point)
          .addScaledVector(s.right, side * (BARRIER_HALF_WIDTH + 0.5))
          .addScaledVector(s.up, 2.52);
        this._tmpMat.compose(this._tmpPos, this._tmpQuat, this._tmpScale);
        lampInst.setMatrixAt(idxCursor, this._tmpMat);
        idxCursor++;
      }
    }
    postInst.instanceMatrix.needsUpdate = true;
    lampInst.instanceMatrix.needsUpdate = true;
    postInst.computeBoundingSphere();
    lampInst.computeBoundingSphere();
    this.group.add(postInst, lampInst);

    // 3D Racing Tire Stacks along curving outer boundary corners
    const tireGeo = new THREE.TorusGeometry(0.68, 0.28, 8, 14);
    tireGeo.rotateX(Math.PI / 2);
    const tireMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.72 });
    const tireCoords: { pos: THREE.Vector3; col: THREE.Color }[] = [];
    const cRed = new THREE.Color(this.mapDef.dividerColor);
    const cWhite = new THREE.Color('#f8fafc');
    const cDark = new THREE.Color('#1e293b');

    for (let i = 0; i < segs; i += 6) {
      const prev = this.samples[(i - 4 + segs) % segs];
      const curr = this.samples[i];
      const next = this.samples[(i + 4) % segs];
      // Signed turn curvature
      const crossY = prev.tangent.z * next.tangent.x - prev.tangent.x * next.tangent.z;
      if (Math.abs(crossY) > 0.14) {
        const outerSide = crossY > 0 ? 1 : -1;
        const basePos = curr.point.clone().addScaledVector(curr.right, outerSide * (BARRIER_HALF_WIDTH + 0.18));
        for (let stack = 0; stack < 2; stack++) {
          tireCoords.push({
            pos: new THREE.Vector3(basePos.x, curr.point.y + 0.34 + stack * 0.54, basePos.z),
            col: stack === 0 ? cRed : i % 12 === 0 ? cWhite : cDark,
          });
        }
      }
    }

    if (tireCoords.length > 0) {
      const tireInst = new THREE.InstancedMesh(tireGeo, tireMat, tireCoords.length);
      tireCoords.forEach((tc, k) => {
        this._tmpPos.copy(tc.pos);
        this._tmpQuat.identity();
        this._tmpScale.set(1, 1, 1);
        this._tmpMat.compose(this._tmpPos, this._tmpQuat, this._tmpScale);
        tireInst.setMatrixAt(k, this._tmpMat);
        tireInst.setColorAt(k, tc.col);
      });
      tireInst.instanceMatrix.needsUpdate = true;
      if (tireInst.instanceColor) tireInst.instanceColor.needsUpdate = true;
      tireInst.computeBoundingSphere();
      this.group.add(tireInst);
    }

    this.disposables.push(
      divGeo,
      divMat,
      railGeo,
      railMat,
      postGeo,
      postMat,
      lampGeo,
      lampMat,
      tireGeo,
      tireMat
    );
  }

  private buildTracksideRocksAndCliffs(): void {
    // Procedural sculpted 3D Boulders & Rock Outcrops strictly validated against track & props
    const rockGeo = new THREE.DodecahedronGeometry(1, 1);
    const posAttr = rockGeo.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < posAttr.count; i++) {
      const vx = posAttr.getX(i);
      const vy = posAttr.getY(i);
      const vz = posAttr.getZ(i);
      const n = 0.82 + Math.abs(Math.sin(vx * 3.1 + vy * 2.7 + vz * 4.3)) * 0.36;
      posAttr.setXYZ(i, vx * n, vy * (n * 0.85), vz * n);
    }
    rockGeo.computeVertexNormals();

    const rockMat = new THREE.MeshStandardMaterial({
      color: '#ffffff',
      roughness: 0.88,
      metalness: 0.04,
      flatShading: true,
    });

    const rockPalette =
      this.mapDef.theme === 'plaza'
        ? [new THREE.Color('#d97706'), new THREE.Color('#b45309'), new THREE.Color('#f59e0b')]
        : this.mapDef.theme === 'stadium'
        ? [new THREE.Color('#475569'), new THREE.Color('#334155'), new THREE.Color('#64748b')]
        : [new THREE.Color('#78716c'), new THREE.Color('#57534e'), new THREE.Color('#a8a29e')];

    const validRocks: { x: number; y: number; z: number; sx: number; sy: number; sz: number; seed: number }[] = [];
    for (let i = 0; i < 240 && validRocks.length < 90; i++) {
      const idx = Math.floor(((i * 0.6180339887) % 1) * SAMPLE_COUNT);
      const s = this.samples[idx];
      const side = i % 2 === 0 ? 1 : -1;
      const offsetDist = BARRIER_HALF_WIDTH + 9.5 + (i % 6) * 4.5;
      const px = s.point.x + s.right.x * side * offsetDist + ((i % 3) - 1) * 1.4;
      const pz = s.point.z + s.right.z * side * offsetDist + (((i + 1) % 3) - 1) * 1.4;
      // Keep rocks strictly outside the loop perimeter so NO rocks ever sit between track sections!
      if (!this.isOutwardFromLoop(px, pz, s)) continue;

      const sx = 1.6 + (i % 4) * 1.05;
      const sy = 1.1 + (i % 3) * 0.9;
      const sz = 1.5 + ((i + 2) % 4) * 1.0;
      const rBound = Math.max(sx, sz) * 1.2;

      if (!this.reserveProp(px, pz, rBound, 7.5)) continue;
      validRocks.push({
        x: px,
        y: Math.max(0, s.point.y * 0.45) + sy * 0.35,
        z: pz,
        sx,
        sy,
        sz,
        seed: i,
      });
    }

    if (validRocks.length > 0) {
      const rockInst = new THREE.InstancedMesh(rockGeo, rockMat, validRocks.length);
      rockInst.castShadow = true;
      rockInst.receiveShadow = true;
      validRocks.forEach((rk, k) => {
        this._tmpPos.set(rk.x, rk.y, rk.z);
        this._tmpQuat.setFromEuler(new THREE.Euler((rk.seed % 5) * 0.3, rk.seed * 1.1, (rk.seed % 3) * 0.25));
        this._tmpScale.set(rk.sx, rk.sy, rk.sz);
        this._tmpMat.compose(this._tmpPos, this._tmpQuat, this._tmpScale);
        rockInst.setMatrixAt(k, this._tmpMat);
        rockInst.setColorAt(k, rockPalette[k % rockPalette.length]);
      });
      rockInst.instanceMatrix.needsUpdate = true;
      if (rockInst.instanceColor) rockInst.instanceColor.needsUpdate = true;
      rockInst.computeBoundingSphere();
      this.group.add(rockInst);
    }
    this.disposables.push(rockGeo, rockMat);
  }

  private buildStartLineShritizMonument(): void {
    // Sculpted Rock Landmark right beside the start straight on EVERY map featuring "SHRITIZ"
    const s = this.samples[18];
    let placedX = s.point.x;
    let placedZ = s.point.z;
    let placedSide = 1;
    let found = false;

    const candidates: [number, number][] = [
      [1, BARRIER_HALF_WIDTH + 11.5],
      [-1, BARRIER_HALF_WIDTH + 11.5],
      [1, BARRIER_HALF_WIDTH + 15.0],
      [-1, BARRIER_HALF_WIDTH + 15.0],
    ];
    for (const [side, dist] of candidates) {
      const cx = s.point.x + s.right.x * side * dist;
      const cz = s.point.z + s.right.z * side * dist;
      if (!this.isOutwardFromLoop(cx, cz, s)) continue;
      if (this.reserveProp(cx, cz, 7.2, 5.2)) {
        placedX = cx;
        placedZ = cz;
        placedSide = side;
        found = true;
        break;
      }
    }
    if (!found) {
      for (const [side, dist] of candidates) {
        const cx = s.point.x + s.right.x * side * dist;
        const cz = s.point.z + s.right.z * side * dist;
        if (this.reserveProp(cx, cz, 7.2, 4.5)) {
          placedX = cx;
          placedZ = cz;
          placedSide = side;
          found = true;
          break;
        }
      }
    }
    if (!found) {
      placedX = s.point.x + s.right.x * (BARRIER_HALF_WIDTH + 13);
      placedZ = s.point.z + s.right.z * (BARRIER_HALF_WIDTH + 13);
      this.placedProps.push({ x: placedX, z: placedZ, r: 7.2 });
    }

    const monument = new THREE.Group();
    monument.position.set(placedX, Math.max(0, s.point.y), placedZ);
    // Angle rock face toward drivers approaching down the start straight
    const trackYaw = Math.atan2(s.tangent.x, s.tangent.z);
    monument.rotation.y = trackYaw + Math.PI + (placedSide > 0 ? -0.45 : 0.45);

    const rockColor =
      this.mapDef.theme === 'plaza'
        ? '#d97706'
        : this.mapDef.theme === 'stadium'
        ? '#475569'
        : this.mapDef.theme === 'skyline'
        ? '#64748b'
        : '#78716c';
    const rockMat = new THREE.MeshStandardMaterial({
      color: rockColor,
      roughness: 0.85,
      metalness: 0.06,
      flatShading: true,
    });
    const peakMat = new THREE.MeshStandardMaterial({
      color: this.mapDef.theme === 'plaza' ? '#f59e0b' : '#94a3b8',
      roughness: 0.78,
      flatShading: true,
    });
    const signMat = new THREE.MeshStandardMaterial({
      map: this.textures.shritizArchSignMap,
      roughness: 0.38,
      emissive: '#facc15',
      emissiveIntensity: 0.14,
    });
    const frameMat = new THREE.MeshStandardMaterial({ color: '#451a03', roughness: 0.72 });

    const boulderGeo = new THREE.DodecahedronGeometry(4.6, 1);
    const mainRock = new THREE.Mesh(boulderGeo, rockMat);
    mainRock.scale.set(1.35, 1.45, 0.95);
    mainRock.position.y = 4.2;
    mainRock.castShadow = true;
    mainRock.receiveShadow = true;
    monument.add(mainRock);

    const sideGeo = new THREE.DodecahedronGeometry(2.8, 1);
    const leftBoulder = new THREE.Mesh(sideGeo, peakMat);
    leftBoulder.position.set(-4.6, 2.2, 0.6);
    leftBoulder.scale.set(1.1, 0.9, 1.0);
    leftBoulder.castShadow = true;
    monument.add(leftBoulder);

    const rightBoulder = new THREE.Mesh(sideGeo, peakMat);
    rightBoulder.position.set(4.6, 2.5, -0.4);
    rightBoulder.scale.set(1.0, 1.05, 0.95);
    rightBoulder.castShadow = true;
    monument.add(rightBoulder);

    // Dual-sided bold SHRITIZ plaque mounted into the rock face
    const frameGeo = new THREE.BoxGeometry(10.8, 3.1, 1.4);
    const frame = new THREE.Mesh(frameGeo, frameMat);
    frame.position.set(0, 6.2, 2.8);
    frame.castShadow = true;
    monument.add(frame);

    const faceGeo = new THREE.PlaneGeometry(10.1, 2.55);
    const frontFace = new THREE.Mesh(faceGeo, signMat);
    frontFace.position.set(0, 6.2, 3.53);
    monument.add(frontFace);

    const backFace = new THREE.Mesh(faceGeo, signMat);
    backFace.position.set(0, 6.2, 2.07);
    backFace.rotation.y = Math.PI;
    monument.add(backFace);

    this.group.add(monument);
    this.disposables.push(rockMat, peakMat, signMat, frameMat, boulderGeo, sideGeo, frameGeo, faceGeo);
  }

  private buildPlazaFountainAndParasols(): void {
    // Scenic Coconut Plaza Water Fountain safely placed in wide open infield
    const candidateCenters: [number, number][] = [
      [104, -22],
      [96, 20],
      [112, -55],
      [88, -105],
      [92, 65],
    ];
    let fx = 104;
    let fz = -22;
    let fountainOk = false;
    for (const [cx, cz] of candidateCenters) {
      if (this.reserveProp(cx, cz, 20, 6)) {
        fx = cx;
        fz = cz;
        fountainOk = true;
        break;
      }
    }

    const basinGeo = new THREE.CylinderGeometry(15, 16.5, 2.2, 24);
    const basinMat = new THREE.MeshStandardMaterial({ color: '#fde68a', roughness: 0.55 });
    const waterGeo = new THREE.CylinderGeometry(13.5, 13.5, 1.8, 24);
    const waterMat = new THREE.MeshStandardMaterial({
      color: '#0ea5e9',
      emissive: '#0284c7',
      emissiveIntensity: 0.35,
      roughness: 0.12,
      metalness: 0.3,
    });
    const jetGeo = new THREE.TorusGeometry(6.2, 0.45, 8, 24);
    jetGeo.rotateX(Math.PI / 2);
    const jetMat = new THREE.MeshBasicMaterial({ color: '#bae6fd', transparent: true, opacity: 0.8 });

    if (fountainOk) {
      const fountain = new THREE.Group();
      fountain.position.set(fx, 0.5, fz);
      fountain.add(new THREE.Mesh(basinGeo, basinMat));
      const water = new THREE.Mesh(waterGeo, waterMat);
      water.position.y = 0.35;
      fountain.add(water);
      for (let r = 0; r < 2; r++) {
        const ring = new THREE.Mesh(jetGeo, jetMat);
        ring.position.y = 2.6 + r * 2.4;
        ring.scale.setScalar(1 - r * 0.38);
        fountain.add(ring);
        this.fountainRings.push(ring);
      }
      this.group.add(fountain);
    }

    // Colorful Resort Parasols strictly outward from track loop
    const poleGeo = new THREE.CylinderGeometry(0.14, 0.14, 4.2, 6);
    const poleMat = new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.4 });
    const canopyGeo = new THREE.ConeGeometry(3.1, 1.4, 8);
    const parasolColors = ['#ef4444', '#38bdf8', '#facc15', '#ec4899'];
    for (let i = 0; i < 24; i++) {
      const idx = Math.floor(((i + 0.35) / 24) * SAMPLE_COUNT) % SAMPLE_COUNT;
      const s = this.samples[idx];
      const side = i % 2 === 0 ? 1 : -1;
      const pPos = s.point.clone().addScaledVector(s.right, side * (BARRIER_HALF_WIDTH + 8.5));
      if (!this.isOutwardFromLoop(pPos.x, pPos.z, s)) continue;
      if (!this.reserveProp(pPos.x, pPos.z, 3.8, 5.5)) continue;
      const umb = new THREE.Group();
      umb.position.set(pPos.x, s.point.y, pPos.z);
      const pole = new THREE.Mesh(poleGeo, poleMat);
      pole.position.y = 2.1;
      umb.add(pole);
      const cMat = new THREE.MeshStandardMaterial({
        color: parasolColors[i % parasolColors.length],
        roughness: 0.55,
      });
      const canopy = new THREE.Mesh(canopyGeo, cMat);
      canopy.position.y = 4.3;
      umb.add(canopy);
      this.group.add(umb);
      this.disposables.push(cMat);
    }

    this.disposables.push(basinGeo, basinMat, waterGeo, waterMat, jetGeo, jetMat, poleGeo, poleMat, canopyGeo);
  }

  private buildHotAirBalloons(): void {
    const envGeo = new THREE.SphereGeometry(7.5, 16, 14);
    const bskGeo = new THREE.BoxGeometry(2.6, 2.2, 2.6);
    const bskMat = new THREE.MeshStandardMaterial({ color: '#92400e', roughness: 0.8 });
    const colors = ['#ef4444', '#facc15', '#38bdf8', '#ec4899', '#22c55e'];

    for (let i = 0; i < 5; i++) {
      const bGroup = new THREE.Group();
      const ang = (i / 5) * Math.PI * 2 + 0.4;
      const dist = 140 + (i % 2) * 55;
      const baseY = 46 + (i % 3) * 14;
      bGroup.position.set(Math.cos(ang) * dist, baseY, Math.sin(ang) * dist);

      const envMat = new THREE.MeshStandardMaterial({ color: colors[i], roughness: 0.45 });
      const env = new THREE.Mesh(envGeo, envMat);
      env.scale.set(1, 1.24, 1);
      bGroup.add(env);

      const bsk = new THREE.Mesh(bskGeo, bskMat);
      bsk.position.y = -11.5;
      bGroup.add(bsk);

      this.group.add(bGroup);
      this.floatingBalloons.push({ group: bGroup, baseY, phase: i * 1.4 });
      this.disposables.push(envMat);
    }
    this.disposables.push(envGeo, bskGeo, bskMat);
  }

  private buildShritizRockArch(tVal: number, withPalmTopper: boolean): void {
    // Iconic Image 2 Sandstone / Rock Archway with carved plaque reading "SHRITIZ"
    const idx = Math.floor(tVal * SAMPLE_COUNT) % SAMPLE_COUNT;
    const s = this.samples[idx];
    const archGroup = new THREE.Group();
    archGroup.position.copy(s.point);
    archGroup.rotation.y = Math.atan2(s.tangent.x, s.tangent.z);

    const baseStoneMat = new THREE.MeshStandardMaterial({
      color: '#ea580c',
      roughness: 0.72,
      metalness: 0.06,
    });
    const archSandMat = new THREE.MeshStandardMaterial({
      color: '#fde047',
      roughness: 0.65,
      metalness: 0.05,
    });
    const signBoardMat = new THREE.MeshStandardMaterial({
      map: this.textures.shritizArchSignMap,
      roughness: 0.45,
    });
    const woodTrimMat = new THREE.MeshStandardMaterial({
      color: '#713f12',
      roughness: 0.8,
    });

    // Stepped sculpted stone base pillars positioned completely outside track barriers (±21.4)
    const stepGeo = new THREE.BoxGeometry(5.2, 2.8, 5.2);
    [-21.4, 21.4].forEach((x) => {
      for (let st = 0; st < 3; st++) {
        const blk = new THREE.Mesh(stepGeo, baseStoneMat);
        blk.position.set(x + (st % 2 === 0 ? 0.25 : -0.25), 1.4 + st * 2.5, 0);
        blk.scale.set(1 - st * 0.1, 1, 1 - st * 0.08);
        blk.castShadow = true;
        blk.receiveShadow = true;
        archGroup.add(blk);
      }
    });

    // Wide curved sandstone arch spanning above track & barriers with zero wall overlap
    const archGeo = new THREE.TorusGeometry(21.4, 2.35, 10, 28, Math.PI);
    const archMesh = new THREE.Mesh(archGeo, archSandMat);
    archMesh.position.y = 7.4;
    archMesh.castShadow = true;
    archGroup.add(archMesh);

    // Carved Wooden Plaque Sign reading "SHRITIZ" mounted across the crown!
    const plaqueGeo = new THREE.BoxGeometry(24.6, 4.8, 1.15);
    const plaqueFrame = new THREE.Mesh(plaqueGeo, woodTrimMat);
    plaqueFrame.position.set(0, 24.0, 0);
    plaqueFrame.castShadow = true;
    archGroup.add(plaqueFrame);

    const faceGeo = new THREE.PlaneGeometry(23.6, 4.25);
    const frontSign = new THREE.Mesh(faceGeo, signBoardMat);
    frontSign.position.set(0, 24.0, 0.6);
    archGroup.add(frontSign);

    const backSign = new THREE.Mesh(faceGeo, signBoardMat);
    backSign.position.set(0, 24.0, -0.6);
    backSign.rotation.y = Math.PI;
    archGroup.add(backSign);

    if (withPalmTopper) {
      const frondGeo = new THREE.ConeGeometry(1.4, 7.2, 6);
      const frondMat = new THREE.MeshStandardMaterial({ color: '#16a34a', roughness: 0.6 });
      for (let f = 0; f < 6; f++) {
        const frond = new THREE.Mesh(frondGeo, frondMat);
        const side = f < 3 ? -1 : 1;
        frond.position.set(side * (9 + (f % 3) * 2.2), 21.8, (f % 2 === 0 ? 1 : -1) * 0.8);
        frond.rotation.z = side * (0.45 + (f % 3) * 0.28);
        archGroup.add(frond);
      }
      this.disposables.push(frondGeo, frondMat);
    }

    this.group.add(archGroup);
    this.disposables.push(
      baseStoneMat,
      archSandMat,
      signBoardMat,
      woodTrimMat,
      stepGeo,
      archGeo,
      plaqueGeo,
      faceGeo
    );
  }

  private buildCoconutPlazaEnvironment(): void {
    // Nintendo Coconut Mall / Resort Plaza Storefronts, Swaying Palms, Tropical Shrubs & Shuttle Carts (strictly validated clear of tracks)
    const facadeMat = new THREE.MeshStandardMaterial({
      map: this.textures.plazaWallMap,
      roughness: 0.55,
      metalness: 0.08,
    });
    const roofMat = new THREE.MeshStandardMaterial({
      color: '#facc15',
      roughness: 0.45,
    });
    const buildingGeo = new THREE.BoxGeometry(26, 18, 20);
    const roofGeo = new THREE.BoxGeometry(28, 2.2, 22);

    // Place sunlit mall buildings strictly on OUTER perimeter (never between tracks!)
    for (let i = 0; i < 36; i++) {
      const idx = Math.floor(((i + 0.5) / 36) * SAMPLE_COUNT) % SAMPLE_COUNT;
      const s = this.samples[idx];
      const side = i % 2 === 0 ? 1 : -1;
      const pos = s.point.clone().addScaledVector(s.right, side * 46);
      if (!this.isOutwardFromLoop(pos.x, pos.z, s)) continue;
      if (!this.reserveProp(pos.x, pos.z, 20.5, 12.0)) continue;

      const bldg = new THREE.Group();
      bldg.position.set(pos.x, Math.max(0, s.point.y), pos.z);
      bldg.rotation.y = Math.atan2(s.tangent.x, s.tangent.z);

      const body = new THREE.Mesh(buildingGeo, facadeMat);
      body.position.y = 9;
      body.castShadow = true;
      body.receiveShadow = true;
      bldg.add(body);

      const roof = new THREE.Mesh(roofGeo, roofMat);
      roof.position.y = 19;
      bldg.add(roof);
      this.group.add(bldg);
    }

    // Swaying Resort Palm Trees (both outer scenic groves and trackside promenade)
    const trunkGeo = new THREE.CylinderGeometry(0.45, 0.75, 11, 8);
    const trunkMat = new THREE.MeshStandardMaterial({ color: '#92400e', roughness: 0.85 });
    const leafGeo = new THREE.ConeGeometry(1.1, 6.2, 5);
    const leafMat = new THREE.MeshStandardMaterial({ color: '#22c55e', roughness: 0.55 });
    const coconutGeo = new THREE.SphereGeometry(0.42, 8, 6);
    const coconutMat = new THREE.MeshStandardMaterial({ color: '#713f12', roughness: 0.8 });

    const spawnPalm = (x: number, y: number, z: number, scale = 1) => {
      const palm = new THREE.Group();
      palm.position.set(x, y, z);
      palm.scale.setScalar(scale);

      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.y = 5.5;
      trunk.castShadow = true;
      palm.add(trunk);

      const crown = new THREE.Group();
      crown.position.y = 11;
      for (let f = 0; f < 5; f++) {
        const ang = (f / 5) * Math.PI * 2;
        const leaf = new THREE.Mesh(leafGeo, leafMat);
        leaf.rotation.z = 1.05;
        leaf.rotation.y = ang;
        leaf.position.set(Math.cos(ang) * 2.2, -0.4, Math.sin(ang) * 2.2);
        crown.add(leaf);
      }
      for (let c = 0; c < 3; c++) {
        const ca = (c / 3) * Math.PI * 2;
        const coco = new THREE.Mesh(coconutGeo, coconutMat);
        coco.position.set(Math.cos(ca) * 0.65, -0.6, Math.sin(ca) * 0.65);
        crown.add(coco);
      }
      palm.add(crown);
      this.palmCrowns.push(crown);
      this.group.add(palm);
    };

    for (let i = 0; i < 56; i++) {
      const idx = Math.floor((i / 56) * SAMPLE_COUNT) % SAMPLE_COUNT;
      const s = this.samples[idx];
      const side = i % 2 === 0 ? -1 : 1;
      const dist = BARRIER_HALF_WIDTH + 8.5 + (i % 3) * 4.5;
      const pPos = s.point.clone().addScaledVector(s.right, side * dist);
      if (!this.isOutwardFromLoop(pPos.x, pPos.z, s)) continue;
      if (!this.reserveProp(pPos.x, pPos.z, 4.0, 5.0)) continue;
      spawnPalm(pPos.x, Math.max(0, s.point.y * 0.6), pPos.z, 0.9 + (i % 3) * 0.15);
    }

    // Scenic outer perimeter palm clusters (keeping tracks & narrow medians completely clear)
    for (let g = 0; g < 26; g++) {
      const ang = (g / 26) * Math.PI * 2;
      const r = 250 + (g % 3) * 28;
      const gx = this.loopCx + Math.cos(ang) * r;
      const gz = this.loopCz + Math.sin(ang) * r;
      if (!this.reserveProp(gx, gz, 4.4, 8.0)) continue;
      spawnPalm(gx, 0, gz, 1.0 + (g % 3) * 0.22);
    }

    // Tropical flowering bushes strictly along outer edges
    const bushGeo = new THREE.DodecahedronGeometry(2.1, 1);
    const bushMat = new THREE.MeshStandardMaterial({ color: '#16a34a', roughness: 0.75 });
    const bushCoords: { x: number; y: number; z: number; s: number }[] = [];
    for (let i = 0; i < 64; i++) {
      const idx = Math.floor(((i + 0.25) / 64) * SAMPLE_COUNT) % SAMPLE_COUNT;
      const s = this.samples[idx];
      const side = i % 2 === 0 ? 1 : -1;
      const bPos = s.point.clone().addScaledVector(s.right, side * (BARRIER_HALF_WIDTH + 6.5 + (i % 4) * 2.5));
      if (!this.isOutwardFromLoop(bPos.x, bPos.z, s)) continue;
      const sc = 0.8 + (i % 3) * 0.35;
      if (!this.reserveProp(bPos.x, bPos.z, 2.6 * sc, 5.0)) continue;
      bushCoords.push({ x: bPos.x, y: Math.max(0, s.point.y * 0.6) + 1.1 * sc, z: bPos.z, s: sc });
    }
    if (bushCoords.length > 0) {
      const bushInst = new THREE.InstancedMesh(bushGeo, bushMat, bushCoords.length);
      bushCoords.forEach((b, k) => {
        this._tmpPos.set(b.x, b.y, b.z);
        this._tmpQuat.identity();
        this._tmpScale.set(b.s * 1.2, b.s * 0.85, b.s * 1.2);
        this._tmpMat.compose(this._tmpPos, this._tmpQuat, this._tmpScale);
        bushInst.setMatrixAt(k, this._tmpMat);
      });
      bushInst.instanceMatrix.needsUpdate = true;
      bushInst.computeBoundingSphere();
      this.group.add(bushInst);
    }

    // Bright Yellow & Blue Resort Shuttle Carts parked safely outside outer plaza perimeter
    const busBodyGeo = new THREE.BoxGeometry(3.4, 2.6, 6.4);
    const busMat = new THREE.MeshStandardMaterial({ color: '#facc15', roughness: 0.35, metalness: 0.18 });
    const winGeo = new THREE.BoxGeometry(3.5, 1.0, 4.8);
    const winMat = new THREE.MeshStandardMaterial({ color: '#0ea5e9', roughness: 0.15, metalness: 0.5 });

    for (let i = 0; i < 12; i++) {
      const idx = Math.floor((0.06 + i * 0.08) * SAMPLE_COUNT) % SAMPLE_COUNT;
      const s = this.samples[idx];
      const side = i % 2 === 0 ? 1 : -1;
      const pos = s.point.clone().addScaledVector(s.right, side * 25.5);
      if (!this.isOutwardFromLoop(pos.x, pos.z, s)) continue;
      if (!this.reserveProp(pos.x, pos.z, 4.8, 5.0)) continue;
      const bus = new THREE.Group();
      bus.position.set(pos.x, s.point.y + 1.3, pos.z);
      bus.rotation.y = Math.atan2(s.tangent.x, s.tangent.z);
      bus.add(new THREE.Mesh(busBodyGeo, busMat));
      const win = new THREE.Mesh(winGeo, winMat);
      win.position.y = 0.45;
      bus.add(win);
      this.group.add(bus);
    }

    this.disposables.push(
      facadeMat,
      roofMat,
      buildingGeo,
      roofGeo,
      trunkGeo,
      trunkMat,
      leafGeo,
      leafMat,
      coconutGeo,
      coconutMat,
      bushGeo,
      bushMat,
      busBodyGeo,
      busMat,
      winGeo,
      winMat
    );
  }

  private buildElevatedSupportsAndRamps(): void {
    const pillarMat = new THREE.MeshStandardMaterial({
      color: this.mapDef.theme === 'plaza' ? '#d97706' : '#64748b',
      roughness: 0.7,
      metalness: 0.25,
    });
    const pillarGeo = new THREE.BoxGeometry(3.2, 1, 3.2);
    for (let i = 0; i < SAMPLE_COUNT; i += 14) {
      const s = this.samples[i];
      if (!s.isInLoop && s.point.y > 1.8) {
        [-10.5, 10.5].forEach((lat) => {
          const px = s.point.x + s.right.x * lat;
          const pz = s.point.z + s.right.z * lat;
          if (this.minDistanceToOtherTrackSegment(px, pz, i, 24) < BARRIER_HALF_WIDTH + 4.5) return;
          const p = new THREE.Mesh(pillarGeo, pillarMat);
          p.position.set(px, (s.point.y - 0.5) / 2, pz);
          p.scale.y = s.point.y + 0.6;
          p.castShadow = true;
          p.receiveShadow = true;
          this.group.add(p);
        });
      }
    }

    // Glowing Anti-Gravity 360 Loop Support Portal Rings (if track features a vertical 360 loop)
    if (this.mapDef.loopSegment) {
      const lArchGeo = new THREE.TorusGeometry(BARRIER_HALF_WIDTH + 2.6, 0.85, 8, 28, Math.PI);
      const lNeonGeo = new THREE.TorusGeometry(BARRIER_HALF_WIDTH + 1.75, 0.24, 6, 28, Math.PI);
      const lSteelMat = new THREE.MeshStandardMaterial({ color: '#0f172a', metalness: 0.8, roughness: 0.25 });
      const lNeonMat = new THREE.MeshBasicMaterial({ color: '#38bdf8' });
      const basis = new THREE.Matrix4();
      const loopSeg = this.mapDef.loopSegment;
      [0.08, 0.26, 0.5, 0.74, 0.92].forEach((u) => {
        const tVal = THREE.MathUtils.lerp(loopSeg.tStart, loopSeg.tEnd, u);
        const idx = Math.floor(tVal * SAMPLE_COUNT) % SAMPLE_COUNT;
        const s = this.samples[idx];
        basis.makeBasis(s.right, s.up, s.tangent);
        const portal = new THREE.Group();
        portal.position.copy(s.point);
        portal.setRotationFromMatrix(basis);
        portal.add(new THREE.Mesh(lArchGeo, lSteelMat), new THREE.Mesh(lNeonGeo, lNeonMat));
        this.group.add(portal);
      });
      this.disposables.push(lArchGeo, lNeonGeo, lSteelMat, lNeonMat);
    }

    // Bright Orange/Gold Suspension Ramp Markers on Jump Crests (pylons placed outside barriers!)
    const rampDeckGeo = new THREE.PlaneGeometry(TRACK_HALF_WIDTH * 1.9, 13);
    rampDeckGeo.rotateX(-Math.PI / 2);
    const rampDeckMat = new THREE.MeshStandardMaterial({
      map: this.textures.boostPadMap,
      color: '#f97316',
      emissive: '#fb923c',
      emissiveIntensity: 0.75,
      roughness: 0.35,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    const pylonGeo = new THREE.CylinderGeometry(0.45, 0.65, 11, 10);
    const pylonMat = new THREE.MeshStandardMaterial({ color: '#f59e0b', metalness: 0.5, roughness: 0.35 });

    for (const rc of this.rampTCenters) {
      const idx = Math.floor(rc * SAMPLE_COUNT) % SAMPLE_COUNT;
      const s = this.samples[idx];
      const yaw = Math.atan2(s.tangent.x, s.tangent.z);

      const deck = new THREE.Mesh(rampDeckGeo, rampDeckMat);
      deck.position.copy(s.point);
      deck.position.y += 0.1;
      deck.rotation.y = yaw;
      this.group.add(deck);

      [-(BARRIER_HALF_WIDTH + 1.9), BARRIER_HALF_WIDTH + 1.9].forEach((lat) => {
        const pylon = new THREE.Mesh(pylonGeo, pylonMat);
        pylon.position.copy(s.point).addScaledVector(s.right, lat);
        pylon.position.y += 5.2;
        pylon.castShadow = true;
        this.group.add(pylon);
      });
    }

    this.disposables.push(pillarMat, pillarGeo, rampDeckGeo, rampDeckMat, pylonGeo, pylonMat);
  }

  private buildStartFinishGantry(): void {
    const startSample = this.samples[0];
    const gantry = new THREE.Group();
    gantry.position.copy(startSample.point);
    gantry.rotation.y = Math.atan2(startSample.tangent.x, startSample.tangent.z);

    const lineGeo = new THREE.PlaneGeometry(TRACK_HALF_WIDTH * 2, 4.2);
    lineGeo.rotateX(-Math.PI / 2);
    const lineMat = new THREE.MeshStandardMaterial({
      map: this.textures.checkerMap,
      roughness: 0.55,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
    const lineMesh = new THREE.Mesh(lineGeo, lineMat);
    lineMesh.position.y = 0.08;
    lineMesh.receiveShadow = true;
    gantry.add(lineMesh);

    const pillarMat = new THREE.MeshStandardMaterial({ color: '#1e293b', metalness: 0.8, roughness: 0.25 });
    const pillarGeo = new THREE.BoxGeometry(1.4, 11.8, 1.4);
    [-18.2, 18.2].forEach((x) => {
      const p = new THREE.Mesh(pillarGeo, pillarMat);
      p.position.set(x, 5.9, 0);
      p.castShadow = true;
      gantry.add(p);
    });

    const beamGeo = new THREE.BoxGeometry(38.0, 2.2, 2.0);
    const beamMat = new THREE.MeshStandardMaterial({ color: '#0f172a', metalness: 0.6, roughness: 0.35 });
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.position.set(0, 11.4, 0);
    gantry.add(beam);

    const bannerGeo = new THREE.PlaneGeometry(32, 1.8);
    const bannerMat = new THREE.MeshBasicMaterial({ map: this.textures.checkerMap, side: THREE.DoubleSide });
    const bannerF = new THREE.Mesh(bannerGeo, bannerMat);
    bannerF.position.set(0, 11.4, 1.05);
    gantry.add(bannerF);
    const bannerB = new THREE.Mesh(bannerGeo, bannerMat);
    bannerB.position.set(0, 11.4, -1.05);
    gantry.add(bannerB);

    const podGeo = new THREE.BoxGeometry(5.8, 1.8, 1.4);
    const pod = new THREE.Mesh(podGeo, pillarMat);
    pod.position.set(0, 9.4, 0);
    gantry.add(pod);

    const lightGeo = new THREE.SphereGeometry(0.5, 16, 16);
    for (let i = 0; i < 3; i++) {
      const lm = new THREE.MeshBasicMaterial({ color: '#334155' });
      const bulb = new THREE.Mesh(lightGeo, lm);
      bulb.position.set(-1.6 + i * 1.6, 9.4, 0.72);
      gantry.add(bulb);
      this.startLightMeshes.push(bulb);
      this.disposables.push(lm);
    }

    const flagGeo = new THREE.PlaneGeometry(2.6, 1.6, 6, 3);
    const flagMat = new THREE.MeshStandardMaterial({
      map: this.textures.checkerMap,
      side: THREE.DoubleSide,
      roughness: 0.5,
    });
    for (let i = -3; i <= 3; i++) {
      const f = new THREE.Mesh(flagGeo, flagMat);
      f.position.set(i * 4.8, 13.3, 0);
      gantry.add(f);
      this.bannerFlags.push(f);
    }

    this.group.add(gantry);
    this.disposables.push(
      lineGeo,
      lineMat,
      pillarGeo,
      pillarMat,
      beamGeo,
      beamMat,
      bannerGeo,
      bannerMat,
      podGeo,
      lightGeo,
      flagGeo,
      flagMat
    );
  }

  public setCountdownLights(value: number, racing: boolean): void {
    this.startLightMeshes.forEach((bulb, i) => {
      const mat = bulb.material as THREE.MeshBasicMaterial;
      if (racing) mat.color.set('#22c55e');
      else if (value <= 3 - i) mat.color.set('#ef4444');
      else mat.color.set('#334155');
    });
  }

  private buildBoostPads(): void {
    const padGeo = new THREE.PlaneGeometry(5.0, 9.5);
    padGeo.rotateX(-Math.PI / 2);
    this.disposables.push(padGeo);

    const basis = new THREE.Matrix4();
    this.mapDef.boostPads.forEach((cfg) => {
      this.boostPads.push(cfg);
      const idx = Math.floor(cfg.tCenter * SAMPLE_COUNT) % SAMPLE_COUNT;
      const s = this.samples[idx];
      const mesh = new THREE.Mesh(padGeo, this.boostPadMat);
      mesh.position
        .copy(s.point)
        .addScaledVector(s.right, cfg.lateralOffset)
        .addScaledVector(s.up, 0.11);
      basis.makeBasis(s.right, s.up, s.tangent);
      mesh.setRotationFromMatrix(basis);
      this.group.add(mesh);
    });
  }

  private buildItemBoxes(): void {
    let idCounter = 1;
    this.mapDef.itemRowTs.forEach((tVal) => {
      const idx = Math.floor(tVal * SAMPLE_COUNT) % SAMPLE_COUNT;
      const s = this.samples[idx];
      [-6.5, -2.2, 2.2, 6.5].forEach((lat) => {
        const mesh = buildItemBoxMesh(this.textures);
        const pos = s.point.clone().addScaledVector(s.right, lat).addScaledVector(s.up, 1.5);
        mesh.position.copy(pos);
        this.group.add(mesh);
        this.itemBoxes.push({
          id: idCounter++,
          position: pos,
          mesh,
          respawnTimer: 0,
        });
      });
    });
  }

  private buildEnvironmentalHazards(): void {
    // Organic Multi-Lobed 3D Oil Puddle Shape + Iridescent Sheen + Tipped Hazard Drum
    const oilShape = new THREE.Shape();
    const lobes = 28;
    for (let i = 0; i <= lobes; i++) {
      const a = (i / lobes) * Math.PI * 2;
      const r =
        2.35 +
        Math.sin(a * 3 + 0.5) * 0.55 +
        Math.cos(a * 5 - 0.3) * 0.32 +
        Math.sin(a * 2) * 0.4;
      const ox = Math.cos(a) * r;
      const oy = Math.sin(a) * r * 0.86;
      if (i === 0) oilShape.moveTo(ox, oy);
      else oilShape.lineTo(ox, oy);
    }
    oilShape.closePath();

    const oilGeo = new THREE.ShapeGeometry(oilShape);
    oilGeo.rotateX(-Math.PI / 2);
    // Normalize UVs into [0,1] for iridescent oilSlickMap
    const uvAttr = oilGeo.getAttribute('uv') as THREE.BufferAttribute;
    const posAttr = oilGeo.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < posAttr.count; i++) {
      uvAttr.setXY(i, posAttr.getX(i) / 7.2 + 0.5, posAttr.getZ(i) / 7.2 + 0.5);
    }
    uvAttr.needsUpdate = true;

    const oilMat = new THREE.MeshPhysicalMaterial({
      map: this.textures.oilSlickMap,
      color: '#111827',
      roughness: 0.05,
      metalness: 0.78,
      clearcoat: 1.0,
      clearcoatRoughness: 0.04,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    const oilRimGeo = new THREE.ExtrudeGeometry(oilShape, {
      depth: 0.045,
      bevelEnabled: true,
      bevelThickness: 0.025,
      bevelSize: 0.04,
      bevelSegments: 2,
    });
    oilRimGeo.rotateX(-Math.PI / 2);

    const drumGeo = new THREE.CylinderGeometry(0.55, 0.55, 1.35, 14);
    const drumMat = new THREE.MeshStandardMaterial({ color: '#f59e0b', roughness: 0.35, metalness: 0.4 });
    const drumBandGeo = new THREE.TorusGeometry(0.56, 0.055, 6, 16);
    drumBandGeo.rotateX(Math.PI / 2);
    const drumBandMat = new THREE.MeshStandardMaterial({ color: '#0f172a', roughness: 0.45 });

    this.disposables.push(oilGeo, oilMat, oilRimGeo, drumGeo, drumMat, drumBandGeo, drumBandMat);

    for (const hz of this.mapDef.hazards) {
      const idx = Math.floor(hz.t * SAMPLE_COUNT) % SAMPLE_COUNT;
      const s = this.samples[idx];
      if (hz.kind === 'bumper') {
        const mesh = buildTrackBumperMesh();
        mesh.position.copy(s.point);
        this.group.add(mesh);
        this.trackHazards.push({
          kind: 'bumper',
          t: hz.t,
          lateralAmp: hz.lateralAmp,
          speed: hz.speed,
          x: s.point.x,
          y: s.point.y,
          z: s.point.z,
          radius: 1.9,
          mesh,
        });
      } else {
        const puddleGroup = new THREE.Group();
        const pos = s.point.clone().addScaledVector(s.right, hz.lateralAmp);
        puddleGroup.position.copy(pos).addScaledVector(s.up, 0.07);
        puddleGroup.rotation.y = Math.atan2(s.tangent.x, s.tangent.z);

        const slab = new THREE.Mesh(oilRimGeo, oilMat);
        puddleGroup.add(slab);
        const topSheen = new THREE.Mesh(oilGeo, oilMat);
        topSheen.position.y = 0.06;
        puddleGroup.add(topSheen);

        // Tipped yellow/black oil drum beside spill outer lip
        const drum = new THREE.Group();
        drum.position.set(hz.lateralAmp >= 0 ? 2.5 : -2.5, 0.56, -0.4);
        drum.rotation.z = hz.lateralAmp >= 0 ? 1.38 : -1.38;
        drum.rotation.y = 0.35;
        const dBody = new THREE.Mesh(drumGeo, drumMat);
        dBody.castShadow = true;
        drum.add(dBody);
        [-0.38, 0.38].forEach((by) => {
          const band = new THREE.Mesh(drumBandGeo, drumBandMat);
          band.position.y = by;
          drum.add(band);
        });
        puddleGroup.add(drum);

        this.group.add(puddleGroup);
        this.trackHazards.push({
          kind: 'oil',
          t: hz.t,
          lateralAmp: hz.lateralAmp,
          speed: 0,
          x: pos.x,
          y: pos.y,
          z: pos.z,
          radius: 2.5,
          mesh: puddleGroup,
        });
      }
    }
  }

  private buildSunlitCountrysideProps(): void {
    // Rich Countryside Oak & Pine Groves (roadside + infield + outer hills) all verified non-overlapping
    const trunkGeo = new THREE.CylinderGeometry(0.85, 1.25, 9, 8);
    const trunkMat = new THREE.MeshStandardMaterial({ color: '#78350f', roughness: 0.9 });
    const leafGeo = new THREE.DodecahedronGeometry(4.5, 1);
    const leafMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.78 });
    const pineGeo = new THREE.ConeGeometry(4.2, 11.5, 7);
    const pineMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.78 });

    const oakPalette = [
      new THREE.Color('#4ade80'),
      new THREE.Color('#22c55e'),
      new THREE.Color('#facc15'),
      new THREE.Color('#f59e0b'),
    ];
    const pinePalette = [new THREE.Color('#15803d'), new THREE.Color('#166534'), new THREE.Color('#16a34a')];

    const oaks: { x: number; z: number; s: number; colIdx: number }[] = [];
    const pines: { x: number; z: number; s: number; colIdx: number }[] = [];

    // 1) Trackside scenic tree belts strictly outward from loop perimeter
    for (let i = 0; i < 84; i++) {
      const idx = Math.floor((i / 84) * SAMPLE_COUNT) % SAMPLE_COUNT;
      const s = this.samples[idx];
      const side = i % 2 === 0 ? 1 : -1;
      const dist = BARRIER_HALF_WIDTH + 10.5 + (i % 4) * 7.5;
      const x = s.point.x + s.right.x * side * dist;
      const z = s.point.z + s.right.z * side * dist;
      if (!this.isOutwardFromLoop(x, z, s)) continue;
      const sc = 0.85 + (i % 4) * 0.18;
      if (!this.reserveProp(x, z, 5.2 * sc, 6.0)) continue;
      if (i % 3 === 0) pines.push({ x, z, s: sc, colIdx: i % pinePalette.length });
      else oaks.push({ x, z, s: sc, colIdx: i % oakPalette.length });
    }

    // 2) Wide outer countryside forest hills (never placed inside tight track medians)
    for (let i = 0; i < 120; i++) {
      const ang = (i * 2.399963) % (Math.PI * 2);
      const ring = 225 + (i % 6) * 28;
      const x = this.loopCx + Math.cos(ang) * ring;
      const z = this.loopCz + Math.sin(ang) * ring;
      const sc = 0.9 + (i % 4) * 0.22;
      if (!this.reserveProp(x, z, 5.4 * sc, 8.0)) continue;
      if (i % 2 === 0) pines.push({ x, z, s: sc, colIdx: i % pinePalette.length });
      else oaks.push({ x, z, s: sc, colIdx: i % oakPalette.length });
    }

    if (oaks.length > 0) {
      const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, oaks.length);
      const leaves = new THREE.InstancedMesh(leafGeo, leafMat, oaks.length);
      oaks.forEach((t, i) => {
        this._tmpPos.set(t.x, 4.2 * t.s, t.z);
        this._tmpQuat.identity();
        this._tmpScale.set(t.s, t.s, t.s);
        this._tmpMat.compose(this._tmpPos, this._tmpQuat, this._tmpScale);
        trunks.setMatrixAt(i, this._tmpMat);

        this._tmpPos.set(t.x, 10.2 * t.s, t.z);
        this._tmpScale.set(t.s * 1.15, t.s, t.s * 1.15);
        this._tmpMat.compose(this._tmpPos, this._tmpQuat, this._tmpScale);
        leaves.setMatrixAt(i, this._tmpMat);
        leaves.setColorAt(i, oakPalette[t.colIdx]);
      });
      trunks.instanceMatrix.needsUpdate = true;
      leaves.instanceMatrix.needsUpdate = true;
      if (leaves.instanceColor) leaves.instanceColor.needsUpdate = true;
      trunks.computeBoundingSphere();
      leaves.computeBoundingSphere();
      this.group.add(trunks, leaves);
    }

    if (pines.length > 0) {
      const pTrunks = new THREE.InstancedMesh(trunkGeo, trunkMat, pines.length);
      const pCones = new THREE.InstancedMesh(pineGeo, pineMat, pines.length);
      pines.forEach((t, i) => {
        this._tmpPos.set(t.x, 3.8 * t.s, t.z);
        this._tmpQuat.identity();
        this._tmpScale.set(t.s * 0.85, t.s * 0.9, t.s * 0.85);
        this._tmpMat.compose(this._tmpPos, this._tmpQuat, this._tmpScale);
        pTrunks.setMatrixAt(i, this._tmpMat);

        this._tmpPos.set(t.x, 11.2 * t.s, t.z);
        this._tmpScale.set(t.s, t.s, t.s);
        this._tmpMat.compose(this._tmpPos, this._tmpQuat, this._tmpScale);
        pCones.setMatrixAt(i, this._tmpMat);
        pCones.setColorAt(i, pinePalette[t.colIdx]);
      });
      pTrunks.instanceMatrix.needsUpdate = true;
      pCones.instanceMatrix.needsUpdate = true;
      if (pCones.instanceColor) pCones.instanceColor.needsUpdate = true;
      pTrunks.computeBoundingSphere();
      pCones.computeBoundingSphere();
      this.group.add(pTrunks, pCones);
    }

    const tankGeo = new THREE.CylinderGeometry(10, 10, 18, 18);
    const tankMat = new THREE.MeshStandardMaterial({ color: '#9a3412', roughness: 0.7, metalness: 0.35 });
    const pipeGeo = new THREE.CylinderGeometry(2.0, 2.0, 20, 12);
    const pipeMat = new THREE.MeshStandardMaterial({ color: '#64748b', roughness: 0.5, metalness: 0.6 });
    [
      new THREE.Vector3(105, 9, -20),
      new THREE.Vector3(-105, 9, 95),
    ].forEach((pos) => {
      if (!this.reserveProp(pos.x, pos.z, 16, 6)) return;
      const tGroup = new THREE.Group();
      tGroup.position.copy(pos);
      tGroup.add(new THREE.Mesh(tankGeo, tankMat));
      const pipe = new THREE.Mesh(pipeGeo, pipeMat);
      pipe.rotation.z = Math.PI / 2;
      pipe.position.set(11, 3, 0);
      tGroup.add(pipe);
      this.group.add(tGroup);
    });

    this.disposables.push(trunkGeo, trunkMat, leafGeo, leafMat, pineGeo, pineMat, tankGeo, tankMat, pipeGeo, pipeMat);
  }

  private buildSkylineTowersAndProps(): void {
    // Illuminated Urban Towers + Park Pines & Oaks verified non-overlapping
    const winCanvas = document.createElement('canvas');
    winCanvas.width = 128;
    winCanvas.height = 256;
    const wCtx = winCanvas.getContext('2d')!;
    wCtx.fillStyle = '#0f172a';
    wCtx.fillRect(0, 0, 128, 256);
    for (let y = 10; y < 248; y += 16) {
      for (let x = 8; x < 120; x += 16) {
        const lit = ((x * 3 + y * 5) % 7) > 1;
        wCtx.fillStyle = lit ? ((x + y) % 3 === 0 ? '#bae6fd' : '#fef08a') : '#1e293b';
        wCtx.fillRect(x, y, 10, 10);
      }
    }
    const winTex = new THREE.CanvasTexture(winCanvas);
    winTex.colorSpace = THREE.SRGBColorSpace;
    winTex.wrapS = THREE.RepeatWrapping;
    winTex.wrapT = THREE.RepeatWrapping;

    const bGeo = new THREE.BoxGeometry(1, 1, 1);
    const bMat = new THREE.MeshStandardMaterial({
      map: winTex,
      emissiveMap: winTex,
      emissive: '#ffffff',
      emissiveIntensity: 0.48,
      roughness: 0.35,
      metalness: 0.65,
    });

    const towers: { x: number; h: number; z: number; sx: number; sz: number }[] = [];
    for (let i = 0; i < 48; i++) {
      const a = (i / 48) * Math.PI * 2;
      const r = 248 + (i % 4) * 34;
      const cx = this.loopCx + Math.cos(a) * r;
      const cz = this.loopCz + Math.sin(a) * r;
      const sx = 14 + (i % 3) * 4;
      const sz = 14 + ((i + 1) % 3) * 4;
      const h = 42 + (i % 5) * 18;
      if (!this.reserveProp(cx, cz, Math.max(sx, sz) * 0.9, 12.0)) continue;
      towers.push({ x: cx, h, z: cz, sx, sz });
    }
    if (towers.length > 0) {
      const inst = new THREE.InstancedMesh(bGeo, bMat, towers.length);
      towers.forEach((tw, i) => {
        this._tmpPos.set(tw.x, tw.h / 2, tw.z);
        this._tmpQuat.identity();
        this._tmpScale.set(tw.sx, tw.h, tw.sz);
        this._tmpMat.compose(this._tmpPos, this._tmpQuat, this._tmpScale);
        inst.setMatrixAt(i, this._tmpMat);
      });
      inst.instanceMatrix.needsUpdate = true;
      inst.computeBoundingSphere();
      this.group.add(inst);
    }

    // Lush city park trees placed along outer perimeter (clear of tracks)
    const tGeo = new THREE.CylinderGeometry(0.65, 0.95, 7, 7);
    const tMat = new THREE.MeshStandardMaterial({ color: '#78350f', roughness: 0.9 });
    const cGeo = new THREE.DodecahedronGeometry(3.6, 1);
    const cMat = new THREE.MeshStandardMaterial({ color: '#16a34a', roughness: 0.72 });
    const trees: { x: number; z: number; s: number }[] = [];
    for (let i = 0; i < 72; i++) {
      const idx = Math.floor((i / 72) * SAMPLE_COUNT) % SAMPLE_COUNT;
      const s = this.samples[idx];
      const side = i % 2 === 0 ? 1 : -1;
      const dist = BARRIER_HALF_WIDTH + 9.5 + (i % 4) * 6;
      const x = s.point.x + s.right.x * side * dist;
      const z = s.point.z + s.right.z * side * dist;
      if (!this.isOutwardFromLoop(x, z, s)) continue;
      const sc = 0.85 + (i % 3) * 0.25;
      if (!this.reserveProp(x, z, 4.4 * sc, 5.5)) continue;
      trees.push({ x, z, s: sc });
    }
    if (trees.length > 0) {
      const tInst = new THREE.InstancedMesh(tGeo, tMat, trees.length);
      const cInst = new THREE.InstancedMesh(cGeo, cMat, trees.length);
      trees.forEach((tr, i) => {
        this._tmpPos.set(tr.x, 3.5 * tr.s, tr.z);
        this._tmpQuat.identity();
        this._tmpScale.set(tr.s, tr.s, tr.s);
        this._tmpMat.compose(this._tmpPos, this._tmpQuat, this._tmpScale);
        tInst.setMatrixAt(i, this._tmpMat);

        this._tmpPos.set(tr.x, 8.2 * tr.s, tr.z);
        this._tmpMat.compose(this._tmpPos, this._tmpQuat, this._tmpScale);
        cInst.setMatrixAt(i, this._tmpMat);
      });
      tInst.instanceMatrix.needsUpdate = true;
      cInst.instanceMatrix.needsUpdate = true;
      this.group.add(tInst, cInst);
    }

    this.disposables.push(winTex, bGeo, bMat, tGeo, tMat, cGeo, cMat);
  }

  private buildStartStraightBleachers(
    crowdCoords: { x: number; y: number; z: number; yaw: number; scale: number }[]
  ): void {
    // Tiered Grandstand Bleachers along outer start/finish straight on EVERY map populated with cheering Mushroom Toads!
    const s = this.samples[6];
    let bleacherSide = 1;
    const outX = s.point.x + s.right.x * 28;
    const outZ = s.point.z + s.right.z * 28;
    if (!this.isOutwardFromLoop(outX, outZ, s)) bleacherSide = -1;

    const bPos = s.point.clone().addScaledVector(s.right, bleacherSide * (BARRIER_HALF_WIDTH + 9.5));
    if (!this.reserveProp(bPos.x, bPos.z, 13.0, 5.0)) return;

    const trackYaw = Math.atan2(s.tangent.x, s.tangent.z);
    const faceYaw = trackYaw + (bleacherSide > 0 ? -Math.PI / 2 : Math.PI / 2);

    const standMat = new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.65, metalness: 0.25 });
    const stepGeo = new THREE.BoxGeometry(28, 1.6, 3.2);
    const roofGeo = new THREE.BoxGeometry(30, 0.8, 10.5);
    const roofMat = new THREE.MeshStandardMaterial({ color: this.mapDef.dividerColor, roughness: 0.45 });

    const stand = new THREE.Group();
    stand.position.set(bPos.x, Math.max(0, s.point.y), bPos.z);
    stand.rotation.y = faceYaw;

    for (let row = 0; row < 3; row++) {
      const step = new THREE.Mesh(stepGeo, standMat);
      step.position.set(0, 0.8 + row * 1.55, -row * 2.8);
      step.castShadow = true;
      step.receiveShadow = true;
      stand.add(step);

      // Compute world coordinates for 14 cheering Toads per row
      for (let seat = 0; seat < 14; seat++) {
        const localX = -12.2 + seat * 1.88;
        const localY = 1.65 + row * 1.55;
        const localZ = -row * 2.8;
        const cosY = Math.cos(faceYaw);
        const sinY = Math.sin(faceYaw);
        const wx = stand.position.x + localX * cosY + localZ * sinY;
        const wz = stand.position.z - localX * sinY + localZ * cosY;
        crowdCoords.push({
          x: wx,
          y: stand.position.y + localY,
          z: wz,
          yaw: faceYaw,
          scale: 0.88 + ((seat + row) % 3) * 0.08,
        });
      }
    }

    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.set(0, 9.5, -3.0);
    roof.rotation.x = 0.14;
    roof.castShadow = true;
    stand.add(roof);

    this.group.add(stand);
    this.disposables.push(standMat, stepGeo, roofGeo, roofMat);
  }

  private buildStadiumColiseum(
    crowdCoords: { x: number; y: number; z: number; yaw: number; scale: number }[]
  ): void {
    const cx = 86;
    const cz = -16;
    const tiers = [
      { radius: 245, y: 12, height: 18, color: '#1e293b' },
      { radius: 266, y: 28, height: 22, color: '#0f172a' },
      { radius: 286, y: 46, height: 14, color: '#334155' },
    ];
    tiers.forEach((tier) => {
      const ringGeo = new THREE.CylinderGeometry(tier.radius, tier.radius - 16, tier.height, 48, 1, true);
      const ringMat = new THREE.MeshStandardMaterial({
        color: tier.color,
        roughness: 0.75,
        metalness: 0.25,
        side: THREE.BackSide,
      });
      const mesh = new THREE.Mesh(ringGeo, ringMat);
      mesh.position.set(cx, tier.y, cz);
      this.group.add(mesh);
      this.disposables.push(ringGeo, ringMat);
    });

    const coliseumCount = 720;
    for (let i = 0; i < coliseumCount; i++) {
      const angle = (i / coliseumCount) * Math.PI * 2 * 3 + (Math.random() - 0.5) * 0.05;
      const tierIdx = i % 2;
      const r = tierIdx === 0 ? 236 + Math.random() * 6 : 254 + Math.random() * 6;
      const y = tierIdx === 0 ? 11 + Math.random() * 8 : 26 + Math.random() * 10;
      crowdCoords.push({
        x: cx + Math.cos(angle) * r,
        y,
        z: cz + Math.sin(angle) * r,
        yaw: -angle - Math.PI / 2,
        scale: 0.9 + Math.random() * 0.35,
      });
    }

    // Coliseum Infield Paddock Tents & Landscaped Shrubs (collision-checked)
    const tentGeo = new THREE.ConeGeometry(5.5, 4.5, 4);
    const tentBaseGeo = new THREE.BoxGeometry(7.2, 3.2, 7.2);
    const tentMat = new THREE.MeshStandardMaterial({ color: '#ef4444', roughness: 0.45 });
    const tentWallMat = new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.6 });
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + 0.3;
      const tx = cx + Math.cos(a) * 62;
      const tz = cz + Math.sin(a) * 62;
      if (!this.reserveProp(tx, tz, 6.5, 6.0)) continue;
      const tent = new THREE.Group();
      tent.position.set(tx, 0, tz);
      const base = new THREE.Mesh(tentBaseGeo, tentWallMat);
      base.position.y = 1.6;
      tent.add(base);
      const top = new THREE.Mesh(tentGeo, tentMat);
      top.position.y = 5.4;
      top.rotation.y = Math.PI / 4;
      tent.add(top);
      this.group.add(tent);
    }

    const roofRingGeo = new THREE.TorusGeometry(278, 4.2, 10, 64);
    roofRingGeo.rotateX(Math.PI / 2);
    const roofRingMat = new THREE.MeshStandardMaterial({ color: '#1e293b', metalness: 0.85, roughness: 0.28 });
    const roofRing = new THREE.Mesh(roofRingGeo, roofRingMat);
    roofRing.position.set(cx, 58, cz);
    this.group.add(roofRing);

    const neonHaloGeo = new THREE.TorusGeometry(272, 0.85, 8, 64);
    neonHaloGeo.rotateX(Math.PI / 2);
    const neonHaloMat = new THREE.MeshBasicMaterial({ color: '#38bdf8' });
    const neonHalo = new THREE.Mesh(neonHaloGeo, neonHaloMat);
    neonHalo.position.set(cx, 54, cz);
    this.group.add(neonHalo);
    this.disposables.push(
      tentGeo,
      tentBaseGeo,
      tentMat,
      tentWallMat,
      roofRingGeo,
      roofRingMat,
      neonHaloGeo,
      neonHaloMat
    );
  }

  private buildToadCrowdMeshes(
    crowdCoords: { x: number; y: number; z: number; yaw: number; scale: number }[]
  ): void {
    if (crowdCoords.length === 0) return;
    this.spectatorCount = crowdCoords.length;
    this.spectatorBaseCoords = crowdCoords;
    this.spectatorPhases = new Float32Array(this.spectatorCount);

    // Multi-part 3D Mushroom-Kingdom Toad Character Crowd (no random pills!):
    // 1) Vest Torso + Stubby Arms, 2) Cream Toad Head, 3) Colorful Mushroom Cap Dome, 4) Polka Spots
    const vestGeo = new THREE.CylinderGeometry(0.44, 0.56, 0.86, 8);
    vestGeo.translate(0, 0.43, 0);
    const headGeo = new THREE.SphereGeometry(0.44, 10, 8);
    headGeo.translate(0, 1.05, 0);
    const capGeo = new THREE.SphereGeometry(0.84, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.62);
    capGeo.scale(1.06, 0.88, 1.06);
    capGeo.translate(0, 1.24, 0);
    const spotGeo = new THREE.SphereGeometry(0.24, 6, 5);

    const vestMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.55 });
    const headMat = new THREE.MeshStandardMaterial({ color: '#fed7aa', roughness: 0.65 });
    const capMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.35 });
    const spotMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.35 });

    const bodyInst = new THREE.InstancedMesh(vestGeo, vestMat, this.spectatorCount);
    const headInst = new THREE.InstancedMesh(headGeo, headMat, this.spectatorCount);
    const capInst = new THREE.InstancedMesh(capGeo, capMat, this.spectatorCount);
    const spotInst = new THREE.InstancedMesh(spotGeo, spotMat, this.spectatorCount * 3);

    bodyInst.frustumCulled = false;
    headInst.frustumCulled = false;
    capInst.frustumCulled = false;
    spotInst.frustumCulled = false;

    const vestColors = [
      new THREE.Color('#2563eb'),
      new THREE.Color('#dc2626'),
      new THREE.Color('#16a34a'),
      new THREE.Color('#9333ea'),
      new THREE.Color('#f97316'),
    ];
    const capColors = [
      new THREE.Color('#ef4444'),
      new THREE.Color('#3b82f6'),
      new THREE.Color('#22c55e'),
      new THREE.Color('#facc15'),
      new THREE.Color('#ec4899'),
    ];

    const spotVec = new THREE.Vector3();
    for (let i = 0; i < this.spectatorCount; i++) {
      const c = crowdCoords[i];
      this.spectatorPhases[i] = (i * 1.37) % (Math.PI * 2);

      this._tmpPos.set(c.x, c.y, c.z);
      this._tmpQuat.setFromAxisAngle(this._upAxis, c.yaw);
      this._tmpScale.setScalar(c.scale);
      this._tmpMat.compose(this._tmpPos, this._tmpQuat, this._tmpScale);

      bodyInst.setMatrixAt(i, this._tmpMat);
      headInst.setMatrixAt(i, this._tmpMat);
      capInst.setMatrixAt(i, this._tmpMat);

      bodyInst.setColorAt(i, vestColors[i % vestColors.length]);
      capInst.setColorAt(i, capColors[(i + 2) % capColors.length]);

      for (let sp = 0; sp < 3; sp++) {
        spotVec.copy(this.crowdSpotOffsets[sp]).multiplyScalar(c.scale).applyQuaternion(this._tmpQuat);
        this._tmpPos.set(c.x + spotVec.x, c.y + spotVec.y, c.z + spotVec.z);
        this._tmpMat.compose(this._tmpPos, this._tmpQuat, this._tmpScale);
        spotInst.setMatrixAt(i * 3 + sp, this._tmpMat);
      }
    }

    bodyInst.instanceMatrix.needsUpdate = true;
    headInst.instanceMatrix.needsUpdate = true;
    capInst.instanceMatrix.needsUpdate = true;
    spotInst.instanceMatrix.needsUpdate = true;
    if (bodyInst.instanceColor) bodyInst.instanceColor.needsUpdate = true;
    if (capInst.instanceColor) capInst.instanceColor.needsUpdate = true;
    bodyInst.computeBoundingSphere();
    headInst.computeBoundingSphere();
    capInst.computeBoundingSphere();
    spotInst.computeBoundingSphere();

    this.spectatorsMesh = bodyInst;
    this.spectatorHeadMesh = headInst;
    this.spectatorCapMesh = capInst;
    this.spectatorSpotMesh = spotInst;
    this.group.add(bodyInst, headInst, capInst, spotInst);

    this.disposables.push(vestGeo, headGeo, capGeo, spotGeo, vestMat, headMat, capMat, spotMat);
  }

  private buildTunnelAndTracksideBoards(): void {
    const archMat = new THREE.MeshStandardMaterial({ color: '#0f172a', metalness: 0.75, roughness: 0.3 });
    const neonArchMat = new THREE.MeshBasicMaterial({ color: '#f97316' });
    // Widen neon tunnel arches outside barriers (BARRIER_HALF_WIDTH + 2.8 = 19.2)
    const archGeo = new THREE.TorusGeometry(BARRIER_HALF_WIDTH + 2.8, 1.15, 8, 28, Math.PI);
    const stripGeo = new THREE.TorusGeometry(BARRIER_HALF_WIDTH + 1.7, 0.24, 6, 28, Math.PI);

    for (let i = 0; i < 5; i++) {
      const tVal = 0.59 + i * 0.009;
      const idx = Math.floor(tVal * SAMPLE_COUNT) % SAMPLE_COUNT;
      const s = this.samples[idx];
      const yaw = Math.atan2(s.tangent.x, s.tangent.z);
      const archGroup = new THREE.Group();
      archGroup.position.copy(s.point);
      archGroup.rotation.y = yaw;
      archGroup.add(new THREE.Mesh(archGeo, archMat));
      archGroup.add(new THREE.Mesh(stripGeo, neonArchMat));
      this.group.add(archGroup);
    }

    const boardCanvas = document.createElement('canvas');
    boardCanvas.width = 256;
    boardCanvas.height = 64;
    const bCtx = boardCanvas.getContext('2d')!;
    bCtx.fillStyle = '#0f172a';
    bCtx.fillRect(0, 0, 256, 64);
    bCtx.fillStyle = '#38bdf8';
    bCtx.fillRect(0, 0, 256, 8);
    bCtx.fillRect(0, 56, 256, 8);
    bCtx.fillStyle = '#fde047';
    bCtx.font = '900 30px sans-serif';
    bCtx.textAlign = 'center';
    bCtx.textBaseline = 'middle';
    bCtx.fillText('SHRITIZ GP', 128, 33);

    const boardTex = new THREE.CanvasTexture(boardCanvas);
    boardTex.colorSpace = THREE.SRGBColorSpace;
    const boardGeo = new THREE.BoxGeometry(10, 2.5, 0.4);
    const boardMat = new THREE.MeshBasicMaterial({ map: boardTex });

    for (let i = 0; i < 16; i++) {
      const idx = Math.floor(((i + 0.5) / 16) * SAMPLE_COUNT) % SAMPLE_COUNT;
      const s = this.samples[idx];
      const side = i % 2 === 0 ? 1 : -1;
      const bPos = s.point.clone().addScaledVector(s.right, side * (BARRIER_HALF_WIDTH + 3.6));
      if (!this.isOutwardFromLoop(bPos.x, bPos.z, s)) continue;
      if (!this.reserveProp(bPos.x, bPos.z, 5.2, 3.0)) continue;
      const board = new THREE.Mesh(boardGeo, boardMat);
      board.position.set(bPos.x, s.point.y + 2.4, bPos.z);
      board.rotation.y = Math.atan2(s.tangent.x, s.tangent.z) + (side > 0 ? -Math.PI / 2 : Math.PI / 2);
      this.group.add(board);
    }

    this.disposables.push(archMat, neonArchMat, archGeo, stripGeo, boardTex, boardGeo, boardMat);
  }

  private buildFloodlightsAndJumbotrons(): void {
    const cx = 86;
    const cz = -16;
    const towerMat = new THREE.MeshStandardMaterial({ color: '#334155', metalness: 0.85, roughness: 0.25 });
    const bulbMat = new THREE.MeshBasicMaterial({ color: '#fef9c3' });
    const beamMat = new THREE.MeshBasicMaterial({
      color: '#fde68a',
      transparent: true,
      opacity: 0.065,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });

    const poleGeo = new THREE.CylinderGeometry(1.1, 1.8, 68, 10);
    const headGeo = new THREE.BoxGeometry(12, 4.5, 2.2);
    const coneGeo = new THREE.ConeGeometry(28, 90, 20, 1, true);
    coneGeo.translate(0, -45, 0);

    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + 0.2;
      const r = 242;
      const rig = new THREE.Group();
      rig.position.set(cx + Math.cos(a) * r, 34, cz + Math.sin(a) * r);
      rig.lookAt(cx, 10, cz);

      rig.add(new THREE.Mesh(poleGeo, towerMat));
      const head = new THREE.Mesh(headGeo, bulbMat);
      head.position.set(0, 34, 2);
      rig.add(head);

      const beam = new THREE.Mesh(coneGeo, beamMat);
      beam.position.set(0, 33, 2);
      beam.rotation.x = Math.PI / 3.1;
      rig.add(beam);

      const skyBeamPivot = new THREE.Group();
      skyBeamPivot.position.set(0, 34, 0);
      const skyBeam = new THREE.Mesh(coneGeo, beamMat);
      skyBeam.rotation.x = Math.PI * 0.86;
      skyBeamPivot.add(skyBeam);
      rig.add(skyBeamPivot);
      this.searchlights.push(skyBeamPivot);
      this.group.add(rig);
    }

    const jGeo = new THREE.BoxGeometry(44, 22, 3);
    const frameMat = new THREE.MeshStandardMaterial({ color: '#0f172a', metalness: 0.7, roughness: 0.3 });
    const screenGeo = new THREE.PlaneGeometry(41, 19.5);
    [
      { pos: new THREE.Vector3(cx, 44, cz - 216), rotY: 0 },
      { pos: new THREE.Vector3(cx, 44, cz + 216), rotY: Math.PI },
    ].forEach((loc) => {
      const jt = createJumbotronTexture();
      this.jumbotrons.push({ ctx: jt.ctx, texture: jt.texture });
      const screenMat = new THREE.MeshBasicMaterial({ map: jt.texture });
      const jGroup = new THREE.Group();
      jGroup.position.copy(loc.pos);
      jGroup.rotation.y = loc.rotY;
      jGroup.add(new THREE.Mesh(jGeo, frameMat));
      const scr = new THREE.Mesh(screenGeo, screenMat);
      scr.position.z = 1.6;
      jGroup.add(scr);
      this.group.add(jGroup);
      this.disposables.push(jt.texture, screenMat);
    });

    const holoGeo = new THREE.CylinderGeometry(7.5, 7.5, 11, 24, 1, true);
    for (let i = 0; i < 4; i++) {
      const spec = ROSTER[i * 3];
      const holoMat = new THREE.MeshBasicMaterial({
        color: spec.neonColor,
        transparent: true,
        opacity: 0.34,
        side: THREE.DoubleSide,
        wireframe: i % 2 === 1,
      });
      const holo = new THREE.Mesh(holoGeo, holoMat);
      const ang = (i / 4) * Math.PI * 2 + 0.5;
      holo.position.set(cx + Math.cos(ang) * 44, 22, cz + Math.sin(ang) * 44);
      this.group.add(holo);
      this.holoBillboards.push(holo);
      this.disposables.push(holoMat);
    }

    this.disposables.push(
      towerMat,
      bulbMat,
      beamMat,
      poleGeo,
      headGeo,
      coneGeo,
      jGeo,
      frameMat,
      screenGeo,
      holoGeo
    );
  }

  private buildConfetti(): void {
    const count = 360;
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    this.confettiVel = new Float32Array(count * 3);
    const colors = [
      new THREE.Color('#ef4444'),
      new THREE.Color('#facc15'),
      new THREE.Color('#38bdf8'),
      new THREE.Color('#4ade80'),
      new THREE.Color('#f472b6'),
    ];
    for (let i = 0; i < count; i++) {
      pos[i * 3] = 86 + (Math.random() - 0.5) * 340;
      pos[i * 3 + 1] = 8 + Math.random() * 48;
      pos[i * 3 + 2] = -16 + (Math.random() - 0.5) * 340;
      this.confettiVel[i * 3] = (Math.random() - 0.5) * 2.5;
      this.confettiVel[i * 3 + 1] = -2.0 - Math.random() * 2.5;
      this.confettiVel[i * 3 + 2] = (Math.random() - 0.5) * 2.5;
      const c = colors[i % colors.length];
      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const mat = new THREE.PointsMaterial({ size: 1.25, vertexColors: true, transparent: true, opacity: 0.9 });
    this.confettiPoints = new THREE.Points(geo, mat);
    this.group.add(this.confettiPoints);
    this.disposables.push(geo, mat);
  }

  private buildPaddockStage(): void {
    this.paddockGroup.position.set(0, 260, 0);

    const wallCanvas = document.createElement('canvas');
    wallCanvas.width = 512;
    wallCanvas.height = 512;
    const wCtx = wallCanvas.getContext('2d')!;
    const grad = wCtx.createLinearGradient(0, 0, 512, 512);
    grad.addColorStop(0, '#0ea5e9');
    grad.addColorStop(0.5, '#38bdf8');
    grad.addColorStop(1, '#0284c7');
    wCtx.fillStyle = grad;
    wCtx.fillRect(0, 0, 512, 512);

    wCtx.fillStyle = 'rgba(255, 255, 255, 0.14)';
    for (let y = 0; y < 512; y += 64) {
      for (let x = 0; x < 512; x += 64) {
        if (((x + y) / 64) % 2 === 0) {
          wCtx.fillRect(x, y, 64, 64);
        }
      }
    }
    wCtx.fillStyle = 'rgba(255,255,255,0.22)';
    wCtx.font = '900 32px sans-serif';
    wCtx.fillText('SHRITIZ GP', 40, 120);
    wCtx.fillText('GRAND PRIX', 250, 360);

    const wallTex = new THREE.CanvasTexture(wallCanvas);
    wallTex.colorSpace = THREE.SRGBColorSpace;
    wallTex.wrapS = THREE.RepeatWrapping;
    wallTex.wrapT = THREE.RepeatWrapping;
    wallTex.repeat.set(5, 2);
    this.paddockBackdropTex = wallTex;

    const domeGeo = new THREE.CylinderGeometry(24, 24, 28, 48, 1, true);
    const domeMat = new THREE.MeshBasicMaterial({ map: wallTex, side: THREE.BackSide });
    const dome = new THREE.Mesh(domeGeo, domeMat);
    dome.position.y = 5;
    this.paddockGroup.add(dome);

    const floorGeo = new THREE.CircleGeometry(24, 48);
    floorGeo.rotateX(-Math.PI / 2);
    const floorMat = new THREE.MeshStandardMaterial({
      map: wallTex,
      roughness: 0.25,
      metalness: 0.2,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    this.paddockGroup.add(floor);

    this.paddockGroup.add(this.paddockTurntable);
    this.group.add(this.paddockGroup);
    this.disposables.push(wallTex, domeGeo, domeMat, floorGeo, floorMat);
  }

  public updateJumbotrons(
    standings: { name: string; color: string; rank: number; lap: number }[],
    phaseText: string
  ): void {
    for (const j of this.jumbotrons) {
      updateJumbotronCanvas(j.ctx, j.texture, standings, phaseText);
    }
  }

  public animate(dt: number, elapsed: number): void {
    this.textures.boostPadMap.offset.y -= dt * 1.9;

    if (this.paddockBackdropTex) {
      this.paddockBackdropTex.offset.x += dt * 0.08;
      this.paddockBackdropTex.offset.y += dt * 0.04;
    }

    for (let i = 0; i < this.clouds.length; i++) {
      this.clouds[i].rotation.y += dt * 0.01;
    }

    for (let i = 0; i < this.palmCrowns.length; i++) {
      this.palmCrowns[i].rotation.z = Math.sin(elapsed * 1.8 + i) * 0.08;
    }

    for (let i = 0; i < this.floatingBalloons.length; i++) {
      const b = this.floatingBalloons[i];
      b.group.position.y = b.baseY + Math.sin(elapsed * 0.7 + b.phase) * 3.5;
      b.group.rotation.y += dt * 0.18;
    }

    for (let i = 0; i < this.fountainRings.length; i++) {
      const ring = this.fountainRings[i];
      ring.position.y = 2.6 + i * 2.2 + Math.sin(elapsed * 3.5 + i * 1.5) * 0.45;
      ring.rotation.z += dt * (1.2 + i * 0.6);
    }

    for (const hz of this.trackHazards) {
      if (hz.kind === 'bumper') {
        const idx = Math.floor(hz.t * SAMPLE_COUNT) % SAMPLE_COUNT;
        const s = this.samples[idx];
        const lat = Math.sin(elapsed * hz.speed + hz.t * 15) * hz.lateralAmp;
        hz.x = s.point.x + s.right.x * lat;
        hz.y = s.point.y;
        hz.z = s.point.z + s.right.z * lat;
        hz.mesh.position.set(hz.x, hz.y, hz.z);
        hz.mesh.rotation.y += dt * 3.5;
      }
    }

    for (const box of this.itemBoxes) {
      if (box.respawnTimer > 0) {
        box.respawnTimer -= dt;
        box.mesh.visible = box.respawnTimer <= 0;
      } else {
        box.mesh.rotation.y += dt * 1.9;
        box.mesh.position.y = box.position.y + Math.sin(elapsed * 3.2 + box.id) * 0.22;
      }
    }

    for (let i = 0; i < this.holoBillboards.length; i++) {
      this.holoBillboards[i].rotation.y += dt * (i % 2 === 0 ? 0.55 : -0.55);
    }

    for (let i = 0; i < this.bannerFlags.length; i++) {
      this.bannerFlags[i].rotation.y = Math.sin(elapsed * 5.2 + i * 0.8) * 0.25;
    }

    for (let i = 0; i < this.searchlights.length; i++) {
      this.searchlights[i].rotation.z = Math.sin(elapsed * 0.75 + i * 1.1) * 0.42;
    }

    if (
      this.spectatorsMesh &&
      this.spectatorHeadMesh &&
      this.spectatorCapMesh &&
      this.spectatorSpotMesh
    ) {
      const spotVec = this._tmpPos;
      for (let i = 0; i < this.spectatorCount; i++) {
        const c = this.spectatorBaseCoords[i];
        const hop = Math.abs(Math.sin(elapsed * 5.8 + this.spectatorPhases[i])) * 0.65;
        this._tmpQuat.setFromAxisAngle(this._upAxis, c.yaw);
        this._tmpScale.setScalar(c.scale);

        this._tmpPos.set(c.x, c.y + hop, c.z);
        this._tmpMat.compose(this._tmpPos, this._tmpQuat, this._tmpScale);
        this.spectatorsMesh.setMatrixAt(i, this._tmpMat);
        this.spectatorHeadMesh.setMatrixAt(i, this._tmpMat);
        this.spectatorCapMesh.setMatrixAt(i, this._tmpMat);

        for (let sp = 0; sp < 3; sp++) {
          spotVec.copy(this.crowdSpotOffsets[sp]).multiplyScalar(c.scale).applyQuaternion(this._tmpQuat);
          spotVec.set(c.x + spotVec.x, c.y + hop + spotVec.y, c.z + spotVec.z);
          this._tmpMat.compose(spotVec, this._tmpQuat, this._tmpScale);
          this.spectatorSpotMesh.setMatrixAt(i * 3 + sp, this._tmpMat);
        }
      }
      this.spectatorsMesh.instanceMatrix.needsUpdate = true;
      this.spectatorHeadMesh.instanceMatrix.needsUpdate = true;
      this.spectatorCapMesh.instanceMatrix.needsUpdate = true;
      this.spectatorSpotMesh.instanceMatrix.needsUpdate = true;
    }

    if (this.confettiPoints) {
      const posAttr = this.confettiPoints.geometry.getAttribute('position') as THREE.BufferAttribute;
      const arr = posAttr.array as Float32Array;
      for (let i = 0; i < arr.length; i += 3) {
        arr[i] += this.confettiVel[i] * dt;
        arr[i + 1] += this.confettiVel[i + 1] * dt;
        arr[i + 2] += this.confettiVel[i + 2] * dt;
        if (arr[i + 1] < 2) {
          arr[i + 1] = 48 + Math.random() * 12;
        }
      }
      posAttr.needsUpdate = true;
    }
  }

  public dispose(): void {
    this.disposables.forEach((d) => d.dispose());
  }
}
