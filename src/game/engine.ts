import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type {
  HazardKind,
  HitNoticeKind,
  ItemKind,
  NetHazard,
  NetKartState,
} from '../shared/protocol.ts';
import { ProceduralAudioEngine } from './audio.ts';
import { getMapById, type MapId, type WeatherChoice } from './maps.ts';
import {
  buildBananaMesh,
  buildBlueShellMesh,
  buildCannonballMesh,
  buildGoldenFireballMesh,
  buildGreenShellMesh,
  buildHoneyPuddleMesh,
  buildKartAndDriver,
  buildPurpleShellMesh,
  type KartVisualRig,
} from './models.ts';
import {
  applyKartShieldOrSpin,
  createKartState,
  resolveKartCollisions,
  stepKartPhysics,
  updateStandings,
  type ActiveHazard,
  type BoostReason,
  type KartInputState,
  type KartPhysicsState,
  type PhysicsCallbacks,
} from './physics.ts';
import { RaceReplayRecorder, type ReplayEvent } from './replay.ts';
import { getRacerById, getRacerWithVariant, ROSTER } from './roster.ts';
import { createProceduralTextures, type ProceduralTextureSet } from './textures.ts';
import { BARRIER_HALF_WIDTH, SAMPLE_COUNT, StadiumTrack } from './track.ts';
import { VEHICLES, type VehicleId } from './vehicles.ts';

export type EngineMode =
  | 'title'
  | 'paddock'
  | 'countdown'
  | 'racing'
  | 'paused'
  | 'finished'
  | 'replay';

export type PaddockStage = 'character' | 'vehicle' | 'course' | 'weather';

export type ControlMode =
  | 'keyboard'
  | 'mouse'
  | 'controller'
  | 'mobile_joystick'
  | 'mobile_buttons';

export type GameModeType = 'grand_prix' | 'vs_race' | 'time_trial' | 'online_room';

export interface BoostCallout {
  id: number;
  text: string;
  color: string;
}

export interface HudSnapshot {
  mode: EngineMode;
  paddockStage: PaddockStage;
  selectedVariantId: string;
  selectedVehicleId: VehicleId;
  gameMode: GameModeType;
  mapId: MapId;
  weatherChoice: WeatherChoice;
  activeWeather: Exclude<WeatherChoice, 'dynamic'>;
  rainFactor: number;
  sunGlare: { visible: boolean; x: number; y: number; intensity: number };
  controlMode: ControlMode;
  smartSteering: boolean;
  autoAccel: boolean;
  autoUseItem: boolean;
  cameraTilt: boolean;
  soundMuted: boolean;
  rank: number;
  totalRacers: number;
  lap: number;
  speedKmh: number;
  heldItem: ItemKind;
  rouletteActive: boolean;
  driftLevel: number;
  boostActive: boolean;
  starActive: boolean;
  boostCallout: BoostCallout | null;
  countdownValue: number;
  raceTimeMs: number;
  totalLaps: number;
  timeLimitMs: number;
  timeRemainingMs: number;
  timeTrialResult: 'cleared' | 'failed' | null;
  standings: {
    id: string;
    name: string;
    characterId: string;
    vehicleId: string;
    rank: number;
    lap: number;
    finished: boolean;
    finishTimeMs: number;
    color: string;
    isPlayer: boolean;
  }[];
  minimapPoints: { x: number; z: number }[];
  minimapRacers: { x: number; z: number; color: string; isPlayer: boolean }[];
  gamepadConnected: boolean;
  gamepadName: string;
  hasReplay: boolean;
  replayDurationMs: number;
  replayTimeMs: number;
  replayPaused: boolean;
  replaySpeed: 1 | 2;
  replayEvents: ReplayEvent[];
  replayEventBanner: string | null;
}

export interface MultiplayerBridge {
  localPlayerId: string | null;
  sendState: (state: NetKartState) => void;
  spawnHazard: (hazard: NetHazard) => void;
  removeHazard: (hazardId: string) => void;
  hitPlayer: (targetId: string, attackerId: string, kind: HitNoticeKind) => void;
}

interface ParticleSlot {
  active: boolean;
  life: number;
  maxLife: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  size: number;
  color: THREE.Color;
}

const PARTICLE_POOL_SIZE = 320;
const SKID_POOL_SIZE = 200;
const TRAIL_POINTS = 26;
const RAIN_COUNT = 340;

class AdditiveRibbonTrail {
  public readonly mesh: THREE.Mesh;
  private positions: Float32Array;
  private colors: Float32Array;
  private uvs: Float32Array;
  private history: {
    x: number;
    y: number;
    z: number;
    rx: number;
    rz: number;
    ux: number;
    uy: number;
    uz: number;
    r: number;
    g: number;
    b: number;
    w: number;
  }[] = [];
  private geo: THREE.BufferGeometry;
  private mat: THREE.MeshBasicMaterial;
  private headColor = new THREE.Color('#38bdf8');

