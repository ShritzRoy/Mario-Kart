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
}

export interface TrackProjection {
  sampleIndex: number;
  t: number;
  point: THREE.Vector3;
  tangent: THREE.Vector3;
  right: THREE.Vector3;
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
export const SAMPLE_COUNT = 480;

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
  private spectatorCount = 720;
  private spectatorBaseMatrices: THREE.Matrix4[] = [];
  private spectatorPhases: Float32Array = new Float32Array(0);
  private holoBillboards: THREE.Mesh[] = [];
  private bannerFlags: THREE.Mesh[] = [];
  private searchlights: THREE.Group[] = [];
  private clouds: THREE.Group[] = [];
  private palmCrowns: THREE.Group[] = [];
  private paddockBackdropTex: THREE.CanvasTexture | null = null;
  private confettiPoints: THREE.Points | null = null;
  private confettiVel: Float32Array = new Float32Array(0);
  private jumbotrons: {
    ctx: CanvasRenderingContext2D;
    texture: THREE.CanvasTexture;
  }[] = [];
  private boostPadMat: THREE.MeshStandardMaterial;
  private disposables: { dispose: () => void }[] = [];

  private _tmpMat = new THREE.Matrix4();
  private _tmpPos = new THREE.Vector3();
  private _tmpQuat = new THREE.Quaternion();
  private _tmpScale = new THREE.Vector3();

  constructor(private textures: ProceduralTextureSet, mapDef: MapDefinition) {
    this.mapDef = mapDef;
    this.rampTCenters = mapDef.rampTCenters;

    this.curve = new THREE.CatmullRomCurve3(mapDef.controlPoints, true, 'catmullrom', 0.45);
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

    if (mapDef.theme === 'plaza') {
      this.buildShritizRockArch(0.055, true);
      this.buildShritizRockArch(0.57, true);
      this.buildCoconutPlazaEnvironment();
    } else if (mapDef.theme === 'stadium') {
      this.buildStadiumColiseum();
      this.buildTunnelAndTracksideBoards();
      this.buildFloodlightsAndJumbotrons();
      this.buildConfetti();
    } else if (mapDef.theme === 'sunlit') {
      this.buildShritizRockArch(0.06, false);
      this.buildSunlitCountrysideProps();
      this.buildTunnelAndTracksideBoards();
    } else {
      this.buildShritizRockArch(0.06, false);
      this.buildSkylineTowersAndProps();
      this.buildTunnelAndTracksideBoards();
    }

    this.buildPaddockStage();
  }

  private sampleCurve(): void {
    const up = new THREE.Vector3(0, 1, 0);
    for (let i = 0; i < SAMPLE_COUNT; i++) {
      const t = i / SAMPLE_COUNT;
      const point = this.curve.getPointAt(t);
      const tangent = this.curve.getTangentAt(t).normalize();
      const right = new THREE.Vector3().crossVectors(tangent, up).normalize();

      for (const rc of this.rampTCenters) {
        const dt = Math.abs(t - rc);
        if (dt < 0.024) {
          const factor = Math.cos((dt / 0.024) * (Math.PI / 2));
          point.y += factor * 2.6;
        }
      }

      this.samples.push({ t, point, tangent, right });
    }
  }

