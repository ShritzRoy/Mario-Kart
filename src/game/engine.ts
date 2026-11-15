import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { ItemKind, NetHazard, NetKartState } from '../shared/protocol.ts';
import { ProceduralAudioEngine } from './audio.ts';
import { getMapById, type MapId } from './maps.ts';
import {
  buildBananaMesh,
  buildGreenShellMesh,
  buildKartAndDriver,
  type KartVisualRig,
} from './models.ts';
import {
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
import { getRacerById, ROSTER } from './roster.ts';
import { createProceduralTextures, type ProceduralTextureSet } from './textures.ts';
import { BARRIER_HALF_WIDTH, SAMPLE_COUNT, StadiumTrack } from './track.ts';

export type EngineMode =
  | 'title'
  | 'paddock'
  | 'countdown'
  | 'racing'
  | 'paused'
  | 'finished'
  | 'replay';

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
  gameMode: GameModeType;
  mapId: MapId;
  controlMode: ControlMode;
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
  standings: {
    id: string;
    name: string;
    characterId: string;
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
  hitPlayer: (targetId: string, attackerId: string, kind: 'shell' | 'banana' | 'star') => void;
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

const PARTICLE_POOL_SIZE = 280;
const SKID_POOL_SIZE = 200;

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
  private controlMode: ControlMode = 'keyboard';
  private countdownValue = 3;
  private countdownTimer = 0;
  private raceElapsedMs = 0;
  private jumbotronTimer = 0;
  private hudEmitTimer = 0;
  private netSendTimer = 0;

  // Boost Callout state
  private boostCalloutCounter = 0;
  private activeBoostCallout: BoostCallout | null = null;
  private boostCalloutClearAt = 0;

  // Paddock Showcase Rig Cache (zero-stutter character switching)
  private paddockRigCache = new Map<string, KartVisualRig>();
  private paddockRig: KartVisualRig | null = null;
  private paddockSelectedId = 'mario';
  private paddockSelectAnim = 0;
  private paddockOrbitYaw = 0.52;
  private paddockTargetYaw = 0.52;
  private paddockDragActive = false;
  private paddockLastX = 0;

  // Race Entities
  private karts: KartPhysicsState[] = [];
  private kartRigs = new Map<string, KartVisualRig>();
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
  private replaySavedSpecIds = new Map<string, { name: string; characterId: string }>();

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

  // Camera & Input State
  private cameraShake = 0;
  private rearViewHeld = false;
  private heldKeys = new Set<string>();
  private justPressedKeys = new Set<string>();
  private touchSteer = 0;
  private touchThrottle = false;
  private touchBrake = false;
  private touchDrift = false;
  private touchItem = false;
  private autoAccel = false;
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
    this.scene.add(this.track.group);
    this.scene.add(this.hazardGroup);
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
  }

  public setGameMode(gm: GameModeType): void {
    this.gameMode = gm;
    this.emitHudSnapshot();
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
    this.track = new StadiumTrack(this.textures, mapDef);
    this.scene.add(this.track.group);
    this.applyMapAtmosphere(mapId);
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
    this.audio.stopMusic();
    this.audio.updateEngine(0, false, false);
    this.track.paddockGroup.visible = false;
    this.track.setCountdownLights(0, true);

    // Spawn 8 lively AI karts spread around the front stretch & ramp approaches
    for (let i = 0; i < 8; i++) {
      const spec = ROSTER[i % ROSTER.length];
      const kart = createKartState(`demo_${i}`, spec.name, spec.id, i, this.track, false, false);
      const sampleIdx = (10 + i * 11) % SAMPLE_COUNT;
      const s = this.track.samples[sampleIdx];
      const lat = ((i % 2 === 0 ? -1 : 1) * (2.5 + (i % 3) * 1.8));
      kart.x = s.point.x + s.right.x * lat;
      kart.y = s.point.y;
      kart.z = s.point.z + s.right.z * lat;
      kart.heading = Math.atan2(s.tangent.x, s.tangent.z);
      kart.trackIndex = sampleIdx;
      kart.trackT = s.t;
      kart.speed = 46 + (i % 3) * 3;
      this.karts.push(kart);

      const rig = buildKartAndDriver(kart.spec, this.textures, !this.isSoftwareGl && i < 4);
      rig.root.position.set(kart.x, kart.y, kart.z);
      rig.root.rotation.y = kart.heading;
      this.scene.add(rig.root);
      this.kartRigs.set(kart.id, rig);
    }

    this.emitHudSnapshot();
  }

  public enterPaddock(): void {
    this.clearRaceEntities();
    this.mode = 'paddock';
    this.audio.stopMusic();
    this.audio.updateEngine(0, false, false);
    this.track.paddockGroup.visible = true;
    this.selectPaddockCharacter(this.paddockSelectedId, false);
    this.paddockOrbitYaw = this.paddockTargetYaw;
    this.camera.fov = 44;
    this.camera.updateProjectionMatrix();
    this.camera.position.set(2.5, 262.15, 5.45);
    this.camera.lookAt(-1.45, 261.0, 0);
    this.emitHudSnapshot();
  }

  public selectPaddockCharacter(characterId: string, withSound = true): void {
    this.paddockSelectedId = characterId;
    if (this.paddockRig) {
      this.track.paddockTurntable.remove(this.paddockRig.root);
      this.paddockRig = null;
    }

    let rig = this.paddockRigCache.get(characterId);
    if (!rig) {
      const spec = getRacerById(characterId);
      rig = buildKartAndDriver(spec, this.textures, true);
      this.paddockRigCache.set(characterId, rig);
    }

    rig.root.position.set(0, 0.36, 0);
    this.track.paddockTurntable.add(rig.root);
    this.paddockRig = rig;
    this.paddockSelectAnim = 1.0;
    this.paddockTargetYaw += 0.65;
    if (withSound) this.audio.playSelect();
  }

  public startRace(
    playerCharacterId: string,
    playerName: string,
    remotePlayers: { id: string; name: string; characterId: string; slotIndex: number }[] = [],
    skipCountdown = false,
    gameModeOverride?: GameModeType
  ): void {
    if (gameModeOverride) this.gameMode = gameModeOverride;
    this.audio.init();
    this.audio.setFinalLapTempo(false);
    this.clearRaceEntities();
    this.replay.reset();
    this.replaySavedSpecIds.clear();
    this.activeBoostCallout = null;

    const localId = this.mpBridge?.localPlayerId ?? 'player_local';
    this.replayPlayerId = localId;
    const usedChars = new Set<string>([playerCharacterId]);
    const racers: KartPhysicsState[] = [];

    const isTimeTrial = this.gameMode === 'time_trial' && remotePlayers.length === 0;
    const localSlot = isTimeTrial
      ? 0
      : remotePlayers.find((p) => p.id === localId)?.slotIndex ?? 7;

    racers.push(
      createKartState(
        localId,
        playerName || 'You',
        playerCharacterId,
        localSlot,
        this.track,
        true,
        false
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
            true
          )
        );
      }

      const aiPool = ROSTER.filter((r) => !usedChars.has(r.id));
      while (racers.length < 8) {
        const spec = aiPool[(racers.length - 1) % aiPool.length];
        racers.push(
          createKartState(
            `ai_${racers.length}`,
            spec.name,
            spec.id,
            racers.length,
            this.track,
            false,
            false
          )
        );
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
        k.isRemoteHuman
      );
      this.karts.push(recreated);
      this.replaySavedSpecIds.set(recreated.id, {
        name: recreated.name,
        characterId: recreated.spec.id,
      });
      const rig = buildKartAndDriver(
        recreated.spec,
        this.textures,
        !this.isSoftwareGl || recreated.isPlayer
      );
      rig.root.position.set(recreated.x, recreated.y, recreated.z);
      rig.root.rotation.y = recreated.heading;
      this.scene.add(rig.root);
      this.kartRigs.set(recreated.id, rig);
    });

    this.prevPlayerRank = this.karts.length;
    this.raceElapsedMs = 0;
    this.cameraShake = 0;
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
      this.camera.position.set(
        pk.x - Math.sin(pk.heading) * 9.5,
        pk.y + 4.5,
        pk.z - Math.cos(pk.heading) * 9.5
      );
      this.camera.lookAt(pk.x, pk.y + 1.4, pk.z);
    }

    this.emitHudSnapshot();
  }

  public returnToPaddock(): void {
    this.enterPaddock();
  }

  public returnToTitle(): void {
    this.startTitleCutscene();
  }

  public setPaused(paused: boolean): void {
    if (this.mode === 'racing' && paused) {
      this.mode = 'paused';
      this.audio.updateEngine(0, false, false);
      this.emitHudSnapshot();
    } else if (this.mode === 'paused' && !paused) {
      this.mode = 'racing';
      this.emitHudSnapshot();
    }
  }

  public startReplay(): void {
    if (!this.replay.hasData()) return;
    this.audio.stopMusic();
    this.audio.updateEngine(0, false, false);
    this.mode = 'replay';
    this.replayTimeMs = 0;
    this.replayPaused = false;
    this.replaySpeed = 1;
    this.replayEventBanner = null;
    this.track.paddockGroup.visible = false;

    // Ensure rigs exist for all recorded karts
    if (this.kartRigs.size === 0) {
      for (const [id, info] of this.replaySavedSpecIds.entries()) {
        const spec = getRacerById(info.characterId);
        const rig = buildKartAndDriver(spec, this.textures, !this.isSoftwareGl || id === this.replayPlayerId);
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
      if (!this.hazards.some((h) => h.id === hz.id)) {
        this.spawnHazardVisual(hz);
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

  public applyRemoteHit(targetId: string, kind: 'shell' | 'banana' | 'star'): void {
    const kart = this.karts.find((k) => k.id === targetId);
    if (kart && kart.starTimer <= 0) {
      kart.spinTimer = 1.25;
      if (kart.isPlayer) {
        this.cameraShake = 0.85;
        this.audio.playHit();
        this.replay.recordEvent(this.raceElapsedMs, 'hit', kart.id, `${kart.name} Hit!`);
      }
      void kind;
    }
  }

  private clearRaceEntities(): void {
    for (const rig of this.kartRigs.values()) {
      this.scene.remove(rig.root);
      rig.dispose();
    }
    this.kartRigs.clear();
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
    } else if (reason === 'nitro') {
      text = 'NITRO BOOST!';
      color = '#f97316';
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
    const mesh = hz.kind === 'shell' ? buildGreenShellMesh() : buildBananaMesh();
    mesh.position.set(hz.x, hz.y, hz.z);
    this.hazardGroup.add(mesh);
    this.hazards.push({
      ...hz,
      mesh,
    });
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
      if (kart.isPlayer) this.audio.playItemBox();
    },
    onItemUse: (kart, item) => {
      if (item === 'shell' || item === 'banana') {
        if (kart.isPlayer) this.audio.playShellFire();
        const isShell = item === 'shell';
        const fwdX = Math.sin(kart.heading);
        const fwdZ = Math.cos(kart.heading);
        const dist = isShell ? 2.6 : -2.5;
        const speed = isShell ? 84 : 0;
        const hz: NetHazard = {
          id: `${this.mpBridge ? 'net' : 'loc'}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          kind: item,
          ownerId: kart.id,
          x: kart.x + fwdX * dist,
          y: kart.y + 0.1,
          z: kart.z + fwdZ * dist,
          vx: fwdX * speed,
          vz: fwdZ * speed,
          bouncesLeft: isShell ? 5 : 0,
          ttl: isShell ? 9 : 22,
        };
        this.spawnHazardVisual(hz);
        if (this.mpBridge && kart.isPlayer) {
          this.mpBridge.spawnHazard(hz);
        }
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
            : `${victim.name} Hit!`;
        this.replay.recordEvent(this.raceElapsedMs, 'hit', victim.id, label);
      }
      if (this.mpBridge && victim.isRemoteHuman && (kind === 'shell' || kind === 'banana' || kind === 'star')) {
        this.mpBridge.hitPlayer(victim.id, attackerId, kind);
      }
    },
    onBump: (a, b) => {
      if (a.isPlayer || b.isPlayer) {
        this.cameraShake = Math.max(this.cameraShake, 0.28);
      }
      const mx = (a.x + b.x) * 0.5;
      const my = (a.y + b.y) * 0.5 + 0.65;
      const mz = (a.z + b.z) * 0.5;
      for (let i = 0; i < 4; i++) {
        this.spawnParticle(
          mx,
          my,
          mz,
          (Math.random() - 0.5) * 9,
          3 + Math.random() * 4,
          (Math.random() - 0.5) * 9,
          '#fde047',
          0.7,
          0.22
        );
      }
    },
    onWallScrape: (kart, side) => {
      if (kart.isPlayer) {
        this.cameraShake = Math.max(this.cameraShake, 0.14);
      }
      if (Math.random() < 0.6) {
        const sx = kart.x + Math.cos(kart.heading) * side * 0.9;
        const sz = kart.z - Math.sin(kart.heading) * side * 0.9;
        this.spawnParticle(
          sx,
          kart.y + 0.45,
          sz,
          (Math.random() - 0.5) * 6,
          2.2 + Math.random() * 2.5,
          (Math.random() - 0.5) * 6,
          '#fb923c',
          0.65,
          0.2
        );
      }
    },
    onLapComplete: (kart, newLap) => {
      if (kart.isPlayer) {
        this.audio.playLap(newLap === 3);
      }
    },
    onFinish: (kart) => {
      if (kart.isPlayer) {
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

    this.track.animate(dt, elapsed);

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
    }

    this.camera.fov = THREE.MathUtils.damp(this.camera.fov, 44, 6, dt);
    this.camera.updateProjectionMatrix();
    this._tmpV3.set(2.5, 262.15, 5.45);
    this.camera.position.lerp(this._tmpV3, 1 - Math.exp(-6 * dt));
    this.camera.lookAt(-1.45, 261.0, 0);
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
        rig.root.rotation.y = pose.heading + driftSlip + spinOffset;

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
          { isTimeTrial, totalLaps: 3 }
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

    // Dynamic Chase Camera with Speed-Based FOV Widening + Decaying Shake
    if (playerKart) {
      const speedRatio = Math.max(0, playerKart.speed) / 60;
      const targetFov =
        this.mode === 'countdown'
          ? 54
          : 58 + Math.min(speedRatio, 1.4) * 18 + (playerKart.boostTimer > 0 ? 7 : 0);
      this.camera.fov = THREE.MathUtils.damp(this.camera.fov, targetFov, 7.5, dt);
      this.camera.updateProjectionMatrix();

      const camDist = this.rearViewHeld ? -8.5 : 8.8;
      const camHeight = this.mode === 'countdown' ? 4.2 : 4.35;
      const desiredX = playerKart.x - Math.sin(playerKart.heading) * camDist;
      const desiredY = playerKart.y + camHeight;
      const desiredZ = playerKart.z - Math.cos(playerKart.heading) * camDist;

      this.camera.position.x = THREE.MathUtils.damp(this.camera.position.x, desiredX, 11, dt);
      this.camera.position.y = THREE.MathUtils.damp(this.camera.position.y, desiredY, 10, dt);
      this.camera.position.z = THREE.MathUtils.damp(this.camera.position.z, desiredZ, 11, dt);

      if (this.cameraShake > 0.001) {
        this.camera.position.x += (Math.random() - 0.5) * this.cameraShake;
        this.camera.position.y += (Math.random() - 0.5) * this.cameraShake * 0.7;
        this.cameraShake *= Math.exp(-8 * dt);
      }

      const lookAhead = this.rearViewHeld ? -5 : 7;
      this.camera.lookAt(
        playerKart.x + Math.sin(playerKart.heading) * lookAhead,
        playerKart.y + 1.55,
        playerKart.z + Math.cos(playerKart.heading) * lookAhead
      );

      this.audio.updateEngine(speedRatio, playerKart.boostTimer > 0, this.mode === 'racing');
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
      rig.root.position.set(kart.x, kart.y + kart.hopY, kart.z);
      rig.root.rotation.y = kart.heading + driftSlip + spinOffset;

      // Enhanced drift roll & body pitch during acceleration/air
      const targetRoll = -kart.steerVisual * 0.16 - kart.driftDir * 0.08;
      rig.kartBodyGroup.rotation.z = THREE.MathUtils.damp(
        rig.kartBodyGroup.rotation.z,
        targetRoll,
        10,
        dt
      );
      const targetPitch = !kart.grounded ? -0.14 : kart.boostTimer > 0 ? -0.05 : 0;
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
      rig.driverGroup.rotation.z = THREE.MathUtils.damp(
        rig.driverGroup.rotation.z,
        kart.steerVisual * 0.28 + kart.driftDir * 0.12,
        10,
        dt
      );
      rig.headGroup.rotation.y = kart.steerVisual * 0.42;

      if (kart.starTimer > 0) {
        this._tmpColor.setHSL((elapsed * 2.5) % 1, 0.95, 0.55);
        rig.paintMat.color.copy(this._tmpColor);
        rig.underglowMat.color.copy(this._tmpColor);
      } else {
        rig.paintMat.color.set(kart.spec.primaryColor);
        rig.underglowMat.color.set(kart.spec.neonColor);
      }

      // Dynamic 3D Exhaust Flame Cones + Level-based Nitro Exhaust Jets
      const boosting = kart.boostTimer > 0 || kart.starTimer > 0;
      const isLv3 = kart.boostStrength >= 1.46;
      const isLv2 = kart.boostStrength >= 1.35;
      const flameCol =
        kart.starTimer > 0
          ? '#fde047'
          : isLv3
          ? '#c084fc'
          : isLv2
          ? '#fb923c'
          : '#38bdf8';

      rig.exhaustFlames.forEach((cone, idx) => {
        cone.visible = boosting;
        if (boosting) {
          const pulse = 0.85 + Math.sin(elapsed * 32 + idx * 1.5) * 0.28;
          const lengthScale = (isLv3 ? 1.75 : isLv2 ? 1.45 : 1.15) * pulse;
          cone.scale.set(pulse, pulse, lengthScale);
          (cone.material as THREE.MeshBasicMaterial).color.set(flameCol);
        }
      });

      if (emitEffects && boosting) {
        const burstCount = isLv3 ? 2 : 1;
        const flameScale = isLv3 ? 1.55 : isLv2 ? 1.3 : 1.05;

        for (let b = 0; b < burstCount; b++) {
          for (const tip of rig.exhaustTips) {
            this._tmpV3.copy(tip).applyAxisAngle(this._tmpV3B.set(0, 1, 0), rig.root.rotation.y);
            this.spawnParticle(
              kart.x + this._tmpV3.x,
              kart.y + kart.hopY + this._tmpV3.y,
              kart.z + this._tmpV3.z,
              -Math.sin(kart.heading) * (6 + b * 2) + (Math.random() - 0.5) * 2.4,
              1.1 + Math.random() * 1.6,
              -Math.cos(kart.heading) * (6 + b * 2) + (Math.random() - 0.5) * 2.4,
              flameCol,
              flameScale,
              0.24
            );
          }
        }
      }

      // Drift Sparks & Twin Rear Skid Marks
      if (emitEffects && kart.driftDir !== 0 && kart.grounded) {
        if (Math.random() < 0.65) {
          this.spawnSkidMark(kart.x, kart.y, kart.z, rig.root.rotation.y);
        }
        const sparkCol =
          kart.driftLevel === 3
            ? '#c084fc'
            : kart.driftLevel === 2
            ? '#fb923c'
            : kart.driftLevel === 1
            ? '#38bdf8'
            : '#f8fafc';
        const sparkCount = kart.driftLevel >= 2 ? 2 : 1;
        for (let s = 0; s < sparkCount; s++) {
          this.spawnParticle(
            kart.x - Math.sin(kart.heading) * 1.0 + (Math.random() - 0.5) * 0.8,
            kart.y + 0.24,
            kart.z - Math.cos(kart.heading) * 1.0 + (Math.random() - 0.5) * 0.8,
            (Math.random() - 0.5) * 7,
            2.4 + Math.random() * 2.8,
            (Math.random() - 0.5) * 7,
            sparkCol,
            0.65 + kart.driftLevel * 0.28,
            0.27
          );
        }
      }
    }
  }

  private updateHazards(dt: number): void {
    for (let i = this.hazards.length - 1; i >= 0; i--) {
      const hz = this.hazards[i];
      hz.ttl -= dt;
      if (hz.kind === 'shell') {
        hz.x += hz.vx * dt;
        hz.z += hz.vz * dt;
        hz.mesh.rotation.y += dt * 16;
        const proj = this.track.projectOnTrack(hz.x, hz.z);
        hz.y = proj.point.y + 0.1;
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

      let consumed = hz.ttl <= 0 || hz.bouncesLeft < 0;
      if (!consumed) {
        for (const kart of this.karts) {
          if (kart.id === hz.ownerId && hz.ttl > (hz.kind === 'shell' ? 8.5 : 21.3)) continue;
          if (kart.spinTimer > 0) continue;
          const dx = kart.x - hz.x;
          const dz = kart.z - hz.z;
          if (dx * dx + dz * dz < 3.1) {
            if (kart.starTimer <= 0) {
              kart.spinTimer = 1.25;
              this.physicsCallbacks.onHit(kart, hz.ownerId, hz.kind);
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
          this.mouseItemJustPressed || this.justPressedKeys.has('KeyE') || this.justPressedKeys.has('Space');
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
          useItemJustPressed: pad.useItemJustPressed,
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
          useItemJustPressed: this.justPressedKeys.has('TouchItem'),
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
        rank: k.rank,
        lap: Math.min(k.lap, 3),
        finished: k.finished,
        finishTimeMs: k.finishTimeMs,
        color: k.spec.primaryColor,
        isPlayer: k.isPlayer,
      }));

    this.onHudUpdate({
      mode: this.mode,
      gameMode: this.gameMode,
      mapId: this.currentMapId,
      controlMode: this.controlMode,
      rank: pk?.rank ?? 1,
      totalRacers: Math.max(1, this.karts.length),
      lap: Math.min(pk?.lap ?? 1, 3),
      speedKmh: Math.round(Math.abs(pk?.speed ?? 0) * 2.85),
      heldItem: pk?.heldItem ?? 'none',
      rouletteActive: (pk?.rouletteTimer ?? 0) > 0,
      driftLevel: pk?.driftLevel ?? 0,
      boostActive: (pk?.boostTimer ?? 0) > 0,
      starActive: (pk?.starTimer ?? 0) > 0,
      boostCallout: this.activeBoostCallout,
      countdownValue: this.countdownValue,
      raceTimeMs: this.raceElapsedMs,
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
    this.track.dispose();
    this.textures.dispose();
    this.audio.dispose();
    this.renderer.dispose();
    if (dom.parentNode === this.container) {
      this.container.removeChild(dom);
    }
  }
}