  constructor(private maxPoints = TRAIL_POINTS, flameMap?: THREE.Texture) {
    // 4 vertices per sample point: [horiz-L, horiz-R, vert-Bot, vert-Top] for sharp volumetric crossed flame ribbon
    this.positions = new Float32Array(maxPoints * 4 * 3);
    this.colors = new Float32Array(maxPoints * 4 * 3);
    this.uvs = new Float32Array(maxPoints * 4 * 2);
    const indices: number[] = [];
    for (let i = 0; i < maxPoints; i++) {
      const u = i / Math.max(1, maxPoints - 1);
      const uOff = i * 8;
      this.uvs[uOff] = u;
      this.uvs[uOff + 1] = 0;
      this.uvs[uOff + 2] = u;
      this.uvs[uOff + 3] = 1;
      this.uvs[uOff + 4] = u;
      this.uvs[uOff + 5] = 0;
      this.uvs[uOff + 6] = u;
      this.uvs[uOff + 7] = 1;
      if (i < maxPoints - 1) {
        const hA = i * 4;
        const hB = hA + 1;
        const hC = (i + 1) * 4;
        const hD = hC + 1;
        indices.push(hA, hB, hC, hB, hD, hC);

        const vA = hA + 2;
        const vB = hA + 3;
        const vC = hC + 2;
        const vD = hC + 3;
        indices.push(vA, vB, vC, vB, vD, vC);
      }
    }
    this.geo = new THREE.BufferGeometry();
    this.geo.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geo.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    this.geo.setAttribute('uv', new THREE.BufferAttribute(this.uvs, 2));
    this.geo.setIndex(indices);

    this.mat = new THREE.MeshBasicMaterial({
      map: flameMap ?? null,
      vertexColors: true,
      transparent: true,
      opacity: flameMap ? 0.98 : 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    this.mesh = new THREE.Mesh(this.geo, this.mat);
    this.mesh.frustumCulled = false;
  }

  public pushPoint(
    active: boolean,
    x: number,
    y: number,
    z: number,
    rx: number,
    rz: number,
    colorHex: string,
    halfWidth: number,
    ux = 0,
    uy = 1,
    uz = 0
  ): void {
    if (active) {
      this.headColor.set(colorHex);
      this.history.unshift({
        x,
        y,
        z,
        rx,
        rz,
        ux,
        uy,
        uz,
        r: this.headColor.r,
        g: this.headColor.g,
        b: this.headColor.b,
        w: halfWidth,
      });
      if (this.history.length > this.maxPoints) {
        this.history.length = this.maxPoints;
      }
    } else if (this.history.length > 0) {
      this.history.pop();
    }

    if (this.history.length < 2) {
      this.mesh.visible = false;
      return;
    }

    this.mesh.visible = true;
    for (let i = 0; i < this.maxPoints; i++) {
      const idx = Math.min(i, this.history.length - 1);
      const pt = this.history[idx];
      const fade = i < this.history.length ? Math.pow(1 - i / this.history.length, 1.38) : 0;
      const w = pt.w * (0.08 + 0.92 * Math.pow(fade, 0.85));
      const vh = w * 0.92;

      const pOff = i * 12;
      // Horizontal ribbon
      this.positions[pOff] = pt.x - pt.rx * w;
      this.positions[pOff + 1] = pt.y;
      this.positions[pOff + 2] = pt.z - pt.rz * w;
      this.positions[pOff + 3] = pt.x + pt.rx * w;
      this.positions[pOff + 4] = pt.y;
      this.positions[pOff + 5] = pt.z + pt.rz * w;
      // Vertical crossed flame ribbon aligned with track up
      this.positions[pOff + 6] = pt.x - pt.ux * vh * 0.45;
      this.positions[pOff + 7] = pt.y - pt.uy * vh * 0.45;
      this.positions[pOff + 8] = pt.z - pt.uz * vh * 0.45;
      this.positions[pOff + 9] = pt.x + pt.ux * vh * 1.1;
      this.positions[pOff + 10] = pt.y + pt.uy * vh * 1.1;
      this.positions[pOff + 11] = pt.z + pt.uz * vh * 1.1;

      for (let k = 0; k < 4; k++) {
        const cOff = pOff + k * 3;
        this.colors[cOff] = pt.r * fade;
        this.colors[cOff + 1] = pt.g * fade;
        this.colors[cOff + 2] = pt.b * fade;
      }
    }
    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.color.needsUpdate = true;
  }

  public clear(): void {
    this.history.length = 0;
    this.mesh.visible = false;
  }

  public dispose(): void {
    this.geo.dispose();
    this.mat.dispose();
  }
}

export class KartGameEngine {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private textures: ProceduralTextureSet;
  private track: StadiumTrack;
  private hemiLight: THREE.HemisphereLight;
  private sunKeyLight: THREE.DirectionalLight;
  private rimLight: THREE.DirectionalLight;
  public readonly audio = new ProceduralAudioEngine();

  private isSoftwareGl: boolean;
  private frameId = 0;
  private disposed = false;
  private clock = new THREE.Clock();

  private mode: EngineMode = 'title';
  private gameMode: GameModeType = 'grand_prix';
  private currentMapId: MapId = 'plaza';
  private weatherChoice: WeatherChoice = 'sunny';
  private activeWeather: Exclude<WeatherChoice, 'dynamic'> = 'sunny';
  private weatherRainFactor = 0;
  private weatherNightFactor = 0;
  private weatherWetness = 0;
  private rainLines: THREE.LineSegments;
  private rainOffsets: Float32Array;
  private rainMat: THREE.LineBasicMaterial;
  private weatherSkyTop = new THREE.Color();
  private weatherSkyMid = new THREE.Color();
  private weatherSkyHor = new THREE.Color();
  private weatherFog = new THREE.Color();
  private controlMode: ControlMode = 'keyboard';
  private countdownValue = 3;
  private countdownTimer = 0;
  private raceElapsedMs = 0;
  private timeTrialLimitMs = 120000;
  private timeTrialResult: 'cleared' | 'failed' | null = null;
  private jumbotronTimer = 0;
  private hudEmitTimer = 0;
  private netSendTimer = 0;

  // Boost Callout state
  private boostCalloutCounter = 0;
  private activeBoostCallout: BoostCallout | null = null;
  private boostCalloutClearAt = 0;

  // Paddock Showcase Rig Cache (zero-stutter character + variant + vehicle switching)
  private paddockRigCache = new Map<string, KartVisualRig>();
  private paddockRig: KartVisualRig | null = null;
  private paddockSelectedId = 'mario';
  private paddockSelectedVariantId = 'classic';
  private paddockSelectedVehicleId: VehicleId = 'standard_kart';
  private paddockStage: PaddockStage = 'character';
  private paddockSelectAnim = 0;
  private paddockOrbitYaw = 0.52;
  private paddockTargetYaw = 0.52;
  private paddockDragActive = false;
  private paddockLastX = 0;
  private rouletteTickTimer = 0;
  private rouletteTickStep = 0;

  // Race Entities & 3D Drift/Nitro Ribbon Trails
  private karts: KartPhysicsState[] = [];
  private kartRigs = new Map<string, KartVisualRig>();
  private kartTrails = new Map<
    string,
    {
      driftL: AdditiveRibbonTrail;
      driftR: AdditiveRibbonTrail;
      nitroL: AdditiveRibbonTrail;
      nitroR: AdditiveRibbonTrail;
      wasGrounded: boolean;
    }
  >();
  private trailGroup = new THREE.Group();
  private hazards: ActiveHazard[] = [];
  private hazardGroup = new THREE.Group();
  private minimapPath: { x: number; z: number }[] = [];
  private prevPlayerRank = 8;

  // Replay Recorder & Playback State
  private replay = new RaceReplayRecorder();
  private replayPlayerId = 'player_local';
  private replayTimeMs = 0;
  private replayPaused = false;
  private replaySpeed: 1 | 2 = 1;
  private replayEventBanner: string | null = null;
  private replaySavedSpecIds = new Map<
    string,
    { name: string; characterId: string; variantId: string; vehicleId: VehicleId }
  >();

  // Particle & Skid Pools (zero per-frame GC)
  private particleMesh: THREE.InstancedMesh;
  private particles: ParticleSlot[] = [];
  private particleCursor = 0;
  private skidMesh: THREE.InstancedMesh;
  private skidCursor = 0;
  private _dummy = new THREE.Object3D();
  private _tmpV3 = new THREE.Vector3();
  private _tmpV3B = new THREE.Vector3();
  private _tmpColor = new THREE.Color();
  private _camUpTarget = new THREE.Vector3(0, 1, 0);
  private _mat4Basis = new THREE.Matrix4();
  private _vecRight = new THREE.Vector3();
  private _vecUp = new THREE.Vector3();
  private _vecFwd = new THREE.Vector3();

  // Camera & Input State & Gameplay Assists
  private cameraShake = 0;
  private rearViewHeld = false;
  private rearViewBlend = 0;
  private camLookTarget = new THREE.Vector3();
  private camLookInitialized = false;
  private heldKeys = new Set<string>();
  private justPressedKeys = new Set<string>();
  private touchSteer = 0;
  private touchThrottle = false;
  private touchBrake = false;
  private touchDrift = false;
  private touchItem = false;
  private smartSteering = true;
  private autoAccel = false;
  private autoUseItem = false;
  private cameraTilt = true;
  private soundMuted = false;
  private mouseSteerNorm = 0;
  private mouseLeftDown = false;
  private mouseRightDown = false;
  private mouseRightJustPressed = false;
  private mouseItemJustPressed = false;
  private prevPadHop = false;
  private prevPadItem = false;
  private prevPadStart = false;
  private gamepadConnected = false;
  private gamepadName = '';

  private mpBridge: MultiplayerBridge | null = null;
  private onHudUpdate: (snap: HudSnapshot) => void;
  private resizeObserver: ResizeObserver;

  constructor(
    private container: HTMLElement,
    onHudUpdate: (snap: HudSnapshot) => void
  ) {
    this.onHudUpdate = onHudUpdate;

    // 1. Software-WebGL probe
    this.isSoftwareGl = (() => {
      try {
        const probe = document.createElement('canvas').getContext('webgl2');
        if (!probe) return true;
        const ext = probe.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : probe.RENDERER;
        const gpu = String(probe.getParameter(param));
        probe.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return false;
      }
    })();

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.14;
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setSize(
      container.clientWidth || window.innerWidth,
      container.clientHeight || window.innerHeight
    );
    container.appendChild(this.renderer.domElement);

    // 2. Scene & RoomEnvironment IBL
    this.scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    this.camera = new THREE.PerspectiveCamera(
      52,
      (container.clientWidth || window.innerWidth) /
        (container.clientHeight || window.innerHeight),
      0.2,
      900
    );

    // 3. Lighting Rig
    this.hemiLight = new THREE.HemisphereLight('#bae6fd', '#3f6212', 1.05);
    this.scene.add(this.hemiLight);

    this.sunKeyLight = new THREE.DirectionalLight('#fffbeb', 2.6);
    this.sunKeyLight.position.set(120, 155, 85);
    this.sunKeyLight.castShadow = true;
    this.sunKeyLight.shadow.mapSize.set(2048, 2048);
    this.sunKeyLight.shadow.camera.left = -210;
    this.sunKeyLight.shadow.camera.right = 210;
    this.sunKeyLight.shadow.camera.top = 210;
    this.sunKeyLight.shadow.camera.bottom = -210;
    this.sunKeyLight.shadow.camera.near = 20;
    this.sunKeyLight.shadow.camera.far = 430;
    this.sunKeyLight.shadow.bias = -0.0005;
    this.sunKeyLight.shadow.normalBias = 0.03;
    this.scene.add(this.sunKeyLight);

    this.rimLight = new THREE.DirectionalLight('#38bdf8', 0.95);
    this.rimLight.position.set(-140, 80, -130);
    this.scene.add(this.rimLight);

    // Paddock Spotlight Rig (at y=260)
    const paddockSpot = new THREE.SpotLight('#fffbeb', 85, 38, Math.PI / 4, 0.55, 1.3);
    paddockSpot.position.set(4.5, 269, 6.5);
    paddockSpot.target.position.set(0, 260.5, 0);
    this.scene.add(paddockSpot);
    this.scene.add(paddockSpot.target);

    const paddockRim = new THREE.PointLight('#ffffff', 24, 24, 1.5);
    paddockRim.position.set(-4.5, 263.5, -4.5);
    this.scene.add(paddockRim);

    // 4. Textures & Initial Map Track
    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    this.textures = createProceduralTextures(maxAniso);
    const mapDef = getMapById(this.currentMapId);
    this.track = new StadiumTrack(this.textures, mapDef);
    this.timeTrialLimitMs = mapDef.timeTrialLimitSec * 1000;
    this.scene.add(this.track.group);
    this.scene.add(this.hazardGroup);
    this.scene.add(this.trailGroup);
    this.applyMapAtmosphere(this.currentMapId);
    this.rebuildMinimapPath();

    // 5. Pooled Instanced Boost/Spark Particles & Skid Marks
    const partGeo = new THREE.OctahedronGeometry(0.25, 0);
    const partMat = new THREE.MeshBasicMaterial({ color: '#ffffff' });
    this.particleMesh = new THREE.InstancedMesh(partGeo, partMat, PARTICLE_POOL_SIZE);
    this.particleMesh.frustumCulled = false;
    for (let i = 0; i < PARTICLE_POOL_SIZE; i++) {
      this.particles.push({
        active: false,
        life: 0,
        maxLife: 0.4,
        x: 0,
        y: -50,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        size: 1,
        color: new THREE.Color('#38bdf8'),
      });
      this._dummy.position.set(0, -50, 0);
      this._dummy.scale.setScalar(0.001);
      this._dummy.updateMatrix();
      this.particleMesh.setMatrixAt(i, this._dummy.matrix);
      this.particleMesh.setColorAt(i, this._tmpColor);
    }
    this.particleMesh.instanceMatrix.needsUpdate = true;
    if (this.particleMesh.instanceColor) this.particleMesh.instanceColor.needsUpdate = true;
    this.scene.add(this.particleMesh);

    const skidGeo = new THREE.PlaneGeometry(0.44, 1.2);
    skidGeo.rotateX(-Math.PI / 2);
    const skidMat = new THREE.MeshBasicMaterial({
      color: '#09090b',
      transparent: true,
      opacity: 0.48,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
    this.skidMesh = new THREE.InstancedMesh(skidGeo, skidMat, SKID_POOL_SIZE);
    this.skidMesh.frustumCulled = false;
    for (let i = 0; i < SKID_POOL_SIZE; i++) {
      this._dummy.position.set(0, -50, 0);
      this._dummy.scale.setScalar(0.001);
      this._dummy.updateMatrix();
      this.skidMesh.setMatrixAt(i, this._dummy.matrix);
    }
    this.skidMesh.instanceMatrix.needsUpdate = true;
    this.scene.add(this.skidMesh);

    // 5b. 3D Dynamic Weather Rain Streak Pool
    this.rainOffsets = new Float32Array(RAIN_COUNT * 3);
    const rainPos = new Float32Array(RAIN_COUNT * 6);
    for (let i = 0; i < RAIN_COUNT; i++) {
      this.rainOffsets[i * 3] = (Math.random() - 0.5) * 90;
      this.rainOffsets[i * 3 + 1] = Math.random() * 44;
      this.rainOffsets[i * 3 + 2] = (Math.random() - 0.5) * 90;
    }
    const rainGeo = new THREE.BufferGeometry();
    rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
    this.rainMat = new THREE.LineBasicMaterial({
      color: '#bae6fd',
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    this.rainLines = new THREE.LineSegments(rainGeo, this.rainMat);
    this.rainLines.frustumCulled = false;
    this.rainLines.visible = false;
    this.scene.add(this.rainLines);

    // 6. Initialize Title Cutscene + Pre-warm default Paddock rig
    this.selectPaddockCharacter('mario', false);
    this.startTitleCutscene();

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    // 7. Input & Resize Listeners
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('blur', this.handleBlur);
    const dom = this.renderer.domElement;
    dom.addEventListener('pointerdown', this.handlePointerDown);
    dom.addEventListener('contextmenu', this.handleContextMenu);
    window.addEventListener('pointermove', this.handlePointerMove);
    window.addEventListener('pointerup', this.handlePointerUp);

    this.resizeObserver = new ResizeObserver(() => this.handleResize());
    this.resizeObserver.observe(this.container);

    this.scheduleNextFrame();
  }

  private applyMapAtmosphere(mapId: MapId): void {
    const def = getMapById(mapId);
    this.scene.background = new THREE.Color(def.skyMid);
    this.scene.fog = new THREE.FogExp2(def.fogColor, def.fogDensity);
    if (def.theme === 'plaza' || def.theme === 'sunlit') {
      this.hemiLight.color.set('#e0f2fe');
      this.hemiLight.groundColor.set(def.theme === 'plaza' ? '#9a3412' : '#3f6212');
      this.hemiLight.intensity = 1.15;
      this.sunKeyLight.color.set('#fffbeb');
      this.sunKeyLight.intensity = 2.75;
      this.rimLight.color.set('#38bdf8');
      this.rimLight.intensity = 0.85;
    } else if (def.theme === 'stadium') {
      this.hemiLight.color.set('#93c5fd');
      this.hemiLight.groundColor.set('#7c2d12');
      this.hemiLight.intensity = 0.85;
      this.sunKeyLight.color.set('#ffedd5');
      this.sunKeyLight.intensity = 2.4;
      this.rimLight.color.set('#38bdf8');
      this.rimLight.intensity = 0.95;
    } else {
      this.hemiLight.color.set('#bae6fd');
      this.hemiLight.groundColor.set('#1e293b');
      this.hemiLight.intensity = 1.0;
      this.sunKeyLight.color.set('#fef3c7');
      this.sunKeyLight.intensity = 2.55;
      this.rimLight.color.set('#f59e0b');
      this.rimLight.intensity = 0.95;
    }
  }

  private rebuildMinimapPath(): void {
    this.minimapPath = [];
    for (let i = 0; i < 64; i++) {
      const idx = Math.floor((i / 64) * this.track.samples.length);
      const p = this.track.samples[idx].point;
      this.minimapPath.push({ x: p.x, z: p.z });
    }
  }

  public setMultiplayerBridge(bridge: MultiplayerBridge | null): void {
    this.mpBridge = bridge;
  }

  public setControlMode(mode: ControlMode): void {
    this.controlMode = mode;
    if (mode !== 'mouse') {
      this.mouseSteerNorm = 0;
      this.mouseLeftDown = false;
      this.mouseRightDown = false;
    }
    this.emitHudSnapshot();
  }

  public setAutoAccel(enabled: boolean): void {
    this.autoAccel = enabled;
    this.emitHudSnapshot();
  }

  public setSmartSteering(enabled: boolean): void {
    this.smartSteering = enabled;
    this.emitHudSnapshot();
  }

  public setAutoUseItem(enabled: boolean): void {
    this.autoUseItem = enabled;
    this.emitHudSnapshot();
  }

  public setCameraTilt(enabled: boolean): void {
    this.cameraTilt = enabled;
    this.emitHudSnapshot();
  }

  public setSoundMuted(muted: boolean): void {
    this.soundMuted = muted;
    this.audio.setMuted(muted);
    this.emitHudSnapshot();
  }

  public setGameMode(gm: GameModeType): void {
    this.gameMode = gm;
    this.emitHudSnapshot();
  }

  public setWeather(weather: WeatherChoice): void {
    this.weatherChoice = weather;
    if (weather !== 'dynamic') {
      this.activeWeather = weather;
    }
    this.updateWeatherAtmosphere(1.0, this.clock.elapsedTime);
    this.emitHudSnapshot();
  }

  private getWeatherPreset(w: Exclude<WeatherChoice, 'dynamic'>, mapId: MapId) {
    const def = getMapById(mapId);
    if (w === 'sunset') {
      return {
        top: '#311042',
        mid: '#c026d3',
        hor: '#fb923c',
        fog: '#fdba74',
        fogDensity: 0.00145,
        hemiSky: '#fed7aa',
        hemiGround: '#7c2d12',
        hemiInt: 0.92,
        sunCol: '#ffedd5',
        sunInt: 2.35,
        rimCol: '#f97316',
        rimInt: 1.15,
        rain: 0,
        night: 0.2,
        wet: 0.05,
      };
    }
    if (w === 'rainy') {
      return {
        top: '#1e293b',
        mid: '#475569',
        hor: '#94a3b8',
        fog: '#64748b',
        fogDensity: 0.0024,
        hemiSky: '#94a3b8',
        hemiGround: '#1e293b',
        hemiInt: 0.85,
        sunCol: '#cbd5e1',
        sunInt: 1.45,
        rimCol: '#38bdf8',
        rimInt: 1.05,
        rain: 1,
        night: 0.12,
        wet: 0.92,
      };
    }
    if (w === 'night') {
      return {
        top: '#020617',
        mid: '#0f172a',
        hor: '#1e293b',
        fog: '#0f172a',
        fogDensity: 0.0018,
        hemiSky: '#38bdf8',
        hemiGround: '#090d16',
        hemiInt: 0.72,
        sunCol: '#bae6fd',
        sunInt: 1.65,
        rimCol: '#a855f7',
        rimInt: 1.25,
        rain: 0,
        night: 1,
        wet: 0.2,
      };
    }
    return {
      top: def.skyTop,
      mid: def.skyMid,
      hor: def.skyHorizon,
      fog: def.fogColor,
      fogDensity: def.fogDensity,
      hemiSky: def.theme === 'stadium' ? '#93c5fd' : '#e0f2fe',
      hemiGround: def.theme === 'plaza' ? '#9a3412' : '#3f6212',
      hemiInt: def.theme === 'stadium' ? 0.9 : 1.15,
      sunCol: '#fffbeb',
      sunInt: def.theme === 'stadium' ? 2.45 : 2.75,
      rimCol: def.theme === 'skyline' ? '#f59e0b' : '#38bdf8',
      rimInt: 0.92,
      rain: 0,
      night: def.theme === 'stadium' ? 0.35 : 0,
      wet: 0,
    };
  }

  private updateWeatherAtmosphere(dt: number, elapsed: number): void {
    const order: Exclude<WeatherChoice, 'dynamic'>[] = ['sunny', 'sunset', 'rainy', 'night'];
    let presetA = this.getWeatherPreset('sunny', this.currentMapId);
    let presetB = presetA;
    let blend = 0;

    if (this.weatherChoice === 'dynamic') {
      const cycleSec = 26;
      const totalPos = (elapsed / cycleSec) % order.length;
      const idxA = Math.floor(totalPos);
      const idxB = (idxA + 1) % order.length;
      const frac = totalPos - idxA;
      // Hold each weather cleanly for first 75%, smoothly transition in last 25%
      blend = frac > 0.72 ? (frac - 0.72) / 0.28 : 0;
      presetA = this.getWeatherPreset(order[idxA], this.currentMapId);
      presetB = this.getWeatherPreset(order[idxB], this.currentMapId);
      const resolved = order[blend > 0.5 ? idxB : idxA];
      if (resolved !== this.activeWeather) {
        this.activeWeather = resolved;
      }
    } else {
      this.activeWeather = this.weatherChoice;
      presetA = this.getWeatherPreset(this.weatherChoice, this.currentMapId);
      presetB = presetA;
      blend = 0;
    }

    const alpha = Math.min(1, dt * 3.5);
    this.weatherSkyTop.set(presetA.top).lerp(this._tmpColor.set(presetB.top), blend);
    this.weatherSkyMid.set(presetA.mid).lerp(this._tmpColor.set(presetB.mid), blend);
    this.weatherSkyHor.set(presetA.hor).lerp(this._tmpColor.set(presetB.hor), blend);
    this.weatherFog.set(presetA.fog).lerp(this._tmpColor.set(presetB.fog), blend);

    if (this.scene.background instanceof THREE.Color) {
      this.scene.background.lerp(this.weatherSkyMid, alpha);
    }
    if (this.scene.fog instanceof THREE.FogExp2) {
      this.scene.fog.color.lerp(this.weatherFog, alpha);
      const targetDens = THREE.MathUtils.lerp(presetA.fogDensity, presetB.fogDensity, blend);
      this.scene.fog.density = THREE.MathUtils.lerp(this.scene.fog.density, targetDens, alpha);
    }

    this.hemiLight.color.lerp(this._tmpColor.set(presetA.hemiSky).lerp(new THREE.Color(presetB.hemiSky), blend), alpha);
    this.hemiLight.groundColor.lerp(this._tmpColor.set(presetA.hemiGround).lerp(new THREE.Color(presetB.hemiGround), blend), alpha);
    this.hemiLight.intensity = THREE.MathUtils.lerp(
      this.hemiLight.intensity,
      THREE.MathUtils.lerp(presetA.hemiInt, presetB.hemiInt, blend),
      alpha
    );

    this.sunKeyLight.color.lerp(this._tmpColor.set(presetA.sunCol).lerp(new THREE.Color(presetB.sunCol), blend), alpha);
    this.sunKeyLight.intensity = THREE.MathUtils.lerp(
      this.sunKeyLight.intensity,
      THREE.MathUtils.lerp(presetA.sunInt, presetB.sunInt, blend),
      alpha
    );

    this.rimLight.color.lerp(this._tmpColor.set(presetA.rimCol).lerp(new THREE.Color(presetB.rimCol), blend), alpha);
    this.rimLight.intensity = THREE.MathUtils.lerp(
      this.rimLight.intensity,
      THREE.MathUtils.lerp(presetA.rimInt, presetB.rimInt, blend),
      alpha
    );

    this.weatherRainFactor = THREE.MathUtils.lerp(
      this.weatherRainFactor,
      THREE.MathUtils.lerp(presetA.rain, presetB.rain, blend),
      alpha
    );
    this.weatherNightFactor = THREE.MathUtils.lerp(
      this.weatherNightFactor,
      THREE.MathUtils.lerp(presetA.night, presetB.night, blend),
      alpha
    );
    this.weatherWetness = THREE.MathUtils.lerp(
      this.weatherWetness,
      THREE.MathUtils.lerp(presetA.wet, presetB.wet, blend),
      alpha
    );

    this.track.applyWeatherVisuals(
      this.weatherSkyTop,
      this.weatherSkyMid,
      this.weatherSkyHor,
      this.weatherWetness,
      this.weatherNightFactor,
      this.weatherRainFactor
    );

    // Update 3D Rain Streaks around camera when racing / title
    const showRain = this.weatherRainFactor > 0.04 && this.mode !== 'paddock';
    this.rainLines.visible = showRain;
    if (showRain) {
      this.rainMat.opacity = this.weatherRainFactor * 0.56;
      const posAttr = this.rainLines.geometry.getAttribute('position') as THREE.BufferAttribute;
      const arr = posAttr.array as Float32Array;
      const camX = this.camera.position.x;
      const camY = this.camera.position.y;
      const camZ = this.camera.position.z;
      for (let i = 0; i < RAIN_COUNT; i++) {
        this.rainOffsets[i * 3] -= dt * 3.5;
        this.rainOffsets[i * 3 + 1] -= dt * 56;
        if (this.rainOffsets[i * 3 + 1] < -12) {
          this.rainOffsets[i * 3] = (Math.random() - 0.5) * 90;
          this.rainOffsets[i * 3 + 1] = 32 + Math.random() * 14;
          this.rainOffsets[i * 3 + 2] = (Math.random() - 0.5) * 90;
        }
        const rx = camX + this.rainOffsets[i * 3];
        const ry = Math.max(-1, camY - 12 + this.rainOffsets[i * 3 + 1]);
        const rz = camZ + this.rainOffsets[i * 3 + 2];
        const idx = i * 6;
        arr[idx] = rx;
        arr[idx + 1] = ry;
        arr[idx + 2] = rz;
        arr[idx + 3] = rx + 0.25;
        arr[idx + 4] = ry + 2.4;
        arr[idx + 5] = rz + 0.15;
      }
      posAttr.needsUpdate = true;
    }
  }

  public loadMap(mapId: MapId): void {
    if (this.currentMapId === mapId) return;
    this.currentMapId = mapId;

    // Detach active paddock rig before replacing track
    if (this.paddockRig) {
      this.track.paddockTurntable.remove(this.paddockRig.root);
    }

    this.scene.remove(this.track.group);
    this.track.dispose();

    const mapDef = getMapById(mapId);
    this.timeTrialLimitMs = mapDef.timeTrialLimitSec * 1000;
    this.track = new StadiumTrack(this.textures, mapDef);
    this.scene.add(this.track.group);
    this.applyMapAtmosphere(mapId);
    this.updateWeatherAtmosphere(1.0, this.clock.elapsedTime);
    this.rebuildMinimapPath();

    if (this.paddockRig) {
      this.track.paddockTurntable.add(this.paddockRig.root);
    }

    if (this.mode === 'title') {
      this.startTitleCutscene();
    } else {
      this.track.paddockGroup.visible = this.mode === 'paddock';
      this.emitHudSnapshot();
    }
  }

  public startTitleCutscene(): void {
    this.clearRaceEntities();
    this.mode = 'title';
    this.camera.up.set(0, 1, 0);
    this.audio.stopMusic();
    this.audio.updateEngine(0, false, false);
    this.track.paddockGroup.visible = false;
    this.track.setCountdownLights(0, true);

    // Spawn 8 lively AI karts spread around the front stretch & ramp approaches with diverse vehicles
    for (let i = 0; i < 8; i++) {
      const spec = ROSTER[i % ROSTER.length];
      const vehId = VEHICLES[i % 12].id;
      const kart = createKartState(`demo_${i}`, spec.name, spec.id, i, this.track, false, false, vehId);
      const sampleIdx = (10 + i * 11) % SAMPLE_COUNT;
      const s = this.track.samples[sampleIdx];
      const lat = ((i % 2 === 0 ? -1 : 1) * (2.5 + (i % 3) * 1.8));
      kart.x = s.point.x + s.right.x * lat;
      kart.y = s.point.y;
      kart.z = s.point.z + s.right.z * lat;
      kart.heading = Math.atan2(s.tangent.x, s.tangent.z);
      kart.trackIndex = sampleIdx;
      kart.trackT = s.t;
      kart.speed = 35 + (i % 3) * 2;
      this.karts.push(kart);

      const rig = buildKartAndDriver(kart.spec, this.textures, !this.isSoftwareGl && i < 4, vehId);
      rig.root.position.set(kart.x, kart.y, kart.z);
      rig.root.rotation.y = kart.heading;
      this.scene.add(rig.root);
      this.kartRigs.set(kart.id, rig);
      this.attachKartTrails(kart.id);
    }

    this.emitHudSnapshot();
  }

  public enterPaddock(stage: PaddockStage = 'character'): void {
    this.clearRaceEntities();
    this.mode = 'paddock';
    this.camera.up.set(0, 1, 0);
    this.paddockStage = stage;
    this.audio.stopMusic();
    this.audio.updateEngine(0, false, false, false, false);
    this.track.paddockGroup.visible = true;
    this.selectPaddockCombo(this.paddockSelectedId, this.paddockSelectedVehicleId, false);
    this.paddockOrbitYaw = this.paddockTargetYaw;
    this.updatePaddock(0.1, this.clock.elapsedTime);
    this.emitHudSnapshot();
  }

  public setPaddockStage(stage: PaddockStage): void {
    this.paddockStage = stage;
    this.paddockTargetYaw += 0.55;
    this.audio.playSelect();
    this.emitHudSnapshot();
  }

  public selectPaddockCharacter(characterId: string, withSound = true): void {
    const spec = getRacerById(characterId);
    const validVar = spec.variants.some((v) => v.id === this.paddockSelectedVariantId)
      ? this.paddockSelectedVariantId
      : 'classic';
    this.selectPaddockCombo(characterId, this.paddockSelectedVehicleId, withSound, validVar);
  }

  public selectPaddockVariant(variantId: string, withSound = true): void {
    this.selectPaddockCombo(this.paddockSelectedId, this.paddockSelectedVehicleId, withSound, variantId);
  }

  public selectPaddockVehicle(vehicleId: VehicleId, withSound = true): void {
    this.selectPaddockCombo(this.paddockSelectedId, vehicleId, withSound, this.paddockSelectedVariantId);
  }

  private selectPaddockCombo(
    characterId: string,
    vehicleId: VehicleId,
    withSound: boolean,
    variantId = this.paddockSelectedVariantId
  ): void {
    this.paddockSelectedId = characterId;
    this.paddockSelectedVariantId = variantId;
    this.paddockSelectedVehicleId = vehicleId;
    if (this.paddockRig) {
      this.track.paddockTurntable.remove(this.paddockRig.root);
      this.paddockRig = null;
    }

    const cacheKey = `${characterId}::${variantId}::${vehicleId}`;
    let rig = this.paddockRigCache.get(cacheKey);
    if (!rig) {
      const spec = getRacerWithVariant(characterId, variantId);
      rig = buildKartAndDriver(spec, this.textures, true, vehicleId);
      this.paddockRigCache.set(cacheKey, rig);
    }

    rig.root.position.set(0, 0.36, 0);
    rig.kartBodyGroup.scale.setScalar(1.15);
    this.track.paddockTurntable.add(rig.root);
    this.paddockRig = rig;
    this.paddockSelectAnim = 1.0;
    this.paddockTargetYaw += 0.65;
    if (withSound) this.audio.playSelect();
    this.emitHudSnapshot();
  }

  public startRace(
    playerCharacterId: string,
    playerName: string,
    remotePlayers: {
      id: string;
      name: string;
      characterId: string;
      variantId?: string;
      vehicleId?: string;
      slotIndex: number;
    }[] = [],
    skipCountdown = false,
    gameModeOverride?: GameModeType,
    playerVehicleId?: VehicleId,
    playerVariantId?: string
  ): void {
    if (gameModeOverride) this.gameMode = gameModeOverride;
    const chosenVehId = playerVehicleId ?? this.paddockSelectedVehicleId;
    const chosenVarId = playerVariantId ?? this.paddockSelectedVariantId;
    this.audio.init();
    this.audio.setFinalLapTempo(false);
    this.clearRaceEntities();
    this.replay.reset();
    this.replaySavedSpecIds.clear();
    this.activeBoostCallout = null;
    this.rouletteTickTimer = 0;
    this.rouletteTickStep = 0;

    const localId = this.mpBridge?.localPlayerId ?? 'player_local';
    this.replayPlayerId = localId;
    const usedChars = new Set<string>([playerCharacterId]);
    const racers: KartPhysicsState[] = [];

    const isTimeTrial = this.gameMode === 'time_trial' && remotePlayers.length === 0;
    const isMultiplayer =
      this.gameMode === 'online_room' ||
      Boolean(this.mpBridge?.localPlayerId) ||
      remotePlayers.length > 0;
    const localSlot = isTimeTrial
      ? 0
      : remotePlayers.find((p) => p.id === localId)?.slotIndex ?? (isMultiplayer ? 0 : 7);

    racers.push(
      createKartState(
        localId,
        playerName || 'You',
        playerCharacterId,
        localSlot,
        this.track,
        true,
        false,
        chosenVehId,
        chosenVarId
      )
    );

    if (!isTimeTrial) {
      for (const rp of remotePlayers) {
        if (rp.id === localId) continue;
        usedChars.add(rp.characterId);
        racers.push(
          createKartState(
            rp.id,
            rp.name,
            rp.characterId,
            rp.slotIndex,
            this.track,
            false,
            true,
            (rp.vehicleId as VehicleId) || 'standard_kart',
            rp.variantId || 'classic'
          )
        );
      }

      // Only fill remaining grid slots with AI racers in singleplayer modes!
      // Multiplayer rooms race strictly human-vs-human with zero AI bots.
      if (!isMultiplayer) {
        const aiPool = ROSTER.filter((r) => !usedChars.has(r.id));
        while (racers.length < 8) {
          const spec = aiPool[(racers.length - 1) % aiPool.length];
          const aiVeh = VEHICLES[(racers.length * 3 + 1) % 12].id;
          racers.push(
            createKartState(
              `ai_${racers.length}`,
              spec.name,
              spec.id,
              racers.length,
              this.track,
              false,
              false,
              aiVeh,
              'classic'
            )
          );
        }
      }
    }

    racers.forEach((k, idx) => {
      const recreated = createKartState(
        k.id,
        k.name,
        k.spec.id,
        idx,
        this.track,
        k.isPlayer,
        k.isRemoteHuman,
        k.vehicle.id,
        k.variantId
      );
      this.karts.push(recreated);
      this.replaySavedSpecIds.set(recreated.id, {
        name: recreated.name,
        characterId: recreated.spec.id,
        variantId: recreated.variantId,
        vehicleId: recreated.vehicle.id,
      });
      const rig = buildKartAndDriver(
        recreated.spec,
        this.textures,
        !this.isSoftwareGl || recreated.isPlayer,
        recreated.vehicle.id
      );
      rig.root.position.set(recreated.x, recreated.y, recreated.z);
      rig.root.rotation.y = recreated.heading;
      this.scene.add(rig.root);
      this.kartRigs.set(recreated.id, rig);
      this.attachKartTrails(recreated.id);
    });

    this.prevPlayerRank = this.karts.length;
    this.raceElapsedMs = 0;
    this.timeTrialLimitMs = getMapById(this.currentMapId).timeTrialLimitSec * 1000;
    this.timeTrialResult = null;
    this.cameraShake = 0;
    this.rearViewHeld = false;
    this.rearViewBlend = 0;
    this.camLookInitialized = false;
    this.track.paddockGroup.visible = false;

    if (skipCountdown) {
      this.mode = 'racing';
      this.countdownValue = 0;
      this.track.setCountdownLights(0, true);
      this.audio.startMusic();
    } else {
      this.mode = 'countdown';
      this.countdownValue = 3;
      this.countdownTimer = 0.95;
      this.track.setCountdownLights(3, false);
      this.audio.playCountdown(false);
    }

    const pk = this.getPlayerKart();
    if (pk) {
      this.camera.up.set(0, 1, 0);
      this.camera.position.set(
        pk.x - Math.sin(pk.heading) * 9.5,
        pk.y + 4.5,
        pk.z - Math.cos(pk.heading) * 9.5
      );
      this.camLookTarget.set(pk.x, pk.y + 1.4, pk.z);
      this.camLookInitialized = true;
      this.camera.lookAt(this.camLookTarget);
    }

    this.emitHudSnapshot();
  }

  public returnToPaddock(): void {
    this.enterPaddock('character');
  }

  public returnToTitle(): void {
    this.startTitleCutscene();
  }

  public setPaused(paused: boolean): void {
    if (this.mode === 'racing' && paused) {
      this.mode = 'paused';
      this.audio.updateEngine(0, false, false, false, false);
      this.emitHudSnapshot();
    } else if (this.mode === 'paused' && !paused) {
      this.mode = 'racing';
      this.emitHudSnapshot();
    }
  }

  public startReplay(): void {
    if (!this.replay.hasData()) return;
    this.audio.stopMusic();
    this.audio.updateEngine(0, false, false, false, false);
    this.mode = 'replay';
    this.camera.up.set(0, 1, 0);
    this.replayTimeMs = 0;
    this.replayPaused = false;
    this.replaySpeed = 1;
    this.replayEventBanner = null;
    this.track.paddockGroup.visible = false;

    // Ensure rigs exist for all recorded karts
    if (this.kartRigs.size === 0) {
      for (const [id, info] of this.replaySavedSpecIds.entries()) {
        const spec = getRacerWithVariant(info.characterId, info.variantId);
        const rig = buildKartAndDriver(
          spec,
          this.textures,
          !this.isSoftwareGl || id === this.replayPlayerId,
          info.vehicleId
        );
        this.scene.add(rig.root);
        this.kartRigs.set(id, rig);
      }
    }
    this.emitHudSnapshot();
  }

  public setReplayPaused(paused: boolean): void {
    this.replayPaused = paused;
    this.emitHudSnapshot();
  }

  public setReplaySpeed(speed: 1 | 2): void {
    this.replaySpeed = speed;
    this.emitHudSnapshot();
  }

  public seekReplay(timeMs: number): void {
    this.replayTimeMs = THREE.MathUtils.clamp(timeMs, 0, this.replay.getDurationMs());
    this.emitHudSnapshot();
  }

  public exitReplay(): void {
    this.mode = 'finished';
    this.emitHudSnapshot();
  }

  public setTouchControls(
    steer: number,
    drift: boolean,
    triggerItem: boolean,
    throttle = false,
    brake = false
  ): void {
    this.touchSteer = steer;
    this.touchThrottle = throttle;
    this.touchBrake = brake;
    if (drift && !this.touchDrift) {
      this.justPressedKeys.add('TouchDrift');
    }
    this.touchDrift = drift;
    if (triggerItem && !this.touchItem) {
      this.justPressedKeys.add('TouchItem');
    }
    this.touchItem = triggerItem;
  }

  public triggerLocalItem(): void {
    this.justPressedKeys.add('UiItem');
  }

  public applyRemoteSnapshots(
    remoteKarts: Record<string, NetKartState>,
    serverHazards: NetHazard[],
    serverPhase?: 'lobby' | 'countdown' | 'racing' | 'finished',
    serverCountdown?: number
  ): void {
    const localId = this.mpBridge?.localPlayerId;
    for (const [id, st] of Object.entries(remoteKarts)) {
      if (id === localId) continue;
      const kart = this.karts.find((k) => k.id === id);
      if (kart && kart.isRemoteHuman) {
        kart.x = THREE.MathUtils.lerp(kart.x, st.x, 0.45);
        kart.y = THREE.MathUtils.lerp(kart.y, st.y, 0.45);
        kart.z = THREE.MathUtils.lerp(kart.z, st.z, 0.45);
        kart.heading = st.heading;
        kart.speed = st.speed;
        kart.steerVisual = st.steer;
        kart.driftDir = st.driftDir;
        kart.driftLevel = st.driftLevel as 0 | 1 | 2 | 3;
        kart.boostTimer = st.boostTimer;
        kart.starTimer = st.starTimer;
        kart.spinTimer = st.spinTimer;
        kart.hopY = st.hopY;
        kart.lap = st.lap;
        kart.totalProgress = st.progress;
        kart.finished = st.finished;
        kart.finishTimeMs = st.finishTimeMs;
        if (st.scaleFactor !== undefined) kart.scaleFactor = st.scaleFactor;
        if (st.shieldCount !== undefined) kart.shieldCount = st.shieldCount;
        if (st.bellTimer !== undefined) kart.bellTimer = st.bellTimer;
        if (st.drillTimer !== undefined) kart.drillTimer = st.drillTimer;
        if (st.cloneActive !== undefined) kart.cloneActive = st.cloneActive;
      }
    }

    const serverIds = new Set(serverHazards.map((h) => h.id));
    for (let i = this.hazards.length - 1; i >= 0; i--) {
      if (this.hazards[i].id.startsWith('net_') && !serverIds.has(this.hazards[i].id)) {
        this.hazardGroup.remove(this.hazards[i].mesh);
        this.hazards.splice(i, 1);
      }
    }
    for (const hz of serverHazards) {
      const existing = this.hazards.find((h) => h.id === hz.id);
      if (!existing) {
        this.spawnHazardVisual(hz);
      } else {
        existing.x = hz.x;
        existing.y = hz.y;
        existing.z = hz.z;
        existing.vx = hz.vx;
        existing.vz = hz.vz;
      }
    }

    if (serverPhase === 'racing' && this.mode === 'countdown') {
      this.mode = 'racing';
      this.countdownValue = 0;
      this.track.setCountdownLights(0, true);
      this.audio.playCountdown(true);
      this.audio.startMusic();
    } else if (
      serverPhase === 'countdown' &&
      serverCountdown !== undefined &&
      serverCountdown !== this.countdownValue
    ) {
      this.countdownValue = serverCountdown;
      this.track.setCountdownLights(serverCountdown, false);
      this.audio.playCountdown(false);
    }
  }

  public applyRemoteHit(targetId: string, kind: HitNoticeKind): void {
    const kart = this.karts.find((k) => k.id === targetId);
    if (kart && kart.starTimer <= 0) {
      if (kart.shieldCount > 0 && kind !== 'star') {
        kart.shieldCount -= 1;
        if (kart.isPlayer) this.audio.playBalloonShield();
        return;
      }
      kart.spinTimer = 1.25;
      if (kind === 'purple_shell') kart.poisonTimer = 3.2;
      if (kart.isPlayer) {
        this.cameraShake = 0.85;
        this.audio.playHit();
        this.replay.recordEvent(this.raceElapsedMs, 'hit', kart.id, `${kart.name} Hit!`);
      }
    }
  }

  private attachKartTrails(kartId: string): void {
    const driftL = new AdditiveRibbonTrail(TRAIL_POINTS);
    const driftR = new AdditiveRibbonTrail(TRAIL_POINTS);
    const nitroL = new AdditiveRibbonTrail(TRAIL_POINTS, this.textures.nitroFlameMap);
    const nitroR = new AdditiveRibbonTrail(TRAIL_POINTS, this.textures.nitroFlameMap);
    this.trailGroup.add(driftL.mesh, driftR.mesh, nitroL.mesh, nitroR.mesh);
    this.kartTrails.set(kartId, {
      driftL,
      driftR,
      nitroL,
      nitroR,
      wasGrounded: true,
    });
  }

  private clearRaceEntities(): void {
    for (const rig of this.kartRigs.values()) {
      this.scene.remove(rig.root);
      rig.dispose();
    }
    this.kartRigs.clear();
    for (const t of this.kartTrails.values()) {
      this.trailGroup.remove(t.driftL.mesh, t.driftR.mesh, t.nitroL.mesh, t.nitroR.mesh);
      t.driftL.dispose();
      t.driftR.dispose();
      t.nitroL.dispose();
      t.nitroR.dispose();
    }
    this.kartTrails.clear();
    this.karts = [];
    for (const hz of this.hazards) {
      this.hazardGroup.remove(hz.mesh);
    }
    this.hazards = [];
  }

  private getPlayerKart(): KartPhysicsState | undefined {
    return this.karts.find((k) => k.isPlayer);
  }

  private triggerBoostCallout(reason: BoostReason, driftLevel: number): void {
    this.boostCalloutCounter += 1;
    let text = 'NITRO BOOST!';
    let color = '#fb923c';

    if (reason === 'air') {
      text = 'AIR BOOST!';
      color = '#38bdf8';
    } else if (reason === 'cloud') {
      text = 'CLOUD HOP!';
      color = '#bae6fd';
    } else if (reason === 'bell') {
      text = 'SUPER BELL!';
      color = '#facc15';
    } else if (reason === 'nitro') {
      text = 'NITRO BOOST!';
      color = '#38bdf8';
    } else if (reason === 'mushroom') {
      text = 'TURBO BOOST!';
      color = '#ef4444';
    } else if (reason === 'star') {
      text = 'STAR POWER!';
      color = '#fde047';
    } else if (reason === 'drift') {
      if (driftLevel >= 3) {
        text = 'ULTRA NITRO!';
        color = '#c084fc';
      } else if (driftLevel === 2) {
        text = 'SUPER TURBO!';
        color = '#fb923c';
      } else {
        text = 'MINI-TURBO!';
        color = '#38bdf8';
      }
    }

    this.activeBoostCallout = { id: this.boostCalloutCounter, text, color };
    this.boostCalloutClearAt = performance.now() + 1150;
  }

  private spawnParticle(
    x: number,
    y: number,
    z: number,
    vx: number,
    vy: number,
    vz: number,
    colorHex: string,
    size = 1.0,
    maxLife = 0.35
  ): void {
    const slot = this.particles[this.particleCursor];
    this.particleCursor = (this.particleCursor + 1) % PARTICLE_POOL_SIZE;
    slot.active = true;
    slot.life = maxLife;
    slot.maxLife = maxLife;
    slot.x = x;
    slot.y = y;
    slot.z = z;
    slot.vx = vx;
    slot.vy = vy;
    slot.vz = vz;
    slot.size = size;
    slot.color.set(colorHex);
  }

  private spawnSkidMark(x: number, y: number, z: number, heading: number): void {
    const idx = this.skidCursor;
    this.skidCursor = (this.skidCursor + 1) % SKID_POOL_SIZE;
    this._dummy.position.set(x, y + 0.055, z);
    this._dummy.rotation.set(0, heading, 0);
    this._dummy.scale.set(1, 1, 1);
    this._dummy.updateMatrix();
    this.skidMesh.setMatrixAt(idx, this._dummy.matrix);
    this.skidMesh.instanceMatrix.needsUpdate = true;
  }

  private spawnHazardVisual(hz: NetHazard): void {
    let mesh: THREE.Group;
    switch (hz.kind) {
      case 'shell':
        mesh = buildGreenShellMesh();
        break;
      case 'golden_fireball':
        mesh = buildGoldenFireballMesh();
        break;
      case 'blue_shell':
        mesh = buildBlueShellMesh();
        break;
      case 'purple_shell':
        mesh = buildPurpleShellMesh();
        break;
      case 'cannonball':
        mesh = buildCannonballMesh();
        break;
      case 'honey_puddle':
        mesh = buildHoneyPuddleMesh();
        break;
      default:
        mesh = buildBananaMesh();
        break;
    }
    mesh.position.set(hz.x, hz.y, hz.z);
    this.hazardGroup.add(mesh);
    this.hazards.push({
      ...hz,
      mesh,
    });
  }

  private emitHazard(
    kart: KartPhysicsState,
    kind: HazardKind,
    dist: number,
    speed: number,
    bouncesLeft: number,
    ttl: number,
    lateralAngleOffset = 0
  ): void {
    const ang = kart.heading + lateralAngleOffset;
    const fwdX = Math.sin(ang);
    const fwdZ = Math.cos(ang);
    const hz: NetHazard = {
      id: `${this.mpBridge ? 'net' : 'loc'}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      kind,
      ownerId: kart.id,
      x: kart.x + fwdX * dist,
      y: kart.y + 0.12,
      z: kart.z + fwdZ * dist,
      vx: fwdX * speed,
      vz: fwdZ * speed,
      bouncesLeft,
      ttl,
    };
    this.spawnHazardVisual(hz);
    if (this.mpBridge && kart.isPlayer) {
      this.mpBridge.spawnHazard(hz);
    }
  }

  private physicsCallbacks: PhysicsCallbacks = {
    onHop: (kart) => {
      if (kart.isPlayer) this.audio.playHop();
    },
    onDriftLevel: (kart, level) => {
      if (kart.isPlayer) this.audio.playDriftLevel(level);
    },
    onBoost: (kart, power, reason) => {
      if (kart.isPlayer) {
        this.audio.playBoost(power);
        this.cameraShake = Math.max(this.cameraShake, 0.28);
        this.triggerBoostCallout(reason, kart.driftLevel);
        this.emitHudSnapshot();
        if (reason === 'air') {
          this.replay.recordEvent(this.raceElapsedMs, 'air_boost', kart.id, `${kart.name} Air Boost!`);
        } else if (reason === 'drift' && kart.driftLevel >= 2) {
          this.replay.recordEvent(
            this.raceElapsedMs,
            'drift_boost',
            kart.id,
            `${kart.name} Nitro Drift Lv.${kart.driftLevel}`
          );
        }
      }
    },
    onItemPickup: (kart) => {
      if (kart.isPlayer) {
        this.audio.playItemBox();
        this.rouletteTickTimer = 0.085;
        this.rouletteTickStep = 0;
      }
    },
    onItemClaim: (kart) => {
      if (kart.isPlayer) {
        this.audio.playItemClaim();
      }
    },
    onShieldPop: (kart) => {
      if (kart.isPlayer) this.audio.playBalloonShield();
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        this.spawnParticle(
          kart.x,
          kart.y + 1.1,
          kart.z,
          Math.cos(a) * 6,
          3.2,
          Math.sin(a) * 6,
          '#38bdf8',
          0.9,
          0.32
        );
      }
    },
    onCannonFire: (kart) => {
      if (kart.isPlayer) this.audio.playShellFire();
      this.emitHazard(kart, 'cannonball', 2.8, 72, 1, 5.5);
    },
    onElephantShockwave: (kart) => {
      if (kart.isPlayer) {
        this.audio.playHeavySplash();
        this.cameraShake = Math.max(this.cameraShake, 0.55);
      }
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        this.spawnParticle(
          kart.x + Math.cos(a) * 1.4,
          kart.y + 0.5,
          kart.z + Math.sin(a) * 1.4,
          Math.cos(a) * 12,
          2.2,
          Math.sin(a) * 12,
          '#f472b6',
          1.15,
          0.36
        );
      }
      for (const other of this.karts) {
        if (other.id === kart.id) continue;
        const dx = other.x - kart.x;
        const dz = other.z - kart.z;
        if (dx * dx + dz * dz < 81 && Math.abs(other.y - kart.y) < 3.5) {
          applyKartShieldOrSpin(other, kart.id, 'elephant_wave', this.physicsCallbacks, 1.15);
        }
      }
    },
    onItemUse: (kart, item) => {
      if (item === 'shell') {
        if (kart.isPlayer) this.audio.playShellFire();
        this.emitHazard(kart, 'shell', 2.6, 64, 5, 9);
      } else if (item === 'banana') {
        if (kart.isPlayer) this.audio.playShellFire();
        this.emitHazard(kart, 'banana', -2.5, 0, 0, 22);
      } else if (item === 'golden_flower') {
        if (kart.isPlayer) this.audio.playFireball();
        this.emitHazard(kart, 'golden_fireball', 2.7, 68, 4, 6.5, -0.14);
        this.emitHazard(kart, 'golden_fireball', 2.9, 70, 4, 6.5, 0);
        this.emitHazard(kart, 'golden_fireball', 2.7, 68, 4, 6.5, 0.14);
      } else if (item === 'blue_shell') {
        if (kart.isPlayer) this.audio.playShellFire();
        this.emitHazard(kart, 'blue_shell', 2.8, 76, 6, 12);
      } else if (item === 'purple_shell') {
        if (kart.isPlayer) this.audio.playShellFire();
        this.emitHazard(kart, 'purple_shell', 2.7, 66, 5, 9);
      } else if (item === 'p_balloon') {
        if (kart.isPlayer) this.audio.playBalloonShield();
      } else if (item === 'super_bell') {
        if (kart.isPlayer) this.audio.playBell();
      } else if (item === 'elephant_fruit') {
        if (kart.isPlayer) this.audio.playHeavySplash();
      }
    },
    onHit: (victim, attackerId, kind) => {
      if (victim.isPlayer) {
        this.cameraShake = 0.85;
        this.audio.playHit();
      }
      if (this.mode === 'racing') {
        const label =
          kind === 'bumper'
            ? `${victim.name} Bumper Crash!`
            : kind === 'oil'
            ? `${victim.name} Oil Spin!`
            : kind === 'blue_shell'
            ? `${victim.name} Spiny Blast!`
            : kind === 'golden_fireball'
            ? `${victim.name} Scorched!`
            : `${victim.name} Hit!`;
        this.replay.recordEvent(this.raceElapsedMs, 'hit', victim.id, label);
      }
      if (this.mpBridge && victim.isRemoteHuman) {
        this.mpBridge.hitPlayer(victim.id, attackerId, kind);
      }
    },
    onBump: (a, b) => {
      if (a.isPlayer || b.isPlayer) {
        this.cameraShake = Math.max(this.cameraShake, 0.34);
        this.audio.playBumpSpark();
      }
      const mx = (a.x + b.x) * 0.5;
      const my = (a.y + b.y) * 0.5 + 0.65;
      const mz = (a.z + b.z) * 0.5;
      for (let i = 0; i < 10; i++) {
        const ang = (i / 10) * Math.PI * 2 + Math.random() * 0.3;
        const spd = 6 + Math.random() * 6;
        this.spawnParticle(
          mx,
          my,
          mz,
          Math.cos(ang) * spd,
          2.8 + Math.random() * 4.5,
          Math.sin(ang) * spd,
          i % 3 === 0 ? '#ffffff' : i % 2 === 0 ? '#fde047' : '#fb923c',
          0.78,
          0.24
        );
      }
    },
    onWallScrape: (kart, side) => {
      if (kart.isPlayer) {
        this.cameraShake = Math.max(this.cameraShake, 0.18);
        if (Math.random() < 0.25) this.audio.playBumpSpark();
      }
      if (Math.random() < 0.78) {
        const sx = kart.x + Math.cos(kart.heading) * side * 0.95;
        const sz = kart.z - Math.sin(kart.heading) * side * 0.95;
        for (let k = 0; k < 2; k++) {
          this.spawnParticle(
            sx,
            kart.y + 0.45,
            sz,
            (Math.random() - 0.5) * 8,
            2.4 + Math.random() * 3.2,
            (Math.random() - 0.5) * 8,
            k === 0 ? '#fef08a' : '#fb923c',
            0.72,
            0.22
          );
        }
      }
    },
    onLapComplete: (kart, newLap) => {
      if (kart.isPlayer) {
        this.audio.playLap(newLap === 3);
      }
    },
    onFinish: (kart) => {
      if (kart.isPlayer) {
        if (this.gameMode === 'time_trial' && !this.mpBridge) {
          this.timeTrialResult = 'cleared';
        }
        this.replay.recordEvent(this.raceElapsedMs, 'finish', kart.id, `${kart.name} Finish!`);
        this.mode = 'finished';
        this.audio.playFinish();
        this.audio.setFinalLapTempo(false);
        this.emitHudSnapshot();
      }
    },
  };

  private tick = (): void => {
    if (this.disposed) return;

    const rawDt = this.clock.getDelta();
    const dt = Math.min(rawDt, 0.05);
    const elapsed = this.clock.elapsedTime;

    if (this.activeBoostCallout && performance.now() > this.boostCalloutClearAt) {
      this.activeBoostCallout = null;
    }

    // Scroll jagged blue nitro flame texture continuously
    this.textures.nitroFlameMap.offset.x -= dt * 4.5;

    this.track.animate(dt, elapsed);
    this.updateWeatherAtmosphere(dt, elapsed);

    if (this.mode === 'title') {
      this.updateTitleCutscene(dt, elapsed);
    } else if (this.mode === 'paddock') {
      this.updatePaddock(dt, elapsed);
    } else if (this.mode === 'replay') {
      this.updateReplay(dt, elapsed);
    } else if (this.mode !== 'paused') {
      this.updateRace(dt, elapsed);
    }

    this.updateParticles(dt);
    this.justPressedKeys.clear();
    this.mouseRightJustPressed = false;
    this.mouseItemJustPressed = false;
    this.renderer.render(this.scene, this.camera);
    this.scheduleNextFrame();
  };

  private scheduleNextFrame(): void {
    if (this.disposed) return;
    if (this.isSoftwareGl) {
      this.afterDraw(this.tick);
    } else {
      this.frameId = requestAnimationFrame(this.tick);
    }
  }

  private afterDraw(cb: () => void): void {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (this.disposed) return;
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  private updatePaddock(dt: number, elapsed: number): void {
    this.paddockOrbitYaw = THREE.MathUtils.damp(this.paddockOrbitYaw, this.paddockTargetYaw, 6.5, dt);
    this.track.paddockTurntable.rotation.y = elapsed * 0.35 + this.paddockOrbitYaw;

    if (this.paddockRig) {
      if (this.paddockSelectAnim > 0) {
        this.paddockSelectAnim = Math.max(0, this.paddockSelectAnim - dt * 2.4);
        const hop = Math.sin(this.paddockSelectAnim * Math.PI) * 0.42;
        this.paddockRig.root.position.y = 0.36 + hop;
        this.paddockRig.headGroup.rotation.y = Math.sin(this.paddockSelectAnim * Math.PI * 2) * 0.35;
      } else {
        this.paddockRig.root.position.y = 0.36 + Math.sin(elapsed * 2.2) * 0.04;
        this.paddockRig.headGroup.rotation.y = Math.sin(elapsed * 1.4) * 0.14;
      }
      this.paddockRig.wheels.forEach((w) => {
        w.rotation.x += dt * 2.2;
      });
      this.paddockRig.hoverRotors.forEach((r) => {
        r.rotation.y += dt * 16;
      });
    }

    // Auto-center & scale preview camera for mobile / narrow viewports vs widescreen desktop
    const w = this.container.clientWidth || window.innerWidth;
    const aspect = this.camera.aspect || 1;
    const isCompact = w < 768 || aspect < 1.15;

    const targetFov = isCompact ? 46 : 44;
    const camX = isCompact ? 0.65 : 2.5;
    const camY = isCompact ? 262.45 : 262.15;
    const camZ = isCompact ? (aspect < 0.78 ? 8.4 : 6.4) : 5.45;
    const lookX = isCompact ? 0 : -1.35;
    const lookY = isCompact ? 260.78 : 261.0;

    this.camera.fov = THREE.MathUtils.damp(this.camera.fov, targetFov, 6, dt);
    this.camera.updateProjectionMatrix();
    this._tmpV3.set(camX, camY, camZ);
    this.camera.position.lerp(this._tmpV3, 1 - Math.exp(-6 * dt));
    this.camera.lookAt(lookX, lookY, 0);
  }

  private updateTitleCutscene(dt: number, elapsed: number): void {
    const emptyInput: KartInputState = {
      throttle: true,
      brake: false,
      left: false,
      right: false,
      hop: false,
      hopJustPressed: false,
      useItemJustPressed: false,
    };

    for (const kart of this.karts) {
      stepKartPhysics(
        kart,
        emptyInput,
        this.track,
        dt,
        elapsed * 1000,
        0,
        this.physicsCallbacks,
        { totalLaps: 99 }
      );
    }
    resolveKartCollisions(this.karts, this.physicsCallbacks);
    updateStandings(this.karts);
    this.syncVisualRigs(dt, elapsed, true);

    // Cinematic camera switching every 5 seconds following the lead racer
    const lead = this.karts[0];
    if (lead) {
      const cycle = Math.floor(elapsed / 5) % 4;
      const fx = Math.sin(lead.heading);
      const fz = Math.cos(lead.heading);
      const rx = Math.cos(lead.heading);
      const rz = -Math.sin(lead.heading);

      let camX = lead.x - fx * 9;
      let camY = lead.y + 4.5;
      let camZ = lead.z - fz * 9;
      if (cycle === 0) {
        // Low sweeping side-front broadcast shot
        camX = lead.x + fx * 11 + rx * 6;
        camY = lead.y + 3.2;
        camZ = lead.z + fz * 11 + rz * 6;
      } else if (cycle === 1) {
        // Helicopter aerial shot
        camX = lead.x - fx * 15 + rx * 14;
        camY = lead.y + 13;
        camZ = lead.z - fz * 15 + rz * 14;
      } else if (cycle === 2) {
        // Dynamic action chase slightly offset
        camX = lead.x - fx * 8.5 - rx * 3.5;
        camY = lead.y + 3.5;
        camZ = lead.z - fz * 8.5 - rz * 3.5;
      } else {
        // Reverse pack shot
        camX = lead.x + fx * 13 - rx * 4;
        camY = lead.y + 2.8;
        camZ = lead.z + fz * 13 - rz * 4;
      }

      this.camera.fov = THREE.MathUtils.damp(this.camera.fov, 58, 4, dt);
      this.camera.updateProjectionMatrix();
      this.camera.position.x = THREE.MathUtils.damp(this.camera.position.x, camX, 4.5, dt);
      this.camera.position.y = THREE.MathUtils.damp(this.camera.position.y, camY, 4.5, dt);
      this.camera.position.z = THREE.MathUtils.damp(this.camera.position.z, camZ, 4.5, dt);
      this.camera.lookAt(lead.x + fx * 3, lead.y + 1.4, lead.z + fz * 3);
    }
  }

  private updateReplay(dt: number, elapsed: number): void {
    const duration = this.replay.getDurationMs();
    if (!this.replayPaused && duration > 0) {
      this.replayTimeMs += dt * 1000 * this.replaySpeed;
      if (this.replayTimeMs > duration) {
        this.replayTimeMs = 0;
      }
    }

    const sample = this.replay.sampleAt(this.replayTimeMs, this.replayPlayerId);
    if (sample) {
      this.replayEventBanner = sample.activeEventLabel;
      for (const pose of sample.karts) {
        const rig = this.kartRigs.get(pose.id);
        if (!rig) continue;

        const driftSlip = pose.driftDir * 0.34;
        const spinOffset = pose.spinTimer > 0 ? pose.spinTimer * Math.PI * 4.5 : 0;
        rig.root.position.set(pose.x, pose.y + pose.hopY, pose.z);
        rig.root.rotation.set(0, pose.heading + driftSlip + spinOffset, 0);
        rig.kartBodyGroup.scale.setScalar(1.15);

        rig.kartBodyGroup.rotation.z = THREE.MathUtils.damp(
          rig.kartBodyGroup.rotation.z,
          -pose.steerVisual * 0.16,
          10,
          dt
        );
        rig.steeringWheel.rotation.z = -pose.steerVisual * 0.8;
        rig.frontSteerPivots.forEach((p) => {
          p.rotation.y = pose.steerVisual * 0.55;
        });
        rig.wheels.forEach((w) => {
          w.rotation.x = pose.wheelAngle;
        });
        rig.headGroup.rotation.y = pose.steerVisual * 0.35;

        if (!this.replayPaused && pose.boostActive) {
          for (const tip of rig.exhaustTips) {
            this._tmpV3.copy(tip).applyAxisAngle(this._tmpV3B.set(0, 1, 0), rig.root.rotation.y);
            this.spawnParticle(
              pose.x + this._tmpV3.x,
              pose.y + pose.hopY + this._tmpV3.y,
              pose.z + this._tmpV3.z,
              -Math.sin(pose.heading) * 6,
              1.4,
              -Math.cos(pose.heading) * 6,
              pose.starActive ? '#fde047' : '#fb923c',
              1.1,
              0.2
            );
          }
        }
      }

      const focus = sample.karts.find((k) => k.id === sample.focusKartId) ?? sample.karts[0];
      if (focus) {
        const fx = Math.sin(focus.heading);
        const fz = Math.cos(focus.heading);
        const rx = Math.cos(focus.heading);
        const rz = -Math.sin(focus.heading);

        let camX = focus.x - fx * 9;
        let camY = focus.y + 4.4;
        let camZ = focus.z - fz * 9;
        if (sample.cameraMode === 'heli') {
          camX = focus.x - fx * 14 + rx * 14;
          camY = focus.y + 13.5;
          camZ = focus.z - fz * 14 + rz * 14;
        } else if (sample.cameraMode === 'curb') {
          camX = focus.x + fx * 10 + rx * 8;
          camY = focus.y + 2.4;
          camZ = focus.z + fz * 10 + rz * 8;
        } else if (sample.cameraMode === 'front') {
          camX = focus.x + fx * 9.5 - rx * 2.5;
          camY = focus.y + 2.8;
          camZ = focus.z + fz * 9.5 - rz * 2.5;
        }

        this.camera.fov = THREE.MathUtils.damp(this.camera.fov, 56, 5, dt);
        this.camera.updateProjectionMatrix();
        this.camera.position.x = THREE.MathUtils.damp(this.camera.position.x, camX, 6, dt);
        this.camera.position.y = THREE.MathUtils.damp(this.camera.position.y, camY, 6, dt);
        this.camera.position.z = THREE.MathUtils.damp(this.camera.position.z, camZ, 6, dt);
        this.camera.lookAt(focus.x, focus.y + 1.4, focus.z);
      }
    }

    this.hudEmitTimer += dt;
    if (this.hudEmitTimer >= 0.08) {
      this.hudEmitTimer = 0;
      this.emitHudSnapshot();
    }
    void elapsed;
  }

  private updateRace(dt: number, elapsed: number): void {
    if (this.mode === 'countdown' && !this.mpBridge) {
      this.countdownTimer -= dt;
      if (this.countdownTimer <= 0) {
        this.countdownValue -= 1;
        if (this.countdownValue <= 0) {
          this.mode = 'racing';
          this.countdownValue = 0;
          this.track.setCountdownLights(0, true);
          this.audio.playCountdown(true);
          this.audio.startMusic();
        } else {
          this.countdownTimer = 0.95;
          this.track.setCountdownLights(this.countdownValue, false);
          this.audio.playCountdown(false);
        }
      }
    }

    const playerKart = this.getPlayerKart();
    const playerInput = this.buildLocalInput();
    const isTimeTrial = this.gameMode === 'time_trial' && !this.mpBridge;

    if (this.mode === 'racing' || this.mode === 'finished') {
      if (this.mode === 'racing') {
        this.raceElapsedMs += dt * 1000;
        if (isTimeTrial && playerKart && !playerKart.finished && this.raceElapsedMs >= this.timeTrialLimitMs) {
          this.raceElapsedMs = this.timeTrialLimitMs;
          playerKart.finished = true;
          this.timeTrialResult = 'failed';
          this.mode = 'finished';
          this.audio.playFinish();
          this.audio.setFinalLapTempo(false);
          this.emitHudSnapshot();
        }
      }

      const playerProgress = playerKart?.totalProgress ?? 0;
      for (const kart of this.karts) {
        stepKartPhysics(
          kart,
          playerInput,
          this.track,
          dt,
          this.raceElapsedMs,
          playerProgress,
          this.physicsCallbacks,
          {
            isTimeTrial,
            totalLaps: 3,
            smartSteering: this.smartSteering,
            autoUseItem: this.autoUseItem,
          }
        );
      }
      resolveKartCollisions(this.karts, this.physicsCallbacks);
      updateStandings(this.karts);
      this.updateHazards(dt);

      // Overtake replay event check + 15Hz replay pose recording
      if (this.mode === 'racing' && playerKart) {
        if (this.raceElapsedMs > 2500 && playerKart.rank < this.prevPlayerRank) {
          this.replay.recordEvent(
            this.raceElapsedMs,
            'overtake',
            playerKart.id,
            `Overtake to P${playerKart.rank}!`
          );
        }
        this.prevPlayerRank = playerKart.rank;

        this.replay.maybeSample(
          dt,
          this.raceElapsedMs,
          this.karts.map((k) => ({
            id: k.id,
            x: k.x,
            y: k.y,
            z: k.z,
            heading: k.heading,
            wheelAngle: k.wheelAngle,
            steerVisual: k.steerVisual,
            driftDir: k.driftDir,
            driftLevel: k.driftLevel,
            boostActive: k.boostTimer > 0,
            starActive: k.starTimer > 0,
            hopY: k.hopY,
            spinTimer: k.spinTimer,
          }))
        );
      }
    }

    this.syncVisualRigs(dt, elapsed, this.mode === 'racing');

    // Dynamic Chase Camera with 360° Loop Support, Optional Camera Tilt & Smooth Rear-View Swing
    if (playerKart) {
      const speedRatio = Math.max(0, playerKart.speed) / 48;
      const targetFov =
        this.mode === 'countdown'
          ? 54
          : 58 + Math.min(speedRatio, 1.35) * 16 + (playerKart.boostTimer > 0 ? 6.5 : 0);
      this.camera.fov = THREE.MathUtils.damp(this.camera.fov, targetFov, 7.5, dt);
      this.camera.updateProjectionMatrix();

      this.rearViewBlend = THREE.MathUtils.damp(
        this.rearViewBlend,
        this.rearViewHeld ? 1 : 0,
        9.5,
        dt
      );
      const camDist = 8.8;
      const camHeight = this.mode === 'countdown' ? 4.2 : 4.35;

      let desiredX: number;
      let desiredY: number;
      let desiredZ: number;
      let tx: number;
      let ty: number;
      let tz: number;

      if (playerKart.inLoop) {
        const upVec = this._vecUp.set(playerKart.upX, playerKart.upY, playerKart.upZ).normalize();
        const fwdVec = this._vecFwd.set(playerKart.tanX, playerKart.tanY, playerKart.tanZ).normalize();
        if (this.rearViewBlend > 0.5) fwdVec.negate();
        desiredX = playerKart.x - fwdVec.x * camDist + upVec.x * camHeight;
        desiredY = playerKart.y - fwdVec.y * camDist + upVec.y * camHeight;
        desiredZ = playerKart.z - fwdVec.z * camDist + upVec.z * camHeight;
        tx = playerKart.x + fwdVec.x * 6.5 + upVec.x * 1.4;
        ty = playerKart.y + fwdVec.y * 6.5 + upVec.y * 1.4;
        tz = playerKart.z + fwdVec.z * 6.5 + upVec.z * 1.4;
        this._camUpTarget.copy(upVec);
      } else {
        const orbitAngle = playerKart.heading + this.rearViewBlend * Math.PI;
        desiredX = playerKart.x - Math.sin(orbitAngle) * camDist;
        desiredY = playerKart.y + camHeight;
        desiredZ = playerKart.z - Math.cos(orbitAngle) * camDist;
        const lookAhead = THREE.MathUtils.lerp(7, 2.5, this.rearViewBlend);
        tx = playerKart.x + Math.sin(orbitAngle) * lookAhead;
        ty = playerKart.y + 1.55;
        tz = playerKart.z + Math.cos(orbitAngle) * lookAhead;

        const tiltAmt = this.cameraTilt ? -playerKart.steerVisual * 0.14 : 0;
        const rx = Math.cos(orbitAngle);
        const rz = -Math.sin(orbitAngle);
        this._camUpTarget.set(rx * tiltAmt, 1, rz * tiltAmt).normalize();
      }

      this.camera.up.lerp(this._camUpTarget, 1 - Math.exp(-8 * dt)).normalize();
      this.camera.position.x = THREE.MathUtils.damp(this.camera.position.x, desiredX, 11, dt);
      this.camera.position.y = THREE.MathUtils.damp(this.camera.position.y, desiredY, 10, dt);
      this.camera.position.z = THREE.MathUtils.damp(this.camera.position.z, desiredZ, 11, dt);

      // Chase camera anti-clipping above flat track deck / terrain
      if (!playerKart.inLoop) {
        const camProj = this.track.projectOnTrack(this.camera.position.x, this.camera.position.z);
        const minCamY = camProj.distance < BARRIER_HALF_WIDTH + 8 ? camProj.point.y + 1.85 : 1.5;
        if (this.camera.position.y < minCamY) {
          this.camera.position.y = minCamY;
        }
      }

      if (this.cameraShake > 0.001) {
        this.camera.position.x += (Math.random() - 0.5) * this.cameraShake;
        this.camera.position.y += (Math.random() - 0.5) * this.cameraShake * 0.7;
        this.cameraShake *= Math.exp(-8 * dt);
      }

      if (!this.camLookInitialized) {
        this.camLookTarget.set(tx, ty, tz);
        this.camLookInitialized = true;
      } else {
        this.camLookTarget.x = THREE.MathUtils.damp(this.camLookTarget.x, tx, 14, dt);
        this.camLookTarget.y = THREE.MathUtils.damp(this.camLookTarget.y, ty, 14, dt);
        this.camLookTarget.z = THREE.MathUtils.damp(this.camLookTarget.z, tz, 14, dt);
      }
      this.camera.lookAt(this.camLookTarget);

      // Item Roulette slot-tick SFX while spinning
      if (playerKart.rouletteTimer > 0 && this.mode === 'racing') {
        this.rouletteTickTimer -= dt;
        if (this.rouletteTickTimer <= 0) {
          this.rouletteTickTimer = 0.085;
          this.audio.playRouletteTick(this.rouletteTickStep++);
        }
      }

      this.audio.updateEngine(
        speedRatio,
        playerKart.boostTimer > 0,
        this.mode === 'racing',
        playerInput.throttle,
        this.mode === 'countdown'
      );
    }

    this.jumbotronTimer += dt;
    if (this.jumbotronTimer >= 0.45) {
      this.jumbotronTimer = 0;
      const phaseLabel =
        this.mode === 'countdown'
          ? `READY ${this.countdownValue}`
          : this.mode === 'finished'
          ? 'FINISH!'
          : 'LIVE GP';
      this.track.updateJumbotrons(
        this.karts
          .slice()
          .sort((a, b) => a.rank - b.rank)
          .map((k) => ({
            name: k.name,
            color: k.spec.primaryColor,
            rank: k.rank,
            lap: k.lap,
          })),
        phaseLabel
      );
    }

    this.hudEmitTimer += dt;
    if (this.hudEmitTimer >= 0.065) {
      this.hudEmitTimer = 0;
      this.emitHudSnapshot();
    }

    if (this.mpBridge && playerKart && this.mode === 'racing') {
      this.netSendTimer += dt;
      if (this.netSendTimer >= 0.05) {
        this.netSendTimer = 0;
        this.mpBridge.sendState({
          id: playerKart.id,
          characterId: playerKart.spec.id,
          variantId: playerKart.variantId,
          vehicleId: playerKart.vehicle.id,
          x: playerKart.x,
          y: playerKart.y,
          z: playerKart.z,
          heading: playerKart.heading,
          speed: playerKart.speed,
          steer: playerKart.steerVisual,
          driftDir: playerKart.driftDir,
          driftLevel: playerKart.driftLevel,
          boostTimer: playerKart.boostTimer,
          starTimer: playerKart.starTimer,
          spinTimer: playerKart.spinTimer,
          hopY: playerKart.hopY,
          scaleFactor: playerKart.scaleFactor,
          shieldCount: playerKart.shieldCount,
          bellTimer: playerKart.bellTimer,
          drillTimer: playerKart.drillTimer,
          cloneActive: playerKart.cloneActive,
          lap: playerKart.lap,
          progress: playerKart.totalProgress,
          rank: playerKart.rank,
          finished: playerKart.finished,
          finishTimeMs: playerKart.finishTimeMs,
        });
      }
    }
  }

  private syncVisualRigs(dt: number, elapsed: number, emitEffects: boolean): void {
    for (const kart of this.karts) {
      const rig = this.kartRigs.get(kart.id);
      if (!rig) continue;

      const driftSlip = kart.driftDir * 0.34;
      const spinOffset = kart.spinTimer > 0 ? kart.spinTimer * Math.PI * 4.5 : 0;

      // 3D Surface & 360-Degree Loop Orientation
      this._vecUp.set(kart.upX, kart.upY, kart.upZ).normalize();
      if (kart.inLoop) {
        this._vecFwd.set(kart.tanX, kart.tanY, kart.tanZ).normalize();
        const relSteer = kart.loopRelSteer + driftSlip + spinOffset;
        this._vecRight.crossVectors(this._vecUp, this._vecFwd).normalize();
        // Rotate forward slightly around up by relSteer
        this._vecFwd.applyAxisAngle(this._vecUp, relSteer).normalize();
      } else {
        const yaw = kart.heading + driftSlip + spinOffset;
        this._vecFwd.set(Math.sin(yaw), 0, Math.cos(yaw)).normalize();
      }
      this._vecRight.crossVectors(this._vecUp, this._vecFwd).normalize();
      this._vecFwd.crossVectors(this._vecRight, this._vecUp).normalize();

      this._mat4Basis.makeBasis(this._vecRight, this._vecUp, this._vecFwd);
      rig.root.quaternion.setFromRotationMatrix(this._mat4Basis);
      rig.root.position.set(
        kart.x + this._vecUp.x * kart.hopY,
        kart.y + this._vecUp.y * kart.hopY,
        kart.z + this._vecUp.z * kart.hopY
      );

      // Smooth Mushroom / Elephant Scale Factor (1.15x base kart chassis)
      const targetRigScale = 1.15 * kart.scaleFactor;
      const curScale = rig.kartBodyGroup.scale.x;
      const nextScale = THREE.MathUtils.damp(curScale, targetRigScale, 10, dt);
      rig.kartBodyGroup.scale.setScalar(nextScale);

      // Celebratory 360-degree kart spin when an ability is claimed
      const claimSpinY =
        kart.claimSpinTimer > 0
          ? Math.sin((1 - kart.claimSpinTimer / 0.52) * Math.PI * 0.5) * Math.PI * 2
          : 0;
      rig.kartBodyGroup.rotation.y = claimSpinY;

      const rollFactor = rig.isTwoWheel ? 0.34 : 0.16;
      const driftRollFactor = rig.isTwoWheel ? 0.16 : 0.08;
      const targetRoll = -kart.steerVisual * rollFactor - kart.driftDir * driftRollFactor;
      rig.kartBodyGroup.rotation.z = THREE.MathUtils.damp(
        rig.kartBodyGroup.rotation.z,
        targetRoll,
        10,
        dt
      );
      const claimPitch =
        kart.claimSpinTimer > 0 ? -Math.sin((kart.claimSpinTimer / 0.52) * Math.PI) * 0.12 : 0;
      const targetPitch = (!kart.grounded ? -0.14 : kart.boostTimer > 0 ? -0.05 : 0) + claimPitch;
      rig.kartBodyGroup.rotation.x = THREE.MathUtils.damp(
        rig.kartBodyGroup.rotation.x,
        targetPitch,
        9,
        dt
      );

      rig.steeringWheel.rotation.z = -kart.steerVisual * 0.85;
      rig.frontSteerPivots.forEach((p) => {
        p.rotation.y = kart.steerVisual * 0.55;
      });
      rig.wheels.forEach((w) => {
        w.rotation.x = kart.wheelAngle;
      });
      const boosting = kart.boostTimer > 0 || kart.starTimer > 0;
      rig.hoverRotors.forEach((r) => {
        r.rotation.y += dt * (boosting ? 28 : 16);
      });

      rig.driverGroup.rotation.z = THREE.MathUtils.damp(
        rig.driverGroup.rotation.z,
        kart.steerVisual * 0.28 + kart.driftDir * 0.12,
        10,
        dt
      );
      rig.headGroup.rotation.y = kart.steerVisual * 0.42;

      // Held Ability Item behind kart between exhaust pipes
      const showHeld = kart.rouletteTimer <= 0 && kart.heldItem !== 'none';
      rig.heldItemMount.visible = showHeld;
      if (showHeld) {
        rig.heldItemMount.position.y = 0.62 + Math.sin(elapsed * 5.2 + kart.aiSeed) * 0.06;
        rig.heldItemMount.rotation.y = elapsed * 2.2;
        (Object.keys(rig.heldItemMeshes) as Exclude<ItemKind, 'none'>[]).forEach((itemKey) => {
          rig.heldItemMeshes[itemKey].visible = kart.heldItem === itemKey;
        });
      }

      // Superstar Rainbow Hologram Sphere Animation
      const isStar = kart.starTimer > 0;
      rig.starHologramGroup.visible = isStar;
      if (isStar) {
        rig.starHologramGroup.rotation.y = elapsed * 4.2;
        rig.starHologramGroup.rotation.x = Math.sin(elapsed * 2.6) * 0.45;
        this._tmpColor.setHSL((elapsed * 2.5) % 1, 0.95, 0.55);
        rig.paintMat.color.copy(this._tmpColor);
        rig.underglowMat.color.copy(this._tmpColor);
        rig.starHologramGroup.children.forEach((ch, cIdx) => {
          const mat = (ch as THREE.Mesh).material as THREE.MeshBasicMaterial | undefined;
          if (mat && mat.color) {
            mat.color.setHSL((elapsed * 1.4 + cIdx * 0.28) % 1, 0.96, 0.6);
          }
        });
      } else if (kart.poisonTimer > 0) {
        rig.paintMat.color.set('#a855f7');
        rig.underglowMat.color.set('#9333ea');
      } else {
        rig.paintMat.color.set(kart.spec.primaryColor);
        rig.underglowMat.color.set(kart.spec.neonColor);
      }

      // Active Power-Up Attachments (P-Balloon, Super Bell Claws, Drill, Cannon Box, Cloud Halo, Double Cherry)
      rig.pBalloonGroup.visible = kart.shieldCount > 0;
      if (kart.shieldCount > 0) {
        rig.pBalloonGroup.rotation.y = elapsed * 2.8;
        rig.balloonMeshes.forEach((bm, bIdx) => {
          bm.visible = bIdx < kart.shieldCount;
          bm.position.y = 1.15 + Math.sin(elapsed * 5 + bIdx * 2) * 0.12;
        });
      }
      rig.bellClawsGroup.visible = kart.bellTimer > 0;
      rig.drillNoseMesh.visible = kart.drillTimer > 0;
      if (kart.drillTimer > 0) rig.drillNoseMesh.rotation.z += dt * 18;
      rig.cannonBoxMesh.visible = kart.cannonBoxTimer > 0;
      rig.cloudHalo.visible = kart.cloudHopsLeft > 0;
      if (kart.cloudHopsLeft > 0) rig.cloudHalo.rotation.y = elapsed * 2.5;
      rig.cloneGhostGroup.visible = kart.cloneActive;
      if (kart.cloneActive) {
        rig.cloneGhostGroup.position.x = -1.6 + Math.sin(elapsed * 4) * 0.25;
      }

      // Dynamic 3D Sharp Fiery Electric-Blue Nitro Exhaust Cones (image_d9105b19.png style)
      const isLv3 = kart.boostStrength >= 1.26;
      const isLv2 = kart.boostStrength >= 1.2;
      const flameCol =
        kart.starTimer > 0
          ? '#fde047'
          : isLv3
          ? '#a855f7'
          : isLv2
          ? '#38bdf8'
          : '#0ea5e9';

      rig.exhaustFlames.forEach((cone, idx) => {
        cone.visible = boosting;
        if (boosting) {
          const pulse = 0.92 + Math.sin(elapsed * 38 + idx * 1.4) * 0.3;
          const lengthScale = (isLv3 ? 2.15 : isLv2 ? 1.75 : 1.45) * pulse;
          cone.scale.set(pulse * 1.05, pulse * 1.05, lengthScale);
          (cone.material as THREE.MeshBasicMaterial).color.set(idx % 2 === 0 ? '#7dd3fc' : flameCol);
        }
      });

      if (emitEffects && boosting) {
        const burstCount = isLv3 ? 3 : 2;
        const flameScale = isLv3 ? 1.6 : isLv2 ? 1.35 : 1.12;

        for (let b = 0; b < burstCount; b++) {
          for (const tip of rig.exhaustTips) {
            this._tmpV3.copy(tip).applyQuaternion(rig.root.quaternion);
            this.spawnParticle(
              kart.x + this._tmpV3.x,
              kart.y + kart.hopY + this._tmpV3.y,
              kart.z + this._tmpV3.z,
              -this._vecFwd.x * (6 + b * 2.5) + (Math.random() - 0.5) * 2.4,
              1.1 + Math.random() * 1.5,
              -this._vecFwd.z * (6 + b * 2.5) + (Math.random() - 0.5) * 2.4,
              b === 0 ? '#e0f2fe' : flameCol,
              flameScale,
              0.24
            );
          }
        }
      }

      // Continuous Surface-Aware Track Drag Animation behind Rear Tires
      if (emitEffects && kart.grounded && Math.abs(kart.speed) > 15 && !kart.inLoop) {
        const dragProj = this.track.projectOnTrack(kart.x, kart.z, kart.trackIndex, kart.y);
        const dragChance =
          this.weatherRainFactor > 0.4
            ? 0.55
            : dragProj.surface === 'offroad'
            ? 0.65
            : Math.abs(kart.steerVisual) > 0.25 || boosting
            ? 0.42
            : 0.16;

        if (Math.random() < dragChance) {
          const dragCol =
            this.weatherRainFactor > 0.4
              ? '#bae6fd'
              : dragProj.surface === 'offroad'
              ? '#a3e635'
              : '#cbd5e1';
          const side = Math.random() < 0.5 ? -0.78 : 0.78;
          this.spawnParticle(
            kart.x - this._vecFwd.x * 1.05 + this._vecRight.x * side,
            kart.y + 0.18,
            kart.z - this._vecFwd.z * 1.05 + this._vecRight.z * side,
            -this._vecFwd.x * 3.5 + (Math.random() - 0.5) * 1.8,
            1.4 + Math.random() * 1.4,
            -this._vecFwd.z * 3.5 + (Math.random() - 0.5) * 1.8,
            dragCol,
            this.weatherRainFactor > 0.4 ? 0.78 : 0.58,
            0.22
          );
        }
      }

      // Drift Sparks, Twin Rear Skid Marks & Continuous 3D Volumetric Drift/Nitro Flame Trails
      const driftActive = emitEffects && kart.driftDir !== 0 && kart.grounded;
      const driftCol =
        kart.driftLevel === 3
          ? '#c084fc'
          : kart.driftLevel === 2
          ? '#fb923c'
          : kart.driftLevel === 1
          ? '#38bdf8'
          : '#7dd3fc';

      if (driftActive) {
        if (Math.random() < 0.75 && !kart.inLoop) {
          this.spawnSkidMark(kart.x, kart.y, kart.z, kart.heading + driftSlip);
        }
        const sparkCount = kart.driftLevel >= 2 ? 3 : 2;
        for (let s = 0; s < sparkCount; s++) {
          this.spawnParticle(
            kart.x - this._vecFwd.x * 1.0 + (Math.random() - 0.5) * 0.9,
            kart.y + 0.25,
            kart.z - this._vecFwd.z * 1.0 + (Math.random() - 0.5) * 0.9,
            (Math.random() - 0.5) * 7.5,
            2.6 + Math.random() * 2.8,
            (Math.random() - 0.5) * 7.5,
            s === 0 && kart.driftLevel === 0 ? '#e2e8f0' : driftCol,
            0.78 + kart.driftLevel * 0.3,
            0.3
          );
        }
      }

      const trails = this.kartTrails.get(kart.id);
      if (trails) {
        // Landing burst particles after air jump
        if (!trails.wasGrounded && kart.grounded && emitEffects) {
          for (let p = 0; p < 6; p++) {
            const ang = (p / 6) * Math.PI * 2;
            this.spawnParticle(
              kart.x + Math.cos(ang) * 0.9,
              kart.y + 0.2,
              kart.z + Math.sin(ang) * 0.9,
              Math.cos(ang) * 5.5,
              1.6,
              Math.sin(ang) * 5.5,
              '#fde68a',
              0.85,
              0.24
            );
          }
        }
        trails.wasGrounded = kart.grounded;

        const rx = this._vecRight.x;
        const rz = this._vecRight.z;
        const fx = this._vecFwd.x;
        const fz = this._vecFwd.z;

        const tireBack = 0.95;
        const tireHalf = 0.8;
        trails.driftL.pushPoint(
          driftActive,
          kart.x - fx * tireBack - rx * tireHalf,
          kart.y + this._vecUp.y * 0.2,
          kart.z - fz * tireBack - rz * tireHalf,
          rx,
          rz,
          driftCol,
          0.24 + kart.driftLevel * 0.08,
          this._vecUp.x,
          this._vecUp.y,
          this._vecUp.z
        );
        trails.driftR.pushPoint(
          driftActive,
          kart.x - fx * tireBack + rx * tireHalf,
          kart.y + this._vecUp.y * 0.2,
          kart.z - fz * tireBack + rz * tireHalf,
          rx,
          rz,
          driftCol,
          0.24 + kart.driftLevel * 0.08,
          this._vecUp.x,
          this._vecUp.y,
          this._vecUp.z
        );

        // Exhaust pipe tips for Sharp Fiery Animated Blue Nitro Trails
        const nitroActive = emitEffects && boosting;
        const tL = rig.exhaustTips[0] ?? this._tmpV3.set(-0.42, 0.85, -1.42);
        const tR = rig.exhaustTips[1] ?? this._tmpV3B.set(0.42, 0.85, -1.42);
        const wTipL = this._tmpV3.copy(tL).multiplyScalar(kart.scaleFactor).applyQuaternion(rig.root.quaternion);
        const wTipR = this._tmpV3B.copy(tR).multiplyScalar(kart.scaleFactor).applyQuaternion(rig.root.quaternion);

        trails.nitroL.pushPoint(
          nitroActive,
          kart.x + wTipL.x + this._vecUp.x * kart.hopY,
          kart.y + wTipL.y + this._vecUp.y * kart.hopY,
          kart.z + wTipL.z + this._vecUp.z * kart.hopY,
          rx,
          rz,
          flameCol,
          isLv3 ? 0.56 : isLv2 ? 0.48 : 0.42,
          this._vecUp.x,
          this._vecUp.y,
          this._vecUp.z
        );
        trails.nitroR.pushPoint(
          nitroActive,
          kart.x + wTipR.x + this._vecUp.x * kart.hopY,
          kart.y + wTipR.y + this._vecUp.y * kart.hopY,
          kart.z + wTipR.z + this._vecUp.z * kart.hopY,
          rx,
          rz,
          flameCol,
          isLv3 ? 0.56 : isLv2 ? 0.48 : 0.42,
          this._vecUp.x,
          this._vecUp.y,
          this._vecUp.z
        );
      }
    }
  }

  private updateHazards(dt: number): void {
    const leader = this.karts.find((k) => k.rank === 1);
    for (let i = this.hazards.length - 1; i >= 0; i--) {
      const hz = this.hazards[i];
      hz.ttl -= dt;

      if (hz.kind === 'blue_shell') {
        if (leader && leader.id !== hz.ownerId) {
          const dx = leader.x - hz.x;
          const dz = leader.z - hz.z;
          const dist = Math.max(0.1, Math.hypot(dx, dz));
          const speed = 78;
          hz.vx = THREE.MathUtils.lerp(hz.vx, (dx / dist) * speed, Math.min(1, dt * 5));
          hz.vz = THREE.MathUtils.lerp(hz.vz, (dz / dist) * speed, Math.min(1, dt * 5));
        }
        hz.x += hz.vx * dt;
        hz.z += hz.vz * dt;
        hz.mesh.rotation.y += dt * 20;
        const proj = this.track.projectOnTrack(hz.x, hz.z, undefined, hz.y);
        hz.y = proj.point.y + 0.55;
      } else if (
        hz.kind === 'shell' ||
        hz.kind === 'golden_fireball' ||
        hz.kind === 'purple_shell' ||
        hz.kind === 'cannonball'
      ) {
        hz.x += hz.vx * dt;
        hz.z += hz.vz * dt;
        hz.mesh.rotation.y += dt * 16;
        const proj = this.track.projectOnTrack(hz.x, hz.z, undefined, hz.y);
        hz.y = proj.point.y + 0.14;
        if (Math.abs(proj.lateral) > BARRIER_HALF_WIDTH - 0.5) {
          const nx = proj.right.x * Math.sign(proj.lateral);
          const nz = proj.right.z * Math.sign(proj.lateral);
          const dot = hz.vx * nx + hz.vz * nz;
          if (dot > 0) {
            hz.vx -= 2 * dot * nx;
            hz.vz -= 2 * dot * nz;
            hz.bouncesLeft -= 1;
          }
        }
      } else {
        hz.mesh.rotation.y += dt * 1.5;
      }
      hz.mesh.position.set(hz.x, hz.y, hz.z);

      const isStatic = hz.kind === 'banana' || hz.kind === 'honey_puddle';
      let consumed = hz.ttl <= 0 || hz.bouncesLeft < 0;
      if (!consumed) {
        for (const kart of this.karts) {
          if (kart.id === hz.ownerId && hz.ttl > (isStatic ? 21.3 : 8.3)) continue;
          if (kart.spinTimer > 0) continue;
          const dx = kart.x - hz.x;
          const dz = kart.z - hz.z;
          if (dx * dx + dz * dz < 3.4 && Math.abs(kart.y - hz.y) < 3.2) {
            applyKartShieldOrSpin(kart, hz.ownerId, hz.kind, this.physicsCallbacks, 1.25);
            if (hz.kind === 'purple_shell') {
              const puddle: NetHazard = {
                id: `${this.mpBridge ? 'net' : 'loc'}_pud_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
                kind: 'honey_puddle',
                ownerId: hz.ownerId,
                x: hz.x,
                y: hz.y,
                z: hz.z,
                vx: 0,
                vz: 0,
                bouncesLeft: 0,
                ttl: 12,
              };
              this.spawnHazardVisual(puddle);
            }
            consumed = true;
            break;
          }
        }
      }

      if (consumed) {
        this.hazardGroup.remove(hz.mesh);
        this.hazards.splice(i, 1);
        if (this.mpBridge && hz.id.startsWith('net_')) {
          this.mpBridge.removeHazard(hz.id);
        }
      }
    }
  }

  private updateParticles(dt: number): void {
    let dirty = false;
    for (let i = 0; i < PARTICLE_POOL_SIZE; i++) {
      const p = this.particles[i];
      if (!p.active) continue;
      dirty = true;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        this._dummy.position.set(0, -50, 0);
        this._dummy.scale.setScalar(0.001);
      } else {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.z += p.vz * dt;
        const s = p.size * (p.life / p.maxLife);
        this._dummy.position.set(p.x, p.y, p.z);
        this._dummy.rotation.set(p.life * 8, p.life * 5, 0);
        this._dummy.scale.setScalar(Math.max(0.05, s));
        this.particleMesh.setColorAt(i, p.color);
      }
      this._dummy.updateMatrix();
      this.particleMesh.setMatrixAt(i, this._dummy.matrix);
    }
    if (dirty) {
      this.particleMesh.instanceMatrix.needsUpdate = true;
      if (this.particleMesh.instanceColor) this.particleMesh.instanceColor.needsUpdate = true;
    }
  }