  public projectOnTrack(x: number, z: number, hintIndex?: number): TrackProjection {
    let bestIdx = 0;
    let bestDistSq = Infinity;

    if (hintIndex !== undefined && hintIndex >= 0 && hintIndex < SAMPLE_COUNT) {
      for (let offset = -36; offset <= 36; offset++) {
        const idx = (hintIndex + offset + SAMPLE_COUNT) % SAMPLE_COUNT;
        const p = this.samples[idx].point;
        const dx = x - p.x;
        const dz = z - p.z;
        const d2 = dx * dx + dz * dz;
        if (d2 < bestDistSq) {
          bestDistSq = d2;
          bestIdx = idx;
        }
      }
      if (bestDistSq > 950) {
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
    const dz = z - s.point.z;
    const lateral = dx * s.right.x + dz * s.right.z;
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

    const skyGeo = new THREE.SphereGeometry(680, 32, 20);
    const skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        uTop: { value: topC },
        uMid: { value: midC },
        uHorizon: { value: horC },
      },
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

    const cloudMat = new THREE.MeshBasicMaterial({
      color: this.mapDef.theme === 'stadium' ? '#cbd5e1' : '#ffffff',
      transparent: true,
      opacity: this.mapDef.theme === 'stadium' ? 0.24 : 0.94,
    });
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

    for (let i = 0; i <= segs; i++) {
      const s = this.samples[i % segs];
      const v = i / segs;

      const lx = s.point.x - s.right.x * TRACK_HALF_WIDTH;
      const lz = s.point.z - s.right.z * TRACK_HALF_WIDTH;
      const rx = s.point.x + s.right.x * TRACK_HALF_WIDTH;
      const rz = s.point.z + s.right.z * TRACK_HALF_WIDTH;

      // Top Asphalt Surface (y + 0.06)
      roadPos.push(lx, s.point.y + 0.06, lz, rx, s.point.y + 0.06, rz);
      roadUV.push(0, v, 1, v);

      // Solid Concrete Road Bed Box (Outer Left Top -> Outer Right Top -> Outer Right Bottom -> Outer Left Bottom)
      const oxL = s.point.x - s.right.x * deckOuter;
      const ozL = s.point.z - s.right.z * deckOuter;
      const oxR = s.point.x + s.right.x * deckOuter;
      const ozR = s.point.z + s.right.z * deckOuter;
      const yTop = s.point.y + 0.02;
      const yBot = Math.min(-0.4, s.point.y - deckDepth);
      slabPos.push(
        oxL, yTop, ozL,
        oxR, yTop, ozR,
        oxR, yBot, ozR,
        oxL, yBot, ozL
      );

      // Raised 3D Curb Blocks (inner lip at TRACK_HALF_WIDTH, raised top plateau to BARRIER_HALF_WIDTH)
      const klOutX = s.point.x - s.right.x * (TRACK_HALF_WIDTH + KERB_WIDTH);
      const klOutZ = s.point.z - s.right.z * (TRACK_HALF_WIDTH + KERB_WIDTH);
      const krOutX = s.point.x + s.right.x * (TRACK_HALF_WIDTH + KERB_WIDTH);
      const krOutZ = s.point.z + s.right.z * (TRACK_HALF_WIDTH + KERB_WIDTH);

      kerbPos.push(
        klOutX, s.point.y + 0.32, klOutZ,
        lx, s.point.y + 0.32, lz,
        lx, s.point.y + 0.05, lz,
        rx, s.point.y + 0.05, rz,
        rx, s.point.y + 0.32, rz,
        krOutX, s.point.y + 0.32, krOutZ
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
    // Solid 3D Extruded Jersey Concrete Dividers + Instanced Guardrail Posts along both sides
    const segs = SAMPLE_COUNT;
    const divPos: number[] = [];
    const divUV: number[] = [];
    const divIdx: number[] = [];

    const buildSide = (sideSign: -1 | 1) => {
      const startVertex = divPos.length / 3;
      for (let i = 0; i <= segs; i++) {
        const s = this.samples[i % segs];
        const v = i / segs;
        const inner = BARRIER_HALF_WIDTH - 0.15;
        const mid = BARRIER_HALF_WIDTH + 0.25;
        const outer = BARRIER_HALF_WIDTH + 0.95;

        const pIn = s.point.clone().addScaledVector(s.right, sideSign * inner);
        const pMid = s.point.clone().addScaledVector(s.right, sideSign * mid);
        const pOut = s.point.clone().addScaledVector(s.right, sideSign * outer);

        // 4 vertices cross section: inner bottom, inner sloped top, outer top, outer bottom
        divPos.push(
          pIn.x, s.point.y, pIn.z,
          pMid.x, s.point.y + 1.45, pMid.z,
          pOut.x, s.point.y + 1.45, pOut.z,
          pOut.x, s.point.y, pOut.z
        );
        divUV.push(0, v, 0.5, v, 0.8, v, 1, v);

        if (i < segs) {
          const b = startVertex + i * 4;
          const n = b + 4;
          divIdx.push(
            b, b + 1, n, b + 1, n + 1, n,
            b + 1, b + 2, n + 1, b + 2, n + 2, n + 1,
            b + 2, b + 3, n + 2, b + 3, n + 3, n + 2
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
      metalness: 0.18,
      side: THREE.DoubleSide,
    });
    const divMesh = new THREE.Mesh(divGeo, divMat);
    divMesh.castShadow = true;
    divMesh.receiveShadow = true;
    this.group.add(divMesh);

    // Instanced 3D Highway Bollards / Divider Pylons sitting atop the barriers
    const postCount = Math.floor(segs / 10) * 2;
    const postGeo = new THREE.CylinderGeometry(0.28, 0.34, 1.05, 10);
    const postMat = new THREE.MeshStandardMaterial({
      color: this.mapDef.dividerColor,
      roughness: 0.32,
      metalness: 0.25,
    });
    const postInst = new THREE.InstancedMesh(postGeo, postMat, postCount);

    const capGeo = new THREE.SphereGeometry(0.26, 10, 8);
    const capMat = new THREE.MeshBasicMaterial({ color: '#fef08a' });
    const capInst = new THREE.InstancedMesh(capGeo, capMat, postCount);

    let idxCursor = 0;
    for (let i = 0; i < segs; i += 10) {
      const s = this.samples[i];
      for (const side of [-1, 1]) {
        if (idxCursor >= postCount) break;
        const px = s.point.x + s.right.x * side * (BARRIER_HALF_WIDTH + 0.58);
        const pz = s.point.z + s.right.z * side * (BARRIER_HALF_WIDTH + 0.58);

        this._tmpPos.set(px, s.point.y + 1.9, pz);
        this._tmpQuat.identity();
        this._tmpScale.set(1, 1, 1);
        this._tmpMat.compose(this._tmpPos, this._tmpQuat, this._tmpScale);
        postInst.setMatrixAt(idxCursor, this._tmpMat);

        this._tmpPos.set(px, s.point.y + 2.48, pz);
        this._tmpMat.compose(this._tmpPos, this._tmpQuat, this._tmpScale);
        capInst.setMatrixAt(idxCursor, this._tmpMat);
        idxCursor++;
      }
    }
    postInst.instanceMatrix.needsUpdate = true;
    capInst.instanceMatrix.needsUpdate = true;
    postInst.computeBoundingSphere();
    capInst.computeBoundingSphere();
    this.group.add(postInst, capInst);

    this.disposables.push(divGeo, divMat, postGeo, postMat, capGeo, capMat);
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

    // Stepped sculpted stone base pillars on left & right of track
    const stepGeo = new THREE.BoxGeometry(5.6, 2.8, 5.6);
    [-16.8, 16.8].forEach((x) => {
      for (let st = 0; st < 3; st++) {
        const blk = new THREE.Mesh(stepGeo, baseStoneMat);
        blk.position.set(x + (st % 2 === 0 ? 0.3 : -0.3), 1.4 + st * 2.5, 0);
        blk.scale.set(1 - st * 0.1, 1, 1 - st * 0.08);
        blk.castShadow = true;
        blk.receiveShadow = true;
        archGroup.add(blk);
      }
    });

    // Curved massive sandstone arch spanning above the track
    const archGeo = new THREE.TorusGeometry(16.6, 2.45, 10, 28, Math.PI);
    const archMesh = new THREE.Mesh(archGeo, archSandMat);
    archMesh.position.y = 7.4;
    archMesh.castShadow = true;
    archGroup.add(archMesh);

    // Carved Wooden Plaque Sign reading "SHRITIZ" mounted across the crown!
    const plaqueGeo = new THREE.BoxGeometry(20.5, 4.6, 1.15);
    const plaqueFrame = new THREE.Mesh(plaqueGeo, woodTrimMat);
    plaqueFrame.position.set(0, 19.6, 0);
    plaqueFrame.castShadow = true;
    archGroup.add(plaqueFrame);

    const faceGeo = new THREE.PlaneGeometry(19.6, 4.1);
    const frontSign = new THREE.Mesh(faceGeo, signBoardMat);
    frontSign.position.set(0, 19.6, 0.6);
    archGroup.add(frontSign);

    const backSign = new THREE.Mesh(faceGeo, signBoardMat);
    backSign.position.set(0, 19.6, -0.6);
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
    // Nintendo Coconut Mall / Resort Plaza Storefronts, Swaying Palms, Flower Planters & Shuttle Carts!
    const facadeMat = new THREE.MeshStandardMaterial({
      map: this.textures.plazaWallMap,
      roughness: 0.55,
      metalness: 0.08,
    });
    const roofMat = new THREE.MeshStandardMaterial({
      color: '#facc15',
      roughness: 0.45,
    });
    const buildingGeo = new THREE.BoxGeometry(28, 18, 22);
    const roofGeo = new THREE.BoxGeometry(30, 2.2, 24);

    // Place sunlit mall buildings along straightaways & sweeping corners outside dividers
    for (let i = 0; i < 18; i++) {
      const idx = Math.floor(((i + 0.5) / 18) * SAMPLE_COUNT) % SAMPLE_COUNT;
      const s = this.samples[idx];
      const side = i % 2 === 0 ? 1 : -1;
      const pos = s.point.clone().addScaledVector(s.right, side * 34);

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

    // Swaying Resort Palm Trees along the promenade
    const trunkGeo = new THREE.CylinderGeometry(0.45, 0.75, 11, 8);
    const trunkMat = new THREE.MeshStandardMaterial({ color: '#92400e', roughness: 0.85 });
    const leafGeo = new THREE.ConeGeometry(1.1, 6.2, 5);
    const leafMat = new THREE.MeshStandardMaterial({ color: '#22c55e', roughness: 0.55 });

    for (let i = 0; i < 28; i++) {
      const idx = Math.floor((i / 28) * SAMPLE_COUNT) % SAMPLE_COUNT;
      const s = this.samples[idx];
      const side = i % 2 === 0 ? -1 : 1;
      const pPos = s.point.clone().addScaledVector(s.right, side * (BARRIER_HALF_WIDTH + 3.2));

      const palm = new THREE.Group();
      palm.position.set(pPos.x, s.point.y, pPos.z);

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
      palm.add(crown);
      this.palmCrowns.push(crown);
      this.group.add(palm);
    }

    // Bright Yellow & Blue Resort Shuttle Carts parked beside the plaza
    const busBodyGeo = new THREE.BoxGeometry(3.4, 2.6, 6.4);
    const busMat = new THREE.MeshStandardMaterial({ color: '#facc15', roughness: 0.35, metalness: 0.18 });
    const winGeo = new THREE.BoxGeometry(3.5, 1.0, 4.8);
    const winMat = new THREE.MeshStandardMaterial({ color: '#0ea5e9', roughness: 0.15, metalness: 0.5 });

    for (let i = 0; i < 6; i++) {
      const idx = Math.floor((0.08 + i * 0.15) * SAMPLE_COUNT) % SAMPLE_COUNT;
      const s = this.samples[idx];
      const bus = new THREE.Group();
      const pos = s.point.clone().addScaledVector(s.right, (i % 2 === 0 ? 1 : -1) * 22.5);
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
      if (s.point.y > 1.8) {
        [-10.5, 10.5].forEach((lat) => {
          const p = new THREE.Mesh(pillarGeo, pillarMat);
          p.position.copy(s.point).addScaledVector(s.right, lat);
          p.scale.y = s.point.y + 0.6;
          p.position.y = (s.point.y - 0.5) / 2;
          p.castShadow = true;
          p.receiveShadow = true;
          this.group.add(p);
        });
      }
    }

    // Bright Orange/Gold Suspension Ramp Markers on Jump Crests
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

      [-TRACK_HALF_WIDTH - 1, TRACK_HALF_WIDTH + 1].forEach((lat) => {
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
    const pillarGeo = new THREE.BoxGeometry(1.4, 11.5, 1.4);
    [-14.5, 14.5].forEach((x) => {
      const p = new THREE.Mesh(pillarGeo, pillarMat);
      p.position.set(x, 5.75, 0);
      p.castShadow = true;
      gantry.add(p);
    });

    const beamGeo = new THREE.BoxGeometry(30.6, 2.2, 2.0);
    const beamMat = new THREE.MeshStandardMaterial({ color: '#0f172a', metalness: 0.6, roughness: 0.35 });
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.position.set(0, 11.2, 0);
    gantry.add(beam);

    const bannerGeo = new THREE.PlaneGeometry(26, 1.8);
    const bannerMat = new THREE.MeshBasicMaterial({ map: this.textures.checkerMap, side: THREE.DoubleSide });
    const bannerF = new THREE.Mesh(bannerGeo, bannerMat);
    bannerF.position.set(0, 11.2, 1.05);
    gantry.add(bannerF);
    const bannerB = new THREE.Mesh(bannerGeo, bannerMat);
    bannerB.position.set(0, 11.2, -1.05);
    gantry.add(bannerB);

    const podGeo = new THREE.BoxGeometry(5.8, 1.8, 1.4);
    const pod = new THREE.Mesh(podGeo, pillarMat);
    pod.position.set(0, 9.2, 0);
    gantry.add(pod);

    const lightGeo = new THREE.SphereGeometry(0.5, 16, 16);
    for (let i = 0; i < 3; i++) {
      const lm = new THREE.MeshBasicMaterial({ color: '#334155' });
      const bulb = new THREE.Mesh(lightGeo, lm);
      bulb.position.set(-1.6 + i * 1.6, 9.2, 0.72);
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
      f.position.set(i * 4.2, 13.1, 0);
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

    this.mapDef.boostPads.forEach((cfg) => {
      this.boostPads.push(cfg);
      const idx = Math.floor(cfg.tCenter * SAMPLE_COUNT) % SAMPLE_COUNT;
      const s = this.samples[idx];
      const mesh = new THREE.Mesh(padGeo, this.boostPadMat);
      mesh.position.copy(s.point).addScaledVector(s.right, cfg.lateralOffset);
      mesh.position.y += 0.1;
      mesh.rotation.y = Math.atan2(s.tangent.x, s.tangent.z);
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
        const pos = s.point.clone().addScaledVector(s.right, lat);
        pos.y += 1.5;
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
    const oilGeo = new THREE.CircleGeometry(2.6, 20);
    oilGeo.rotateX(-Math.PI / 2);
    const oilMat = new THREE.MeshStandardMaterial({
      color: '#090d16',
      roughness: 0.08,
      metalness: 0.85,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    this.disposables.push(oilGeo, oilMat);

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
        const mesh = new THREE.Mesh(oilGeo, oilMat);
        const pos = s.point.clone().addScaledVector(s.right, hz.lateralAmp);
        mesh.position.copy(pos);
        mesh.position.y += 0.09;
        this.group.add(mesh);
        this.trackHazards.push({
          kind: 'oil',
          t: hz.t,
          lateralAmp: hz.lateralAmp,
          speed: 0,
          x: pos.x,
          y: pos.y,
          z: pos.z,
          radius: 2.3,
          mesh,
        });
      }
    }
  }

  private buildSunlitCountrysideProps(): void {
    const trunkGeo = new THREE.CylinderGeometry(0.9, 1.3, 9, 8);
    const trunkMat = new THREE.MeshStandardMaterial({ color: '#78350f', roughness: 0.9 });
    const leafGeo = new THREE.DodecahedronGeometry(4.6, 1);
    const treeCount = 85;
    const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, treeCount);
    const leaves = new THREE.InstancedMesh(
      leafGeo,
      new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.78 }),
      treeCount
    );
    const leafPalette = [
      new THREE.Color('#4ade80'),
      new THREE.Color('#22c55e'),
      new THREE.Color('#facc15'),
      new THREE.Color('#f59e0b'),
    ];

    for (let i = 0; i < treeCount; i++) {
      const ang = (i / treeCount) * Math.PI * 2 + (i % 3) * 0.14;
      const dist = 215 + (i % 5) * 28;
      const x = Math.cos(ang) * dist;
      const z = Math.sin(ang) * dist;
      const s = 0.85 + (i % 4) * 0.2;

      this._tmpPos.set(x, 4.2 * s, z);
      this._tmpQuat.identity();
      this._tmpScale.set(s, s, s);
      this._tmpMat.compose(this._tmpPos, this._tmpQuat, this._tmpScale);
      trunks.setMatrixAt(i, this._tmpMat);

      this._tmpPos.set(x, 10.5 * s, z);
      this._tmpScale.set(s * 1.15, s, s * 1.15);
      this._tmpMat.compose(this._tmpPos, this._tmpQuat, this._tmpScale);
      leaves.setMatrixAt(i, this._tmpMat);
      leaves.setColorAt(i, leafPalette[i % leafPalette.length]);
    }
    trunks.instanceMatrix.needsUpdate = true;
    leaves.instanceMatrix.needsUpdate = true;
    if (leaves.instanceColor) leaves.instanceColor.needsUpdate = true;
    trunks.computeBoundingSphere();
    leaves.computeBoundingSphere();
    this.group.add(trunks, leaves);

    const tankGeo = new THREE.CylinderGeometry(11, 11, 20, 18);
    const tankMat = new THREE.MeshStandardMaterial({ color: '#9a3412', roughness: 0.7, metalness: 0.35 });
    const pipeGeo = new THREE.CylinderGeometry(2.2, 2.2, 22, 12);
    const pipeMat = new THREE.MeshStandardMaterial({ color: '#64748b', roughness: 0.5, metalness: 0.6 });
    [new THREE.Vector3(-90, 12, 95), new THREE.Vector3(75, 10, -85)].forEach((pos) => {
      const tGroup = new THREE.Group();
      tGroup.position.copy(pos);
      tGroup.add(new THREE.Mesh(tankGeo, tankMat));
      const pipe = new THREE.Mesh(pipeGeo, pipeMat);
      pipe.rotation.z = Math.PI / 2;
      pipe.position.set(12, 3, 0);
      tGroup.add(pipe);
      this.group.add(tGroup);
    });

    this.disposables.push(
      trunkGeo,
      trunkMat,
      leafGeo,
      leaves.material as THREE.Material,
      tankGeo,
      tankMat,
      pipeGeo,
      pipeMat
    );
  }

  private buildSkylineTowersAndProps(): void {
    const bGeo = new THREE.BoxGeometry(1, 1, 1);
    const bMat = new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.35, metalness: 0.72 });
    const inst = new THREE.InstancedMesh(bGeo, bMat, 36);
    for (let i = 0; i < 36; i++) {
      const a = (i / 36) * Math.PI * 2;
      const r = 240 + (i % 3) * 35;
      const h = 38 + (i % 5) * 18;
      this._tmpPos.set(Math.cos(a) * r, h / 2, Math.sin(a) * r);
      this._tmpQuat.identity();
      this._tmpScale.set(18, h, 18);
      this._tmpMat.compose(this._tmpPos, this._tmpQuat, this._tmpScale);
      inst.setMatrixAt(i, this._tmpMat);
    }
    inst.instanceMatrix.needsUpdate = true;
    inst.computeBoundingSphere();
    this.group.add(inst);
    this.disposables.push(bGeo, bMat);
  }

  private buildStadiumColiseum(): void {
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
      mesh.position.y = tier.y;
      this.group.add(mesh);
      this.disposables.push(ringGeo, ringMat);
    });

    const specGeo = new THREE.CapsuleGeometry(0.85, 1.2, 4, 8);
    const specMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.55 });
    const inst = new THREE.InstancedMesh(specGeo, specMat, this.spectatorCount);
    inst.frustumCulled = false;

    const palette = [
      new THREE.Color('#ef4444'),
      new THREE.Color('#3b82f6'),
      new THREE.Color('#22c55e'),
      new THREE.Color('#facc15'),
      new THREE.Color('#ec4899'),
      new THREE.Color('#f97316'),
    ];
    this.spectatorPhases = new Float32Array(this.spectatorCount);

    for (let i = 0; i < this.spectatorCount; i++) {
      const angle = (i / this.spectatorCount) * Math.PI * 2 * 3 + (Math.random() - 0.5) * 0.05;
      const tierIdx = i % 2;
      const r = tierIdx === 0 ? 236 + Math.random() * 6 : 254 + Math.random() * 6;
      const y = tierIdx === 0 ? 11 + Math.random() * 8 : 26 + Math.random() * 10;
      this._tmpPos.set(Math.cos(angle) * r, y, Math.sin(angle) * r);
      this._tmpQuat.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -angle + Math.PI / 2);
      const s = 0.85 + Math.random() * 0.35;
      this._tmpScale.set(s, s, s);
      const mat4 = new THREE.Matrix4().compose(this._tmpPos, this._tmpQuat, this._tmpScale);
      this.spectatorBaseMatrices.push(mat4);
      this.spectatorPhases[i] = Math.random() * Math.PI * 2;
      inst.setMatrixAt(i, mat4);
      inst.setColorAt(i, palette[i % palette.length]);
    }
    inst.instanceMatrix.needsUpdate = true;
    if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
    inst.computeBoundingSphere();

    this.spectatorsMesh = inst;
    this.group.add(inst);

    const roofRingGeo = new THREE.TorusGeometry(278, 4.2, 10, 64);
    roofRingGeo.rotateX(Math.PI / 2);
    const roofRingMat = new THREE.MeshStandardMaterial({ color: '#1e293b', metalness: 0.85, roughness: 0.28 });
    const roofRing = new THREE.Mesh(roofRingGeo, roofRingMat);
    roofRing.position.y = 58;
    this.group.add(roofRing);

    const neonHaloGeo = new THREE.TorusGeometry(272, 0.85, 8, 64);
    neonHaloGeo.rotateX(Math.PI / 2);
    const neonHaloMat = new THREE.MeshBasicMaterial({ color: '#38bdf8' });
    const neonHalo = new THREE.Mesh(neonHaloGeo, neonHaloMat);
    neonHalo.position.y = 54;
    this.group.add(neonHalo);
    this.disposables.push(specGeo, specMat, roofRingGeo, roofRingMat, neonHaloGeo, neonHaloMat);
  }

  private buildTunnelAndTracksideBoards(): void {
    const archMat = new THREE.MeshStandardMaterial({ color: '#0f172a', metalness: 0.75, roughness: 0.3 });
    const neonArchMat = new THREE.MeshBasicMaterial({ color: '#f97316' });
    const archGeo = new THREE.TorusGeometry(TRACK_HALF_WIDTH + 3.2, 1.15, 8, 28, Math.PI);
    const stripGeo = new THREE.TorusGeometry(TRACK_HALF_WIDTH + 2.1, 0.24, 6, 28, Math.PI);

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

    for (let i = 0; i < 14; i++) {
      const idx = Math.floor(((i + 0.5) / 14) * SAMPLE_COUNT) % SAMPLE_COUNT;
      const s = this.samples[idx];
      const side = i % 2 === 0 ? 1 : -1;
      const board = new THREE.Mesh(boardGeo, boardMat);
      board.position.copy(s.point).addScaledVector(s.right, side * (BARRIER_HALF_WIDTH + 2.0));
      board.position.y += 2.3;
      board.rotation.y = Math.atan2(s.tangent.x, s.tangent.z) + (side > 0 ? -Math.PI / 2 : Math.PI / 2);
      this.group.add(board);
    }

    this.disposables.push(archMat, neonArchMat, archGeo, stripGeo, boardTex, boardGeo, boardMat);
  }

  private buildFloodlightsAndJumbotrons(): void {
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
      rig.position.set(Math.cos(a) * r, 34, Math.sin(a) * r);
      rig.lookAt(0, 10, 0);

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
      { pos: new THREE.Vector3(0, 42, -210), rotY: 0 },
      { pos: new THREE.Vector3(0, 42, 210), rotY: Math.PI },
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
      holo.position.set(Math.cos(ang) * 70, 18, Math.sin(ang) * 70);
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
      pos[i * 3] = (Math.random() - 0.5) * 320;
      pos[i * 3 + 1] = 8 + Math.random() * 48;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 320;
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

    if (this.spectatorsMesh) {
      for (let i = 0; i < this.spectatorCount; i++) {
        const base = this.spectatorBaseMatrices[i];
        this._tmpMat.copy(base);
        const hop = Math.abs(Math.sin(elapsed * 5.8 + this.spectatorPhases[i])) * 0.75;
        this._tmpMat.elements[13] = base.elements[13] + hop;
        this.spectatorsMesh.setMatrixAt(i, this._tmpMat);
      }
      this.spectatorsMesh.instanceMatrix.needsUpdate = true;
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