  private pollGamepad(readInput: boolean): {
    throttle: boolean;
    brake: boolean;
    left: boolean;
    right: boolean;
    steerAnalog: number;
    hop: boolean;
    hopJustPressed: boolean;
    useItemJustPressed: boolean;
  } {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const pad = Array.from(pads).find((p) => p && p.connected) ?? null;

    if (!pad) {
      this.gamepadConnected = false;
      this.gamepadName = '';
      this.prevPadHop = false;
      this.prevPadItem = false;
      this.prevPadStart = false;
      return {
        throttle: false,
        brake: false,
        left: false,
        right: false,
        steerAnalog: 0,
        hop: false,
        hopJustPressed: false,
        useItemJustPressed: false,
      };
    }

    this.gamepadConnected = true;
    this.gamepadName = pad.id.slice(0, 28);

    const startBtn = Boolean(pad.buttons[9]?.pressed);
    if (startBtn && !this.prevPadStart) {
      if (this.mode === 'racing') this.setPaused(true);
      else if (this.mode === 'paused') this.setPaused(false);
    }
    this.prevPadStart = startBtn;

    if (!readInput) {
      return {
        throttle: false,
        brake: false,
        left: false,
        right: false,
        steerAnalog: 0,
        hop: false,
        hopJustPressed: false,
        useItemJustPressed: false,
      };
    }

    const axisX = Math.abs(pad.axes[0] ?? 0) > 0.16 ? (pad.axes[0] ?? 0) : 0;
    const dpadLeft = Boolean(pad.buttons[14]?.pressed);
    const dpadRight = Boolean(pad.buttons[15]?.pressed);
    const steerAnalog = dpadLeft ? -1 : dpadRight ? 1 : axisX;

    const throttle =
      Boolean(pad.buttons[0]?.pressed) ||
      Boolean(pad.buttons[7]?.pressed) ||
      (pad.buttons[7]?.value ?? 0) > 0.15;
    const brake =
      Boolean(pad.buttons[1]?.pressed) ||
      Boolean(pad.buttons[6]?.pressed) ||
      (pad.buttons[6]?.value ?? 0) > 0.15;
    const hop = Boolean(pad.buttons[5]?.pressed) || Boolean(pad.buttons[4]?.pressed);
    const itemBtn = Boolean(pad.buttons[2]?.pressed) || Boolean(pad.buttons[3]?.pressed);

    const hopJustPressed = hop && !this.prevPadHop;
    const useItemJustPressed = itemBtn && !this.prevPadItem;
    this.prevPadHop = hop;
    this.prevPadItem = itemBtn;

    return {
      throttle,
      brake,
      left: steerAnalog < -0.22,
      right: steerAnalog > 0.22,
      steerAnalog,
      hop,
      hopJustPressed,
      useItemJustPressed,
    };
  }

  private buildLocalInput(): KartInputState {
    // Always keep gamepad connection status updated, but ONLY read driving input from the active exclusive ControlMode
    const pad = this.pollGamepad(this.controlMode === 'controller');

    const uiItem = this.justPressedKeys.has('UiItem');

    switch (this.controlMode) {
      case 'keyboard': {
        const left = this.heldKeys.has('KeyA') || this.heldKeys.has('ArrowLeft');
        const right = this.heldKeys.has('KeyD') || this.heldKeys.has('ArrowRight');
        const throttle =
          this.heldKeys.has('KeyW') || this.heldKeys.has('ArrowUp') || this.autoAccel;
        const brake = this.heldKeys.has('KeyS') || this.heldKeys.has('ArrowDown');
        const hop = this.heldKeys.has('Space') || this.heldKeys.has('ShiftLeft');
        const hopJustPressed =
          this.justPressedKeys.has('Space') || this.justPressedKeys.has('ShiftLeft');
        const useItemJustPressed =
          uiItem ||
          this.justPressedKeys.has('KeyX') ||
          this.justPressedKeys.has('KeyE') ||
          this.justPressedKeys.has('KeyF') ||
          this.justPressedKeys.has('Enter');
        return { throttle, brake, left, right, hop, hopJustPressed, useItemJustPressed };
      }

      case 'mouse': {
        const steer = Math.abs(this.mouseSteerNorm) > 0.08 ? this.mouseSteerNorm : 0;
        const throttle = this.mouseLeftDown || this.autoAccel;
        const brake = false;
        const hop = this.mouseRightDown;
        const hopJustPressed = this.mouseRightJustPressed;
        const useItemJustPressed =
          uiItem ||
          this.mouseItemJustPressed ||
          this.justPressedKeys.has('KeyX') ||
          this.justPressedKeys.has('KeyE') ||
          this.justPressedKeys.has('Space');
        return {
          throttle,
          brake,
          left: steer < -0.15,
          right: steer > 0.15,
          steerAnalog: steer,
          hop,
          hopJustPressed,
          useItemJustPressed,
        };
      }

      case 'controller': {
        return {
          throttle: pad.throttle || this.autoAccel,
          brake: pad.brake,
          left: pad.left,
          right: pad.right,
          steerAnalog: pad.steerAnalog,
          hop: pad.hop,
          hopJustPressed: pad.hopJustPressed,
          useItemJustPressed: uiItem || pad.useItemJustPressed,
        };
      }

      case 'mobile_joystick':
      case 'mobile_buttons': {
        const steer = Math.abs(this.touchSteer) > 0.06 ? this.touchSteer : 0;
        return {
          throttle: this.touchThrottle || this.autoAccel,
          brake: this.touchBrake,
          left: steer < -0.2,
          right: steer > 0.2,
          steerAnalog: steer,
          hop: this.touchDrift,
          hopJustPressed: this.justPressedKeys.has('TouchDrift'),
          useItemJustPressed: uiItem || this.justPressedKeys.has('TouchItem'),
        };
      }
    }
  }

  private emitHudSnapshot(): void {
    const pk = this.getPlayerKart();
    const sorted = this.karts
      .slice()
      .sort((a, b) => a.rank - b.rank)
      .map((k) => ({
        id: k.id,
        name: k.name,
        characterId: k.spec.id,
        vehicleId: k.vehicle.id,
        rank: k.rank,
        lap: Math.min(k.lap, 3),
        finished: k.finished,
        finishTimeMs: k.finishTimeMs,
        color: k.spec.primaryColor,
        isPlayer: k.isPlayer,
      }));

    const isTT = this.gameMode === 'time_trial' && !this.mpBridge;
    const ttLimit = isTT ? this.timeTrialLimitMs : 0;
    const ttRem = isTT ? Math.max(0, ttLimit - this.raceElapsedMs) : 0;

    // Ray-traced style solar lens flare projection
    const sunDir = new THREE.Vector3(120, 155, 85).normalize();
    const camFwd = this.camera.getWorldDirection(new THREE.Vector3());
    const dotSun = camFwd.dot(sunDir);
    let sunGlare = { visible: false, x: 50, y: 50, intensity: 0 };
    if (dotSun > 0.35 && this.mode === 'racing') {
      const sunWorld = this.camera.position.clone().addScaledVector(sunDir, 220);
      const sunScreen = sunWorld.project(this.camera);
      if (sunScreen.z < 1) {
        const distFromCenter = Math.hypot(sunScreen.x, sunScreen.y);
        const glare = Math.max(0, 1 - distFromCenter * 0.72) * (1 - this.weatherRainFactor * 0.85);
        if (glare > 0.04) {
          sunGlare = {
            visible: true,
            x: (sunScreen.x * 0.5 + 0.5) * 100,
            y: (-sunScreen.y * 0.5 + 0.5) * 100,
            intensity: Math.min(1, glare * 1.2),
          };
        }
      }
    }

    this.onHudUpdate({
      mode: this.mode,
      paddockStage: this.paddockStage,
      selectedVariantId: this.paddockSelectedVariantId,
      selectedVehicleId: this.paddockSelectedVehicleId,
      gameMode: this.gameMode,
      mapId: this.currentMapId,
      weatherChoice: this.weatherChoice,
      activeWeather: this.activeWeather,
      rainFactor: this.weatherRainFactor,
      sunGlare,
      controlMode: this.controlMode,
      smartSteering: this.smartSteering,
      autoAccel: this.autoAccel,
      autoUseItem: this.autoUseItem,
      cameraTilt: this.cameraTilt,
      soundMuted: this.soundMuted,
      rank: pk?.rank ?? 1,
      totalRacers: Math.max(1, this.karts.length),
      lap: Math.min(pk?.lap ?? 1, 3),
      speedKmh: Math.round(Math.abs(pk?.speed ?? 0) * 3.1),
      heldItem: pk?.heldItem ?? 'none',
      rouletteActive: (pk?.rouletteTimer ?? 0) > 0,
      driftLevel: pk?.driftLevel ?? 0,
      boostActive: (pk?.boostTimer ?? 0) > 0,
      starActive: (pk?.starTimer ?? 0) > 0,
      boostCallout: this.activeBoostCallout,
      countdownValue: this.countdownValue,
      raceTimeMs: this.raceElapsedMs,
      totalLaps: 3,
      timeLimitMs: ttLimit,
      timeRemainingMs: ttRem,
      timeTrialResult: this.timeTrialResult,
      standings: sorted,
      minimapPoints: this.minimapPath,
      minimapRacers: this.karts.map((k) => ({
        x: k.x,
        z: k.z,
        color: k.spec.primaryColor,
        isPlayer: k.isPlayer,
      })),
      gamepadConnected: this.gamepadConnected,
      gamepadName: this.gamepadName,
      hasReplay: this.replay.hasData(),
      replayDurationMs: this.replay.getDurationMs(),
      replayTimeMs: this.replayTimeMs,
      replayPaused: this.replayPaused,
      replaySpeed: this.replaySpeed,
      replayEvents: this.replay.getEvents(),
      replayEventBanner: this.replayEventBanner,
    });
  }

  private handleKeyDown = (e: KeyboardEvent): void => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
      const activeTag = document.activeElement?.tagName;
      if (activeTag !== 'INPUT' && activeTag !== 'TEXTAREA') {
        e.preventDefault();
      }
    }
    if (!this.heldKeys.has(e.code)) {
      this.justPressedKeys.add(e.code);
    }
    this.heldKeys.add(e.code);
    if (e.code === 'KeyC' || e.code === 'KeyR') {
      this.rearViewHeld = true;
    }
  };

  private handleKeyUp = (e: KeyboardEvent): void => {
    this.heldKeys.delete(e.code);
    if (e.code === 'KeyC' || e.code === 'KeyR') {
      this.rearViewHeld = false;
    }
  };

  private handleBlur = (): void => {
    this.heldKeys.clear();
    this.rearViewHeld = false;
    this.mouseLeftDown = false;
    this.mouseRightDown = false;
  };

  private handleContextMenu = (e: MouseEvent): void => {
    if (this.controlMode === 'mouse' && this.mode === 'racing') {
      e.preventDefault();
    }
  };

  private handlePointerDown = (e: PointerEvent): void => {
    if (this.mode === 'paddock') {
      this.paddockDragActive = true;
      this.paddockLastX = e.clientX;
    } else if (this.mode === 'racing' && this.controlMode === 'mouse') {
      if (e.button === 0) {
        this.mouseLeftDown = true;
      } else if (e.button === 2) {
        if (!this.mouseRightDown) this.mouseRightJustPressed = true;
        this.mouseRightDown = true;
      } else if (e.button === 1) {
        e.preventDefault();
        this.mouseItemJustPressed = true;
      }
    }
  };

  private handlePointerMove = (e: PointerEvent): void => {
    if (this.paddockDragActive && this.mode === 'paddock') {
      const dx = e.clientX - this.paddockLastX;
      this.paddockLastX = e.clientX;
      this.paddockTargetYaw += dx * 0.012;
    } else if (this.controlMode === 'mouse' && this.mode === 'racing') {
      const w = window.innerWidth || 1;
      this.mouseSteerNorm = THREE.MathUtils.clamp((e.clientX / w - 0.5) * 2.3, -1, 1);
    }
  };

  private handlePointerUp = (e: PointerEvent): void => {
    this.paddockDragActive = false;
    if (e.button === 0) this.mouseLeftDown = false;
    if (e.button === 2) this.mouseRightDown = false;
  };

  private handleResize = (): void => {
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  public dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('blur', this.handleBlur);
    const dom = this.renderer.domElement;
    dom.removeEventListener('pointerdown', this.handlePointerDown);
    dom.removeEventListener('contextmenu', this.handleContextMenu);
    window.removeEventListener('pointermove', this.handlePointerMove);
    window.removeEventListener('pointerup', this.handlePointerUp);
    this.resizeObserver.disconnect();

    this.clearRaceEntities();
    for (const rig of this.paddockRigCache.values()) {
      rig.dispose();
    }
    this.paddockRigCache.clear();
    this.rainLines.geometry.dispose();
    this.rainMat.dispose();
    this.track.dispose();
    this.textures.dispose();
    this.audio.dispose();
    this.renderer.dispose();
    if (dom.parentNode === this.container) {
      this.container.removeChild(dom);
    }
  }
}
