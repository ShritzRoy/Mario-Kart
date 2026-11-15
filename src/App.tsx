import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Car,
  Check,
  ChevronLeft,
  ChevronRight,
  CloudRain,
  Copy,
  Eye,
  EyeOff,
  Film,
  Flag,
  Gamepad2,
  Keyboard,
  Map as MapIcon,
  Maximize2,
  Minimize2,
  Moon,
  Mouse,
  Pause,
  Play,
  RotateCcw,
  Smartphone,
  Sparkles,
  Sun,
  Sunset,
  Timer,
  Trophy,
  Users,
  Volume2,
  VolumeX,
  Wifi,
  X,
} from 'lucide-react';
import { CharacterPortrait } from './components/CharacterPortrait.tsx';
import { CircularAbilityWheel, type DeviceTier } from './components/CircularAbilityWheel.tsx';
import { MiniMap } from './components/MiniMap.tsx';
import { MobileControls } from './components/MobileControls.tsx';
import { PixelFlagTransition } from './components/PixelFlagTransition.tsx';
import { SpeedometerGauge } from './components/SpeedometerGauge.tsx';
import { VehicleCardIcon } from './components/VehicleCardIcon.tsx';
import { WhiteFlagButtonWave } from './components/WhiteFlagButtonWave.tsx';
import {
  KartGameEngine,
  type ControlMode,
  type GameModeType,
  type HudSnapshot,
} from './game/engine.ts';
import { MAPS, WEATHER_OPTIONS, type MapId, type WeatherChoice } from './game/maps.ts';
import { getRacerById, ROSTER, type WeightClass } from './game/roster.ts';
import { getVehicleById, VEHICLES, type VehicleId } from './game/vehicles.ts';
import { useMultiplayerRoom } from './hooks/useMultiplayerRoom.ts';
import type { NetRoomSnapshot } from './shared/protocol.ts';

type FilterTab = 'All' | WeightClass;

const INITIAL_HUD: HudSnapshot = {
  mode: 'title',
  paddockStage: 'character',
  selectedVehicleId: 'standard_kart',
  gameMode: 'grand_prix',
  mapId: 'plaza',
  weatherChoice: 'sunny',
  activeWeather: 'sunny',
  controlMode: 'keyboard',
  rank: 1,
  totalRacers: 8,
  lap: 1,
  totalLaps: 3,
  speedKmh: 0,
  heldItem: 'none',
  rouletteActive: false,
  driftLevel: 0,
  boostActive: false,
  starActive: false,
  boostCallout: null,
  countdownValue: 3,
  raceTimeMs: 0,
  timeLimitMs: 120000,
  timeRemainingMs: 120000,
  timeTrialResult: null,
  standings: [],
  minimapPoints: [],
  minimapRacers: [],
  gamepadConnected: false,
  gamepadName: '',
  hasReplay: false,
  replayDurationMs: 0,
  replayTimeMs: 0,
  replayPaused: false,
  replaySpeed: 1,
  replayEvents: [],
  replayEventBanner: null,
};

function formatTime(ms: number): string {
  const totalSec = Math.max(0, ms / 1000);
  const mins = Math.floor(totalSec / 60);
  const secs = Math.floor(totalSec % 60);
  const hundredths = Math.floor((ms % 1000) / 10);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(hundredths).padStart(2, '0')}`;
}

function formatOrdinal(n: number): { num: string; suffix: string } {
  if (n === 1) return { num: '1', suffix: 'ST' };
  if (n === 2) return { num: '2', suffix: 'ND' };
  if (n === 3) return { num: '3', suffix: 'RD' };
  return { num: String(n), suffix: 'TH' };
}

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = 'MK';
  for (let i = 0; i < 2; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

const TITLE_MODES: {
  id: GameModeType;
  label: string;
  desc: string;
  accent: string;
  diamondBg: string;
}[] = [
  {
    id: 'grand_prix',
    label: 'Grand Prix',
    desc: 'Race 7 fierce AI rivals across a 3-lap championship!',
    accent: '#facc15',
    diamondBg: 'linear-gradient(135deg, #facc15, #f97316)',
  },
  {
    id: 'vs_race',
    label: 'VS Race',
    desc: 'Singleplayer head-to-head race on any track.',
    accent: '#38bdf8',
    diamondBg: 'linear-gradient(135deg, #38bdf8, #2563eb)',
  },
  {
    id: 'time_trial',
    label: 'Time Trials',
    desc: 'Beat the countdown clock across 3 laps with Turbo Mushrooms!',
    accent: '#4ade80',
    diamondBg: 'linear-gradient(135deg, #4ade80, #16a34a)',
  },
  {
    id: 'online_room',
    label: 'Online Room',
    desc: 'Cross-device multiplayer with a 4-letter room code.',
    accent: '#f472b6',
    diamondBg: 'linear-gradient(135deg, #f472b6, #9333ea)',
  },
];

export default function App() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<KartGameEngine | null>(null);

  const [hud, setHud] = useState<HudSnapshot>(INITIAL_HUD);
  const [selectedId, setSelectedId] = useState<string>('mario');
  const [selectedVehicleId, setSelectedVehicleId] = useState<VehicleId>('standard_kart');
  const [vehiclePage, setVehiclePage] = useState<0 | 1>(0);
  const [selectedMap, setSelectedMap] = useState<MapId>('plaza');
  const [selectedWeather, setSelectedWeather] = useState<WeatherChoice>('sunny');
  const [weightFilter, setWeightFilter] = useState<FilterTab>('All');
  const [paddockUiVisible, setPaddockUiVisible] = useState<boolean>(true);
  const [muted, setMuted] = useState<boolean>(false);
  const [flagActive, setFlagActive] = useState<boolean>(false);
  const [hoveredTitleMode, setHoveredTitleMode] = useState<GameModeType>('grand_prix');
  const [onlineModalOpen, setOnlineModalOpen] = useState<boolean>(false);
  const [screenFading, setScreenFading] = useState<boolean>(false);

  // Exclusive Cross-Device Controls & Fullscreen / Landscape State
  const [controlMode, setControlMode] = useState<ControlMode>(() => {
    if (typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0)) {
      return 'mobile_buttons';
    }
    return 'keyboard';
  });
  const [autoAccel, setAutoAccel] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isPortraitMobile, setIsPortraitMobile] = useState<boolean>(false);
  const [isCompactViewport, setIsCompactViewport] = useState<boolean>(false);
  const [deviceTier, setDeviceTier] = useState<DeviceTier>('desktop');

  // Online Room Multiplayer State
  const [playerName, setPlayerName] = useState<string>('Racer');
  const [roomCodeInput, setRoomCodeInput] = useState<string>('');
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const mpStartTriggeredRef = useRef<boolean>(false);
  const pendingFlagActionRef = useRef<
    | {
        type: 'race';
        remotePlayers: { id: string; name: string; characterId: string; vehicleId?: string; slotIndex: number }[];
        gameMode: GameModeType;
      }
    | { type: 'paddock' }
    | { type: 'title' }
    | null
  >(null);

  const selectedSpec = useMemo(() => getRacerById(selectedId), [selectedId]);
  const selectedVehicle = useMemo(() => getVehicleById(selectedVehicleId), [selectedVehicleId]);
  const combinedBars = useMemo(() => {
    const clampBar = (base100: number, delta: number) =>
      Math.max(1, Math.min(10, Math.round((base100 + delta) / 10)));
    return {
      speed: Math.round((clampBar(selectedSpec.stats.topSpeed, selectedVehicle.deltas.topSpeed) + selectedVehicle.statBars.speed) / 2),
      acceleration: Math.round((clampBar(selectedSpec.stats.acceleration, selectedVehicle.deltas.acceleration) + selectedVehicle.statBars.acceleration) / 2),
      weight: Math.round((clampBar(selectedSpec.stats.weight, selectedVehicle.deltas.weight) + selectedVehicle.statBars.weight) / 2),
      handling: Math.round((clampBar(selectedSpec.stats.handling, selectedVehicle.deltas.handling) + selectedVehicle.statBars.handling) / 2),
    };
  }, [selectedSpec, selectedVehicle]);
  const pagedVehicles = useMemo(
    () => VEHICLES.filter((v) => v.page === vehiclePage),
    [vehiclePage]
  );
  const filteredRoster = useMemo(
    () => (weightFilter === 'All' ? ROSTER : ROSTER.filter((r) => r.weightClass === weightFilter)),
    [weightFilter]
  );

  const handleRoomSnapshot = useCallback((room: NetRoomSnapshot) => {
    const engine = engineRef.current;
    if (!engine) return;

    if (room.phase === 'countdown' && !mpStartTriggeredRef.current) {
      mpStartTriggeredRef.current = true;
      setOnlineModalOpen(false);
      pendingFlagActionRef.current = {
        type: 'race',
        remotePlayers: room.players.map((p) => ({
          id: p.id,
          name: p.name,
          characterId: p.characterId,
          vehicleId: p.vehicleId,
          slotIndex: p.slotIndex,
        })),
        gameMode: 'online_room',
      };
      setFlagActive(true);
    } else if (room.phase === 'lobby') {
      mpStartTriggeredRef.current = false;
    }

    if (room.phase === 'racing' || room.phase === 'countdown') {
      engine.applyRemoteSnapshots(room.karts, room.hazards, room.phase, room.countdownValue);
    }
  }, []);

  const handleHitNotice = useCallback(
    (targetId: string, _attackerId: string, kind: 'shell' | 'banana' | 'star') => {
      engineRef.current?.applyRemoteHit(targetId, kind);
    },
    []
  );

  const mp = useMultiplayerRoom({
    onSnapshot: handleRoomSnapshot,
    onHitNotice: handleHitNotice,
  });

  // Mount Three.js Engine once
  useEffect(() => {
    if (!mountRef.current) return;
    const engine = new KartGameEngine(mountRef.current, (snap) => {
      setHud(snap);
    });
    engine.setControlMode(controlMode);
    engineRef.current = engine;

    const params = new URLSearchParams(window.location.search);
    const urlRoom = params.get('room');
    if (urlRoom) {
      const clean = urlRoom.toUpperCase().slice(0, 6);
      setRoomCodeInput(clean);
      engine.setGameMode('online_room');
      engine.enterPaddock('character');
      setOnlineModalOpen(true);
      mp.joinRoom(clean, 'MobileRacer', 'mario', 'standard_kart');
    }

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Wire Multiplayer Bridge
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    if (mp.connected && mp.playerId) {
      engine.setMultiplayerBridge({
        localPlayerId: mp.playerId,
        sendState: mp.sendKartState,
        spawnHazard: mp.spawnHazard,
        removeHazard: mp.removeHazard,
        hitPlayer: mp.hitPlayer,
      });
    } else {
      engine.setMultiplayerBridge(null);
    }
  }, [mp.connected, mp.playerId, mp.sendKartState, mp.spawnHazard, mp.removeHazard, mp.hitPlayer]);

  // Sync exclusive ControlMode & Auto-Accel
  useEffect(() => {
    engineRef.current?.setControlMode(controlMode);
  }, [controlMode]);

  useEffect(() => {
    engineRef.current?.setAutoAccel(autoAccel);
  }, [autoAccel]);

  // Track Portrait vs Landscape + Device Tier + Fullscreen State
  useEffect(() => {
    const checkLayout = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const touch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      setIsPortraitMobile(touch && h > w);
      setIsCompactViewport(h <= 540 || w < 768);
      setDeviceTier(w < 640 || h < 480 ? 'mobile' : w < 1080 ? 'tablet' : 'desktop');
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    checkLayout();
    window.addEventListener('resize', checkLayout);
    document.addEventListener('fullscreenchange', checkLayout);
    return () => {
      window.removeEventListener('resize', checkLayout);
      document.removeEventListener('fullscreenchange', checkLayout);
    };
  }, []);

  const enterLandscapeFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
        return;
      }
      const orient = screen.orientation as unknown as { lock?: (mode: string) => Promise<void> };
      if (orient?.lock) {
        await orient.lock('landscape').catch(() => undefined);
      }
    } catch {
      // ignore if browser blocks fullscreen/orientation lock
    }
  };

  const transitionToScreen = (fn: () => void) => {
    setScreenFading(true);
    window.setTimeout(() => {
      fn();
      window.setTimeout(() => setScreenFading(false), 160);
    }, 180);
  };

  // Global keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      if (e.code === 'Escape') {
        if (hud.mode === 'racing') engineRef.current?.setPaused(true);
        else if (hud.mode === 'paused') engineRef.current?.setPaused(false);
        else if (onlineModalOpen) setOnlineModalOpen(false);
      } else if (e.code === 'KeyH' && hud.mode === 'paddock') {
        setPaddockUiVisible((v) => !v);
      } else if (
        e.code === 'Enter' &&
        hud.mode === 'paddock' &&
        !flagActive &&
        !mp.room &&
        !onlineModalOpen
      ) {
        if (hud.paddockStage === 'character') {
          engineRef.current?.audio.playSelect();
          engineRef.current?.setPaddockStage('vehicle');
        } else {
          triggerSoloRace();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // Gamepad Paddock Grid Navigation
  const padNavCooldownRef = useRef(0);
  useEffect(() => {
    if (hud.mode !== 'paddock' || flagActive || onlineModalOpen) return;
    let rafId = 0;
    const pollMenuPad = (now: number) => {
      const pads = navigator.getGamepads ? navigator.getGamepads() : [];
      const pad = Array.from(pads).find((p) => p && p.connected);
      if (pad && now - padNavCooldownRef.current > 210) {
        const ax = pad.axes[0] ?? 0;
        const ay = pad.axes[1] ?? 0;
        const left = ax < -0.5 || pad.buttons[14]?.pressed;
        const right = ax > 0.5 || pad.buttons[15]?.pressed;
        const up = ay < -0.5 || pad.buttons[12]?.pressed;
        const down = ay > 0.5 || pad.buttons[13]?.pressed;

        if (left || right || up || down) {
          padNavCooldownRef.current = now;
          if (hud.paddockStage === 'character') {
            const idx = filteredRoster.findIndex((r) => r.id === selectedId);
            if (idx >= 0) {
              let next = idx;
              if (left) next = (idx - 1 + filteredRoster.length) % filteredRoster.length;
              if (right) next = (idx + 1) % filteredRoster.length;
              if (up) next = (idx - 6 + filteredRoster.length) % filteredRoster.length;
              if (down) next = (idx + 6) % filteredRoster.length;
              handleSelectCharacter(filteredRoster[next].id);
            }
          } else {
            const idx = pagedVehicles.findIndex((v) => v.id === selectedVehicleId);
            const cur = idx >= 0 ? idx : 0;
            let next = cur;
            if (left) next = (cur - 1 + pagedVehicles.length) % pagedVehicles.length;
            if (right) next = (cur + 1) % pagedVehicles.length;
            if (up) next = (cur - 4 + pagedVehicles.length) % pagedVehicles.length;
            if (down) next = (cur + 4) % pagedVehicles.length;
            if (pagedVehicles[next]) handleSelectVehicle(pagedVehicles[next].id);
          }
        } else if (pad.buttons[0]?.pressed) {
          padNavCooldownRef.current = now + 380;
          if (hud.paddockStage === 'character') {
            engineRef.current?.audio.playSelect();
            engineRef.current?.setPaddockStage('vehicle');
          } else if (mp.connected && localRoomPlayer?.isHost) {
            mp.startRace();
          } else if (!mp.connected) {
            triggerSoloRace();
          }
        } else if (pad.buttons[1]?.pressed && hud.paddockStage === 'vehicle') {
          padNavCooldownRef.current = now + 350;
          engineRef.current?.audio.playSelect();
          engineRef.current?.setPaddockStage('character');
        }
      }
      rafId = requestAnimationFrame(pollMenuPad);
    };
    rafId = requestAnimationFrame(pollMenuPad);
    return () => cancelAnimationFrame(rafId);
  });

  const handleSelectCharacter = (id: string) => {
    setSelectedId(id);
    engineRef.current?.selectPaddockCharacter(id, true);
    if (mp.connected) {
      mp.selectCharacter(id);
    }
  };

  const handleSelectVehicle = (vehicleId: VehicleId) => {
    setSelectedVehicleId(vehicleId);
    engineRef.current?.selectPaddockVehicle(vehicleId, true);
    if (mp.connected) {
      mp.selectVehicle(vehicleId);
    }
  };

  const handleSelectMap = (mapId: MapId) => {
    setSelectedMap(mapId);
    engineRef.current?.loadMap(mapId);
    engineRef.current?.audio.playSelect();
  };

  const handleSelectWeather = (w: WeatherChoice) => {
    setSelectedWeather(w);
    engineRef.current?.setWeather(w);
    engineRef.current?.audio.playSelect();
  };

  const handleSelectTitleMode = (gm: GameModeType) => {
    engineRef.current?.audio.init();
    engineRef.current?.audio.playSelect();
    engineRef.current?.setGameMode(gm);
    if (gm === 'online_room') {
      transitionToScreen(() => {
        engineRef.current?.enterPaddock('character');
        setOnlineModalOpen(true);
      });
    } else {
      transitionToScreen(() => {
        engineRef.current?.enterPaddock('character');
      });
    }
  };

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    engineRef.current?.audio.init();
    engineRef.current?.audio.setMuted(next);
  };

  const triggerSoloRace = () => {
    engineRef.current?.audio.init();
    pendingFlagActionRef.current = {
      type: 'race',
      remotePlayers: [],
      gameMode: hud.gameMode === 'online_room' ? 'vs_race' : hud.gameMode,
    };
    setFlagActive(true);
  };

  const handleCreateRoom = () => {
    const code = generateRoomCode();
    setRoomCodeInput(code);
    mp.joinRoom(code, playerName || 'Host', selectedId, selectedVehicleId);
  };

  const handleJoinCode = () => {
    const code = (roomCodeInput || 'MK88').toUpperCase().trim();
    if (!code) return;
    setRoomCodeInput(code);
    mp.joinRoom(code, playerName || 'Driver', selectedId, selectedVehicleId);
  };

  const copyRoomInvite = () => {
    if (!mp.room) return;
    const shareUrl = `${window.location.origin}/?room=${mp.room.roomCode}`;
    void navigator.clipboard?.writeText(shareUrl);
    setCopiedCode(true);
    window.setTimeout(() => setCopiedCode(false), 1800);
  };

  const handleFlagMidpoint = useCallback(() => {
    const action = pendingFlagActionRef.current;
    if (!action || !engineRef.current) return;
    if (action.type === 'race') {
      engineRef.current.startRace(
        selectedId,
        playerName || 'Driver',
        action.remotePlayers,
        false,
        action.gameMode,
        selectedVehicleId
      );
    } else if (action.type === 'paddock') {
      engineRef.current.returnToPaddock();
    } else if (action.type === 'title') {
      engineRef.current.returnToTitle();
    }
    pendingFlagActionRef.current = null;
  }, [selectedId, selectedVehicleId, playerName]);

  const handleFlagComplete = useCallback(() => {
    setFlagActive(false);
  }, []);

  const handleReturnToPaddock = () => {
    mpStartTriggeredRef.current = false;
    pendingFlagActionRef.current = { type: 'paddock' };
    setFlagActive(true);
  };

  const handleReturnToTitle = () => {
    mpStartTriggeredRef.current = false;
    setOnlineModalOpen(false);
    pendingFlagActionRef.current = { type: 'title' };
    setFlagActive(true);
  };

  const ord = formatOrdinal(hud.rank);
  const localRoomPlayer = mp.room?.players.find((p) => p.id === mp.playerId);
  const activeTitleMeta = TITLE_MODES.find((m) => m.id === hoveredTitleMode) ?? TITLE_MODES[0];
  const speedoSize = deviceTier === 'mobile' ? 90 : deviceTier === 'tablet' ? 118 : 146;
  const minimapSize = deviceTier === 'mobile' ? 82 : deviceTier === 'tablet' ? 112 : 140;

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#0284c7] text-white select-none font-sans">
      {/* Dedicated Isolated WebGL Canvas Mount */}
      <div ref={mountRef} className="absolute inset-0 w-full h-full" />

      {/* Smooth Screen Transition Crossfade */}
      <div
        className={`pointer-events-none fixed inset-0 z-40 bg-slate-950 transition-opacity duration-200 ${
          screenFading ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Pixel Checkered Race Flag Wipe & Fadeout Transition */}
      <PixelFlagTransition
        active={flagActive}
        onMidpoint={handleFlagMidpoint}
        onComplete={handleFlagComplete}
      />

      {/* Mobile Portrait Landscape Suggestion Banner */}
      {isPortraitMobile && (
        <div
          className="fixed top-2 left-1/2 -translate-x-1/2 z-50 px-3 py-1.5 rounded-full border border-amber-300/60 flex items-center gap-2 text-xs font-bold shadow-xl"
          style={{ backgroundColor: 'rgba(10, 15, 28, 0.94)' }}
        >
          <Smartphone className="w-3.5 h-3.5 text-amber-300" />
          <span>Rotate or tap for Landscape</span>
          <button
            onClick={enterLandscapeFullscreen}
            className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black text-[10px] uppercase cursor-pointer"
          >
            Fullscreen
          </button>
        </div>
      )}

      {/* ==================== 1. SEPARATE TITLE SCREEN + LIVE 3D CUTSCENE ==================== */}
      {hud.mode === 'title' && (
        <div className="absolute inset-0 z-20 pointer-events-none flex flex-col justify-between p-3 sm:p-5 md:p-7 bg-gradient-to-r from-slate-950/60 via-slate-950/15 to-transparent">
          {/* Top Title Bar: Stylized Arcade Emblem Logo & Utility Controls */}
          <div className="flex items-start justify-between gap-2">
            <div className="pointer-events-auto animate-logo-float flex items-center gap-2.5 sm:gap-4">
              {/* Custom Arcade Crest Badge */}
              <svg
                width={deviceTier === 'mobile' ? 42 : deviceTier === 'tablet' ? 54 : 66}
                height={deviceTier === 'mobile' ? 42 : deviceTier === 'tablet' ? 54 : 66}
                viewBox="0 0 80 80"
                className="shrink-0 drop-shadow-[0_6px_16px_rgba(0,0,0,0.75)]"
              >
                <defs>
                  <linearGradient id="crestGold" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#fef08a" />
                    <stop offset="50%" stopColor="#facc15" />
                    <stop offset="100%" stopColor="#ea580c" />
                  </linearGradient>
                  <linearGradient id="crestBlue" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#0ea5e9" />
                    <stop offset="100%" stopColor="#1e3a8a" />
                  </linearGradient>
                </defs>
                <polygon
                  points="40,4 72,20 66,58 40,76 14,58 8,20"
                  fill="url(#crestBlue)"
                  stroke="url(#crestGold)"
                  strokeWidth="4.5"
                />
                <path d="M18 32 L30 24 L30 50 L18 44 Z" fill="#ffffff" opacity="0.92" />
                <path d="M62 32 L50 24 L50 50 L62 44 Z" fill="#ef4444" opacity="0.95" />
                <circle cx="40" cy="39" r="14" fill="#0f172a" stroke="#facc15" strokeWidth="3" />
                <text
                  x="40"
                  y="44"
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize="16"
                  fontWeight="900"
                  fontFamily="'Russo One', sans-serif"
                >
                  GP
                </text>
              </svg>

              {/* Multi-Layered Mario Kart Font-Pack Typography Logo (Image 3 style with vibrant multi-color outlines) */}
              <div className="flex flex-col leading-none">
                <div className="flex items-center gap-2 mb-0.5 sm:mb-1">
                  <span className="font-mk text-[10px] sm:text-xs uppercase tracking-[0.22em] text-cyan-300 mk-stroke-sm">
                    ARCADE CHAMPIONSHIP
                  </span>
                </div>
                <div className="relative flex flex-col">
                  <h1
                    className={`font-mk uppercase tracking-tight leading-[0.95] flex items-baseline gap-2 mk-stroke ${
                      deviceTier === 'mobile'
                        ? 'text-2xl'
                        : deviceTier === 'tablet'
                        ? 'text-4xl'
                        : 'text-5xl lg:text-6xl'
                    }`}
                  >
                    <span className="text-rose-500">MARIO</span>
                    <span className="text-sky-300">KART</span>
                  </h1>
                  <div className="flex items-center gap-1.5 mt-0.5 sm:mt-1">
                    <span
                      className={`font-mk italic uppercase tracking-[0.14em] px-2.5 sm:px-3.5 py-0.5 rounded-md border-2 border-white shadow-lg mk-stroke-sm ${
                        deviceTier === 'mobile'
                          ? 'text-xs'
                          : deviceTier === 'tablet'
                          ? 'text-base'
                          : 'text-xl'
                      }`}
                      style={{
                        background: 'linear-gradient(90deg, #facc15 0%, #f97316 55%, #ef4444 100%)',
                        color: '#fef08a',
                        transform: 'skewX(-12deg)',
                      }}
                    >
                      GRAND PRIX
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="pointer-events-auto flex items-center gap-2 shrink-0">
              <button
                onClick={enterLandscapeFullscreen}
                title="Landscape Fullscreen"
                className="p-2 sm:p-2.5 rounded-xl border border-white/25 hover:border-white/60 transition cursor-pointer"
                style={{ backgroundColor: 'rgba(10, 15, 28, 0.85)' }}
              >
                {isFullscreen ? (
                  <Minimize2 className="w-4 h-4 text-sky-300" />
                ) : (
                  <Maximize2 className="w-4 h-4 text-sky-300" />
                )}
              </button>
              <button
                onClick={toggleMute}
                title={muted ? 'Unmute Audio' : 'Mute Audio'}
                className="p-2 sm:p-2.5 rounded-xl border border-white/25 hover:border-white/60 transition cursor-pointer"
                style={{ backgroundColor: 'rgba(10, 15, 28, 0.85)' }}
              >
                {muted ? (
                  <VolumeX className="w-4 h-4 text-rose-400" />
                ) : (
                  <Volume2 className="w-4 h-4 text-emerald-400" />
                )}
              </button>
            </div>
          </div>

          {/* Left-Aligned Skewed Mode Stack with Diamond Emblems & Animated White Flag */}
          <div
            className={`my-auto flex flex-col max-w-xs sm:max-w-sm md:max-w-md pl-1 sm:pl-2 ${
              deviceTier === 'mobile' ? 'gap-1.5' : 'gap-2.5 sm:gap-3'
            }`}
          >
            {TITLE_MODES.map((m) => {
              const isActive = hoveredTitleMode === m.id;
              return (
                <button
                  key={m.id}
                  onMouseEnter={() => setHoveredTitleMode(m.id)}
                  onFocus={() => setHoveredTitleMode(m.id)}
                  onClick={() => handleSelectTitleMode(m.id)}
                  className={`pointer-events-auto group relative flex items-center gap-3 sm:gap-4 rounded-xl border-2 transition-all duration-200 cursor-pointer text-left ${
                    deviceTier === 'mobile' ? 'px-3 py-1.5' : 'px-4 sm:px-5 py-2.5 sm:py-3'
                  } ${
                    isActive
                      ? 'translate-x-2 sm:translate-x-3 scale-[1.03] border-white shadow-[0_12px_30px_rgba(0,0,0,0.65)]'
                      : 'border-white/25 hover:border-white/60'
                  }`}
                  style={{
                    transform: isActive ? 'skewX(-10deg) translateX(10px)' : 'skewX(-10deg)',
                    backgroundColor: isActive ? 'rgba(15, 23, 42, 0.92)' : 'rgba(15, 23, 42, 0.72)',
                  }}
                >
                  {/* Animated White Flag Sweep behind active button */}
                  <WhiteFlagButtonWave active={isActive} />

                  {/* Diamond Emblem on Left */}
                  <div
                    className={`relative z-10 shrink-0 rounded-lg border-2 border-white flex items-center justify-center shadow-lg ${
                      deviceTier === 'mobile' ? 'w-7 h-7' : 'w-9 h-9 sm:w-11 sm:h-11'
                    }`}
                    style={{
                      background: m.diamondBg,
                      transform: 'rotate(45deg) skewX(6deg)',
                    }}
                  >
                    <div style={{ transform: 'rotate(-45deg)' }} className="text-slate-950">
                      {m.id === 'grand_prix' && <Trophy className="w-4 h-4 sm:w-5 sm:h-5" />}
                      {m.id === 'vs_race' && <Flag className="w-4 h-4 sm:w-5 sm:h-5" />}
                      {m.id === 'time_trial' && <Timer className="w-4 h-4 sm:w-5 sm:h-5" />}
                      {m.id === 'online_room' && <Wifi className="w-4 h-4 sm:w-5 sm:h-5" />}
                    </div>
                  </div>

                  {/* Label in Mario Kart Outlined Font Pack */}
                  <div className="relative z-10 flex-1" style={{ transform: 'skewX(10deg)' }}>
                    <div
                      className={`font-mk uppercase tracking-wide transition-colors ${
                        deviceTier === 'mobile'
                          ? 'text-base'
                          : 'text-lg sm:text-xl md:text-2xl'
                      } ${isActive ? 'text-slate-950' : 'mk-stroke-sm'}`}
                      style={{ color: isActive ? '#090d16' : m.accent }}
                    >
                      {m.label}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Bottom Bar: MADE BY SHRITIZ Credit + Mode Description */}
          <div className="flex flex-wrap items-end justify-between gap-2 sm:gap-4">
            <div className="font-mk uppercase tracking-[0.2em] text-xs sm:text-sm md:text-base text-amber-300 mk-stroke-sm">
              MADE BY <span className="text-cyan-300">SHRITIZ</span>
            </div>
            <div
              className="hidden sm:block rounded-xl border border-white/25 px-3.5 py-1.5 font-mk text-xs md:text-sm tracking-wide shadow-xl mk-stroke-sm"
              style={{ backgroundColor: 'rgba(10, 15, 28, 0.78)', color: activeTitleMeta.accent }}
            >
              {activeTitleMeta.desc}
            </div>
          </div>
        </div>
      )}

      {/* ==================== 2. CHARACTER & VEHICLE SELECTION PADDOCK ==================== */}
      {hud.mode === 'paddock' && (
        <div className="absolute inset-0 z-20 pointer-events-none flex flex-col justify-between p-2.5 sm:p-3 md:p-5">
          {/* Transparent Floating Top Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="pointer-events-auto flex items-center gap-2">
              <button
                onClick={
                  hud.paddockStage === 'vehicle'
                    ? () => engineRef.current?.setPaddockStage('character')
                    : handleReturnToTitle
                }
                className="px-3 py-1.5 sm:py-2 rounded-xl border border-white/35 hover:border-white/75 font-mk text-xs uppercase tracking-wider text-sky-200 mk-stroke-sm cursor-pointer"
                style={{ backgroundColor: 'rgba(10, 15, 28, 0.35)' }}
              >
                {hud.paddockStage === 'vehicle' ? '← Characters' : '← Title'}
              </button>

              <div
                className="rounded-xl border border-white/25 px-3 py-1.5 flex items-center gap-2"
                style={{ backgroundColor: 'rgba(10, 15, 28, 0.28)' }}
              >
                <span className="font-mk text-xs sm:text-sm uppercase tracking-wider text-amber-300 mk-stroke-sm">
                  {hud.gameMode === 'time_trial'
                    ? 'Time Trials'
                    : hud.gameMode === 'vs_race'
                    ? 'VS Race'
                    : hud.gameMode === 'online_room'
                    ? 'Online Room'
                    : 'Grand Prix'}
                </span>
                <span className="text-white/40">·</span>
                <span className="font-mk text-[11px] sm:text-xs text-emerald-300 mk-stroke-sm">
                  {hud.paddockStage === 'character' ? '1. Pick Driver' : '2. Pick Vehicle & Course'}
                </span>
              </div>
            </div>

            <div className="pointer-events-auto flex flex-wrap items-center gap-1.5 sm:gap-2">
              <button
                onClick={() => setOnlineModalOpen(true)}
                className={`px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl border font-mk text-xs uppercase tracking-wider flex items-center gap-1.5 cursor-pointer mk-stroke-sm ${
                  mp.connected
                    ? 'border-emerald-300/70 text-emerald-300'
                    : 'border-white/30 hover:border-white/70 text-cyan-200'
                }`}
                style={{ backgroundColor: mp.connected ? 'rgba(6, 78, 59, 0.5)' : 'rgba(10, 15, 28, 0.3)' }}
              >
                <Wifi className="w-3.5 h-3.5" />
                <span>{mp.connected ? `Room ${mp.room?.roomCode} (${mp.room?.players.length ?? 1}/8)` : 'Online Room'}</span>
              </button>

              <button
                onClick={enterLandscapeFullscreen}
                title="Landscape Fullscreen"
                className="p-2 rounded-xl border border-white/30 hover:border-white/70 transition cursor-pointer"
                style={{ backgroundColor: 'rgba(10, 15, 28, 0.3)' }}
              >
                {isFullscreen ? (
                  <Minimize2 className="w-4 h-4 text-sky-300" />
                ) : (
                  <Maximize2 className="w-4 h-4 text-sky-300" />
                )}
              </button>

              <button
                onClick={() => setPaddockUiVisible((v) => !v)}
                title="Toggle Selection UI (H)"
                className="p-2 rounded-xl border border-white/30 hover:border-white/70 transition cursor-pointer"
                style={{ backgroundColor: 'rgba(10, 15, 28, 0.3)' }}
              >
                {paddockUiVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4 text-amber-300" />}
              </button>

              <button
                onClick={toggleMute}
                title={muted ? 'Unmute Audio' : 'Mute Audio'}
                className="p-2 rounded-xl border border-white/30 hover:border-white/70 transition cursor-pointer"
                style={{ backgroundColor: 'rgba(10, 15, 28, 0.3)' }}
              >
                {muted ? (
                  <VolumeX className="w-4 h-4 text-rose-400" />
                ) : (
                  <Volume2 className="w-4 h-4 text-emerald-400" />
                )}
              </button>
            </div>
          </div>

          {/* ===== STAGE 1: TRANSPARENT FLOATING CHARACTER SELECTION ===== */}
          {paddockUiVisible && hud.paddockStage === 'character' && (
            <div className="my-auto flex flex-col md:flex-row items-center md:items-center justify-end md:justify-between gap-2 min-h-0 flex-1 py-1">
              <div
                className={`pointer-events-auto w-full overflow-y-auto pr-1 space-y-2 ${
                  deviceTier === 'mobile'
                    ? 'mt-auto max-w-[360px] max-h-[44vh]'
                    : 'md:w-[445px] lg:w-[475px] max-h-[calc(100vh-145px)]'
                }`}
              >
                {/* Floating Weight Class Filter Tabs */}
                <div className="flex flex-wrap items-center justify-between gap-1.5">
                  <div className="flex flex-wrap gap-1">
                    {(['All', 'All-Around', 'Lightweight', 'Heavyweight'] as FilterTab[]).map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setWeightFilter(tab)}
                        className={`px-2 py-0.5 rounded-full text-[10px] font-mk uppercase tracking-wider border transition cursor-pointer ${
                          weightFilter === tab
                            ? 'bg-amber-400 border-amber-200 text-slate-950 shadow-md'
                            : 'bg-slate-950/35 border-white/25 text-cyan-200 hover:border-white/60 mk-stroke-sm'
                        }`}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>
                  <span className="font-mk text-[11px] uppercase tracking-wider text-amber-300 mk-stroke-sm">
                    {selectedSpec.weightClass}
                  </span>
                </div>

                {/* Truly Transparent Floating 6-Column Portrait Grid */}
                <div className="grid grid-cols-6 gap-1.5">
                  {filteredRoster.map((racer) => {
                    const active = racer.id === selectedId;
                    return (
                      <button
                        key={racer.id}
                        onClick={() => handleSelectCharacter(racer.id)}
                        title={`${racer.name} (${racer.weightClass})`}
                        className={`relative aspect-square rounded-xl border flex items-center justify-center p-1 transition cursor-pointer overflow-hidden ${
                          active
                            ? 'scale-105 border-amber-300 bg-white/18 shadow-[0_0_14px_rgba(250,204,21,0.75)]'
                            : 'border-white/20 bg-slate-950/20 hover:bg-white/10 hover:border-white/55 hover:scale-105'
                        }`}
                      >
                        <WhiteFlagButtonWave active={active} compact />
                        <div className="relative z-10 drop-shadow-[0_2px_6px_rgba(0,0,0,0.85)]">
                          <CharacterPortrait spec={racer} size={isCompactViewport ? 30 : 42} />
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Minimal Transparent Character Name + Stat Bars */}
                <div
                  className="rounded-xl px-3 py-2 border border-white/25 flex flex-wrap items-center justify-between gap-x-3 gap-y-1"
                  style={{ backgroundColor: 'rgba(8, 15, 32, 0.28)' }}
                >
                  <div className="flex items-baseline gap-2 min-w-0">
                    <span className="font-mk text-sm sm:text-base uppercase tracking-wide text-amber-300 mk-stroke-sm truncate">
                      {selectedSpec.name}
                    </span>
                    <span className="font-mk text-[10px] text-rose-300 mk-stroke-sm truncate">
                      {selectedSpec.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    {[
                      { label: 'SPD', val: selectedSpec.stats.topSpeed, col: '#ef4444' },
                      { label: 'ACC', val: selectedSpec.stats.acceleration, col: '#38bdf8' },
                      { label: 'HND', val: selectedSpec.stats.handling, col: '#22c55e' },
                      { label: 'WGT', val: selectedSpec.stats.weight, col: '#facc15' },
                    ].map((st) => (
                      <div key={st.label} className="flex items-center gap-1 text-[9px] font-hud">
                        <span className="font-bold text-white/95">{st.label}</span>
                        <div className="w-8 sm:w-10 h-1.5 rounded-full bg-black/50 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-300"
                            style={{ width: `${st.val}%`, backgroundColor: st.col }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Showcase Nameplate (Desktop shows beside centered-right 3D kart) */}
              <div className="hidden md:flex flex-col items-end justify-end self-stretch pb-4 pr-2">
                <div
                  className="px-4 py-1.5 mb-2 font-mk text-xl uppercase tracking-wider text-slate-950 shadow-xl border-2 border-white"
                  style={{
                    background: 'linear-gradient(90deg, #facc15, #fde047)',
                    clipPath: 'polygon(6% 0%, 100% 0%, 94% 100%, 0% 100%)',
                  }}
                >
                  Characters
                </div>
                <div className="flex-1" />
                <div
                  className="px-6 py-2 rounded-2xl border border-white/25 font-mk text-xl uppercase tracking-wide text-amber-300 mk-stroke-sm"
                  style={{ backgroundColor: 'rgba(15, 23, 42, 0.72)' }}
                >
                  {selectedSpec.name} <span className="text-sky-300 text-sm">· {selectedVehicle.name}</span>
                </div>
              </div>
            </div>
          )}

          {/* ===== STAGE 2: VEHICLE GARAGE SELECTION (MATCHING REFERENCE IMAGE 1) ===== */}
          {paddockUiVisible && hud.paddockStage === 'vehicle' && (
            <div className="my-auto flex flex-col md:flex-row items-center md:items-stretch justify-end md:justify-between gap-3 min-h-0 flex-1 py-1">
              {/* LEFT: 4-Column Vehicle Grid with Rounded Golden Corner Brackets & Page Arrows */}
              <div
                className={`pointer-events-auto flex flex-col justify-center gap-2 ${
                  deviceTier === 'mobile'
                    ? 'mt-auto w-full max-w-[390px] max-h-[46vh] overflow-y-auto'
                    : 'w-full md:w-[54%] max-w-[560px]'
                }`}
              >
                {/* Mobile Compact Selected Vehicle Nameplate + Mini Stat Bars */}
                <div
                  className="md:hidden rounded-xl px-2.5 py-1.5 border border-white/25 flex items-center justify-between gap-2"
                  style={{ backgroundColor: 'rgba(10, 16, 34, 0.52)' }}
                >
                  <div className="min-w-0">
                    <div className="font-mk text-xs uppercase text-amber-300 mk-stroke-sm truncate">
                      {selectedVehicle.name}
                    </div>
                    <div className="font-mk text-[9px] uppercase text-cyan-300 truncate">
                      {selectedVehicle.category}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 text-[8px] font-hud text-white">
                    <span>SPD {combinedBars.speed}</span>
                    <span>ACC {combinedBars.acceleration}</span>
                    <span>WGT {combinedBars.weight}</span>
                    <span>HND {combinedBars.handling}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setVehiclePage((p) => (p === 0 ? 1 : 0))}
                    title="Previous Vehicle Page"
                    className="shrink-0 w-7 h-10 rounded-xl bg-amber-400 hover:bg-amber-300 border-2 border-white text-slate-950 flex items-center justify-center shadow-lg cursor-pointer"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>

                  <div className="grid grid-cols-4 gap-1.5 sm:gap-2 flex-1">
                    {pagedVehicles.map((veh) => {
                      const active = veh.id === selectedVehicleId;
                      return (
                        <button
                          key={veh.id}
                          onClick={() => handleSelectVehicle(veh.id)}
                          title={`${veh.name} (${veh.category})`}
                          className={`relative aspect-[1.45/1] rounded-2xl border-2 flex flex-col items-center justify-center p-1 transition cursor-pointer ${
                            active
                              ? 'scale-[1.04] border-amber-300 bg-sky-500/25 shadow-[0_0_18px_rgba(250,204,21,0.7)]'
                              : 'border-white/25 bg-slate-950/35 hover:bg-white/10 hover:border-white/60'
                          }`}
                        >
                          {/* Reference Image 1 Curved Golden Corner Brackets on Active Tile */}
                          {active && (
                            <>
                              <span className="pointer-events-none absolute -top-1 -left-1 w-3.5 h-3.5 border-t-[4px] border-l-[4px] border-amber-300 rounded-tl-xl" />
                              <span className="pointer-events-none absolute -top-1 -right-1 w-3.5 h-3.5 border-t-[4px] border-r-[4px] border-amber-300 rounded-tr-xl" />
                              <span className="pointer-events-none absolute -bottom-1 -left-1 w-3.5 h-3.5 border-b-[4px] border-l-[4px] border-amber-300 rounded-bl-xl" />
                              <span className="pointer-events-none absolute -bottom-1 -right-1 w-3.5 h-3.5 border-b-[4px] border-r-[4px] border-amber-300 rounded-br-xl" />
                            </>
                          )}
                          <VehicleCardIcon
                            vehicle={veh}
                            size={deviceTier === 'mobile' ? 48 : deviceTier === 'tablet' ? 62 : 76}
                          />
                        </button>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => setVehiclePage((p) => (p === 0 ? 1 : 0))}
                    title="Next Vehicle Page"
                    className="shrink-0 w-7 h-10 rounded-xl bg-amber-400 hover:bg-amber-300 border-2 border-white text-slate-950 flex items-center justify-center shadow-lg cursor-pointer"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>

                {/* Pagination Dots */}
                <div className="flex items-center justify-center gap-2">
                  {([0, 1] as const).map((pg) => (
                    <button
                      key={pg}
                      onClick={() => setVehiclePage(pg)}
                      className={`w-2.5 h-2.5 rounded-full transition cursor-pointer ${
                        vehiclePage === pg ? 'bg-amber-300 scale-125' : 'bg-slate-900/60 border border-white/40'
                      }`}
                    />
                  ))}
                </div>

                {/* Course & Dynamic Weather Selectors */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {MAPS.map((m) => {
                    const active = selectedMap === m.id;
                    return (
                      <button
                        key={m.id}
                        onClick={() => handleSelectMap(m.id)}
                        className={`px-2 py-1.5 rounded-xl border text-left transition cursor-pointer ${
                          active
                            ? 'border-amber-300 bg-white/18 shadow-[0_0_12px_rgba(250,204,21,0.45)]'
                            : 'border-white/25 bg-slate-950/30 hover:bg-white/10 hover:border-white/55'
                        }`}
                      >
                        <div className="flex items-center gap-1 text-[10px] font-mk uppercase tracking-tight text-cyan-200 mk-stroke-sm truncate">
                          <MapIcon className="w-2.5 h-2.5 text-amber-300 shrink-0" />
                          <span className="truncate">
                            {m.name.split(' ')[0]} {m.name.split(' ')[1]}
                          </span>
                        </div>
                        <div className="text-[9px] text-white/85 truncate">{m.theme}</div>
                      </button>
                    );
                  })}
                </div>

                <div className="flex flex-wrap items-center gap-1">
                  {WEATHER_OPTIONS.map((w) => {
                    const active = selectedWeather === w.id;
                    return (
                      <button
                        key={w.id}
                        onClick={() => handleSelectWeather(w.id)}
                        className={`px-2 py-1 rounded-lg border text-[10px] font-mk uppercase tracking-wider flex items-center gap-1 transition cursor-pointer mk-stroke-sm ${
                          active
                            ? 'border-white bg-white/25 text-white shadow'
                            : 'border-white/20 bg-slate-950/25 text-white/85 hover:bg-white/10'
                        }`}
                      >
                        <span style={{ color: w.accent }}>
                          {w.id === 'sunny' && <Sun className="w-3 h-3" />}
                          {w.id === 'sunset' && <Sunset className="w-3 h-3" />}
                          {w.id === 'rainy' && <CloudRain className="w-3 h-3" />}
                          {w.id === 'night' && <Moon className="w-3 h-3" />}
                          {w.id === 'dynamic' && <Sparkles className="w-3 h-3" />}
                        </span>
                        <span>{w.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* RIGHT: Yellow "Vehicles" Banner + 4 Golden Stat Bars + Open 3D Showcase + Dark Vehicle Nameplate (Image 1) */}
              <div className="hidden md:flex flex-col items-end justify-between w-[42%] max-w-[390px] py-1">
                <div className="flex flex-col items-end gap-2 w-full">
                  <div
                    className="px-6 py-1.5 font-mk text-xl uppercase tracking-wider text-slate-950 shadow-xl border-2 border-white"
                    style={{
                      background: 'linear-gradient(90deg, #facc15, #fde047)',
                      clipPath: 'polygon(6% 0%, 100% 0%, 94% 100%, 0% 100%)',
                    }}
                  >
                    Vehicles
                  </div>

                  {/* Translucent 10-Segment Golden Stat Bars */}
                  <div
                    className="w-full rounded-2xl border border-white/25 p-3 space-y-1.5 shadow-xl"
                    style={{ backgroundColor: 'rgba(15, 23, 42, 0.56)' }}
                  >
                    {[
                      { label: 'Speed', val: combinedBars.speed },
                      { label: 'Acceleration', val: combinedBars.acceleration },
                      { label: 'Weight', val: combinedBars.weight },
                      { label: 'Handling', val: combinedBars.handling },
                    ].map((row) => (
                      <div key={row.label} className="space-y-0.5">
                        <div className="font-mk text-xs italic text-white mk-stroke-sm">
                          {row.label}
                        </div>
                        <div className="grid grid-cols-10 gap-0.5 h-2 rounded bg-slate-950/75 p-0.5">
                          {Array.from({ length: 10 }).map((_, seg) => (
                            <div
                              key={seg}
                              className={`rounded-sm transition-colors duration-200 ${
                                seg < row.val ? 'bg-amber-300' : 'bg-white/10'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Vehicle Nameplate at Bottom Right below Rotating 3D Model */}
                <div
                  className="pointer-events-auto px-6 py-2 rounded-2xl border-2 border-white/30 text-center shadow-2xl"
                  style={{ backgroundColor: 'rgba(15, 23, 42, 0.78)' }}
                >
                  <div className="font-mk text-2xl italic uppercase tracking-wide text-amber-300 mk-stroke-sm">
                    {selectedVehicle.name}
                  </div>
                  <div className="font-mk text-[11px] uppercase tracking-widest text-cyan-300 mk-stroke-sm">
                    {selectedVehicle.category} · {selectedSpec.name}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Transparent Bottom Bar: Exclusive Single-Active Control Mode + Stage Next / OK Start Button */}
          <div className="pointer-events-auto flex flex-wrap items-center justify-between gap-2">
            <div
              className="rounded-2xl border border-white/25 px-2.5 sm:px-3 py-1.5 sm:py-2 flex flex-wrap items-center gap-1 sm:gap-1.5 drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)]"
              style={{ backgroundColor: 'rgba(10, 15, 28, 0.35)' }}
            >
              <span className="font-mk text-[10px] uppercase tracking-wider text-amber-300 mr-1 mk-stroke-sm">
                Input:
              </span>
              {(
                [
                  { id: 'keyboard', label: 'Keyboard', icon: <Keyboard className="w-3 h-3" /> },
                  { id: 'mouse', label: 'Mouse', icon: <Mouse className="w-3 h-3" /> },
                  { id: 'controller', label: 'Controller', icon: <Gamepad2 className="w-3 h-3" /> },
                  { id: 'mobile_joystick', label: 'Joystick', icon: <Smartphone className="w-3 h-3" /> },
                  { id: 'mobile_buttons', label: 'Touch Pads', icon: <Smartphone className="w-3 h-3" /> },
                ] as { id: ControlMode; label: string; icon: React.ReactNode }[]
              ).map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setControlMode(opt.id)}
                  className={`px-2 py-1 rounded-lg border text-[10px] font-bold uppercase flex items-center gap-1 cursor-pointer transition ${
                    controlMode === opt.id
                      ? 'bg-sky-400 border-sky-200 text-slate-950 shadow'
                      : 'bg-transparent border-white/20 text-white hover:bg-white/10'
                  }`}
                >
                  {opt.icon}
                  <span>{opt.label}</span>
                </button>
              ))}
              <button
                onClick={() => setAutoAccel((v) => !v)}
                className={`px-2 py-1 rounded-lg border text-[10px] font-bold uppercase cursor-pointer ml-0.5 ${
                  autoAccel
                    ? 'bg-emerald-400 border-emerald-200 text-slate-950'
                    : 'bg-transparent border-white/20 text-white hover:bg-white/10'
                }`}
              >
                Auto-Gas
              </button>
            </div>

            <div className="flex items-center gap-2 ml-auto">
              {hud.paddockStage === 'character' ? (
                <button
                  onClick={() => engineRef.current?.setPaddockStage('vehicle')}
                  className="group relative overflow-hidden px-5 sm:px-6 py-2.5 sm:py-3 rounded-2xl border-2 border-amber-300 bg-slate-900/80 font-mk text-sm md:text-base uppercase tracking-wider shadow-2xl flex items-center gap-2 transition cursor-pointer"
                >
                  <WhiteFlagButtonWave active />
                  <Car className="relative z-10 w-4 h-4 text-slate-950" />
                  <span className="relative z-10 text-slate-950">Next: Vehicles</span>
                  <ArrowRight className="relative z-10 w-4 h-4 text-slate-950" />
                </button>
              ) : (
                <>
                  <button
                    onClick={() => engineRef.current?.setPaddockStage('character')}
                    className="px-3.5 py-2.5 rounded-2xl border border-white/30 bg-slate-900/65 hover:bg-slate-800/80 font-mk text-xs uppercase tracking-wider text-cyan-200 mk-stroke-sm flex items-center gap-1.5 cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Drivers</span>
                  </button>
                  <button
                    onClick={mp.connected ? () => mp.startRace() : triggerSoloRace}
                    disabled={mp.connected && !localRoomPlayer?.isHost}
                    className="group relative overflow-hidden px-5 sm:px-6 py-2.5 sm:py-3 rounded-2xl border-2 border-amber-300 bg-slate-900/75 disabled:opacity-50 font-mk text-sm md:text-base uppercase tracking-wider shadow-2xl flex items-center gap-2.5 transition cursor-pointer"
                  >
                    <WhiteFlagButtonWave active />
                    <span className="relative z-10 w-6 h-6 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center text-xs font-black">
                      A
                    </span>
                    <span className="relative z-10 text-slate-950">
                      {mp.connected
                        ? localRoomPlayer?.isHost
                          ? 'OK · Launch MP'
                          : 'Waiting Host'
                        : 'OK · Start Race'}
                    </span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==================== ONLINE ROOM MODAL (SEPARATE FROM MAIN UI) ==================== */}
      {onlineModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(6, 10, 20, 0.82)' }}
        >
          <div
            className="w-full max-w-md rounded-3xl border border-white/25 p-5 shadow-2xl space-y-4"
            style={{ backgroundColor: '#0f172a' }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Wifi className="w-5 h-5 text-sky-400" />
                <h2 className="text-lg font-black uppercase tracking-wide">Online Room</h2>
              </div>
              <button
                onClick={() => setOnlineModalOpen(false)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                  Driver Name
                </label>
                <input
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  maxLength={12}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/15 text-sm font-bold focus:outline-none focus:border-sky-400"
                />
              </div>

              {!mp.connected ? (
                <div className="space-y-2.5">
                  <button
                    onClick={handleCreateRoom}
                    className="w-full py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs uppercase tracking-wider cursor-pointer"
                  >
                    Create New Room Code
                  </button>
                  <div className="flex gap-2">
                    <input
                      value={roomCodeInput}
                      onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                      placeholder="ENTER CODE"
                      maxLength={6}
                      className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-white/15 text-sm font-black uppercase tracking-widest text-center focus:outline-none focus:border-sky-400"
                    />
                    <button
                      onClick={handleJoinCode}
                      className="px-5 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-xs uppercase tracking-wider cursor-pointer"
                    >
                      Join
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 rounded-2xl p-3 bg-slate-900/90 border border-sky-400/30">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase font-bold">Room Code</div>
                      <div className="text-2xl font-black tracking-widest text-amber-300">
                        {mp.room?.roomCode}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={copyRoomInvite}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold flex items-center gap-1 cursor-pointer"
                      >
                        {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedCode ? 'Copied' : 'Invite'}</span>
                      </button>
                      <button
                        onClick={() => mp.disconnect()}
                        className="px-3 py-1.5 rounded-lg bg-rose-600/90 hover:bg-rose-500 text-xs font-bold cursor-pointer"
                      >
                        Leave
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] font-bold uppercase text-sky-300">
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" /> Drivers ({mp.room?.players.length ?? 1}/8)
                      </span>
                      <button
                        onClick={() => mp.setReady(!(localRoomPlayer?.ready ?? false))}
                        className="px-2 py-0.5 rounded bg-emerald-500 text-slate-950 font-black cursor-pointer"
                      >
                        {localRoomPlayer?.ready ? 'Ready ✓' : 'Set Ready'}
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {mp.room?.players.map((p) => {
                        const sp = getRacerById(p.characterId);
                        return (
                          <span
                            key={p.id}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 text-xs font-bold border border-white/10"
                          >
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: sp.primaryColor }} />
                            <span>{p.name}</span>
                            {p.isHost && <span className="text-amber-300">★</span>}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  {localRoomPlayer?.isHost ? (
                    <button
                      onClick={() => mp.startRace()}
                      className="w-full py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs uppercase tracking-wider cursor-pointer"
                    >
                      Launch Multiplayer Race
                    </button>
                  ) : (
                    <div className="text-center text-xs text-slate-400 font-semibold py-1">
                      Waiting for Host to launch race...
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==================== 3. ACTIVE RACE HUD ==================== */}
      {(hud.mode === 'countdown' || hud.mode === 'racing') && (
        <>
          <div className="absolute inset-0 z-20 pointer-events-none p-2 sm:p-4 md:p-5 flex flex-col justify-between">
            {/* Top Perimeter: Top-Left Circular Ability Wheel + Rank/Lap/Countdown | Top-Right Analog Speedometer + Utility */}
            <div className="flex items-start justify-between gap-2 sm:gap-4">
              <div className="flex flex-col gap-1.5 sm:gap-2">
                {/* Device-Responsive Circular Ability Roulette in Top-Left Corner */}
                <CircularAbilityWheel
                  heldItem={hud.heldItem}
                  rouletteActive={hud.rouletteActive}
                  deviceTier={deviceTier}
                  onUseItem={() => engineRef.current?.triggerLocalItem()}
                />

                {/* Position & Lap / Countdown Target Badge */}
                <div className="flex items-center gap-1.5 sm:gap-2">
                  {hud.gameMode !== 'time_trial' && (
                    <div
                      className={`rounded-xl sm:rounded-2xl border border-white/20 shadow-xl flex items-baseline gap-0.5 ${
                        deviceTier === 'mobile' ? 'px-2 py-1' : 'px-3 py-1.5'
                      }`}
                      style={{ backgroundColor: 'rgba(10, 15, 28, 0.84)' }}
                    >
                      <span
                        className={`font-mk italic tracking-tighter text-amber-300 tabular-nums mk-stroke ${
                          deviceTier === 'mobile' ? 'text-xl' : 'text-3xl md:text-4xl'
                        }`}
                      >
                        {ord.num}
                      </span>
                      <span className="font-mk text-[10px] sm:text-xs text-cyan-300 mk-stroke-sm">
                        {ord.suffix}
                      </span>
                      <span className="text-[10px] sm:text-[11px] font-bold text-slate-300 ml-1">
                        / {hud.totalRacers}
                      </span>
                    </div>
                  )}

                  <div
                    className={`rounded-xl sm:rounded-2xl border shadow-xl ${
                      hud.gameMode === 'time_trial' && hud.timeRemainingMs <= 15000
                        ? 'border-rose-400/80'
                        : 'border-white/20'
                    } ${deviceTier === 'mobile' ? 'px-2 py-1' : 'px-3 py-1.5'}`}
                    style={{ backgroundColor: 'rgba(10, 15, 28, 0.84)' }}
                  >
                    <div className="font-mk text-[10px] sm:text-xs uppercase tracking-widest text-cyan-300 tabular-nums flex items-center gap-1.5 mk-stroke-sm">
                      <span>
                        {hud.gameMode === 'time_trial'
                          ? `LAP ${hud.lap} / ${hud.totalLaps} · TIME LEFT`
                          : `LAP ${hud.lap} / ${hud.totalLaps}`}
                      </span>
                      <span className="text-white/35">·</span>
                      <span className="text-amber-300">{hud.activeWeather}</span>
                    </div>
                    <div
                      className={`font-mk tabular-nums tracking-tight leading-tight mk-stroke-sm ${
                        deviceTier === 'mobile' ? 'text-sm' : 'text-base sm:text-lg'
                      } ${
                        hud.gameMode === 'time_trial'
                          ? hud.timeRemainingMs <= 15000
                            ? 'text-rose-400 animate-pulse'
                            : hud.timeRemainingMs <= 30000
                            ? 'text-amber-300'
                            : 'text-emerald-300'
                          : 'text-white'
                      }`}
                    >
                      {hud.gameMode === 'time_trial'
                        ? formatTime(hud.timeRemainingMs)
                        : formatTime(hud.raceTimeMs)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Top-Right Visual Analog Speedometer + Utility Controls */}
              <div className="flex items-start gap-1.5 sm:gap-2">
                <SpeedometerGauge
                  speedKmh={hud.speedKmh}
                  driftLevel={hud.driftLevel}
                  boostActive={hud.boostActive}
                  starActive={hud.starActive}
                  sizePx={speedoSize}
                />
                <div className="pointer-events-auto flex flex-col gap-1 sm:gap-1.5">
                  <button
                    onClick={() => engineRef.current?.setPaused(true)}
                    className="p-1.5 sm:p-2.5 rounded-xl border border-white/20 hover:border-white/50 cursor-pointer"
                    style={{ backgroundColor: 'rgba(10, 15, 28, 0.84)' }}
                    title="Pause (Esc)"
                  >
                    <Pause className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </button>
                  <button
                    onClick={enterLandscapeFullscreen}
                    className="p-1.5 sm:p-2.5 rounded-xl border border-white/20 hover:border-white/50 cursor-pointer"
                    style={{ backgroundColor: 'rgba(10, 15, 28, 0.84)' }}
                    title="Fullscreen"
                  >
                    {isFullscreen ? (
                      <Minimize2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-sky-300" />
                    ) : (
                      <Maximize2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-sky-300" />
                    )}
                  </button>
                  <button
                    onClick={toggleMute}
                    className="p-1.5 sm:p-2.5 rounded-xl border border-white/20 hover:border-white/50 cursor-pointer"
                    style={{ backgroundColor: 'rgba(10, 15, 28, 0.84)' }}
                    title="Mute / Unmute"
                  >
                    {muted ? (
                      <VolumeX className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-400" />
                    ) : (
                      <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Center Countdown */}
            {hud.mode === 'countdown' && (
              <div className="self-center my-auto text-center">
                <div
                  className={`font-mk text-7xl md:text-9xl italic tracking-tighter mk-stroke tabular-nums ${
                    hud.countdownValue > 0 ? 'text-amber-300' : 'text-emerald-400'
                  }`}
                >
                  {hud.countdownValue > 0 ? hud.countdownValue : 'GO!'}
                </div>
              </div>
            )}

            {/* Floating Kinetic Boost Typography (Rising from bottom-center & fading out, NO big box!) */}
            {hud.boostCallout && (
              <div
                key={hud.boostCallout.id}
                className="animate-boost-word self-center mb-24 sm:mb-32 md:mb-36 text-center pointer-events-none"
              >
                <span
                  className="font-mk text-2xl sm:text-3xl md:text-5xl italic uppercase tracking-wider mk-stroke"
                  style={{ color: hud.boostCallout.color }}
                >
                  {hud.boostCallout.text}
                </span>
              </div>
            )}

            {/* Bottom Perimeter: Active Desktop Control Hint (Bottom-Left) */}
            <div className="flex items-end justify-between gap-4">
              {hud.controlMode !== 'mobile_buttons' && hud.controlMode !== 'mobile_joystick' && (
                <div
                  className="hidden md:flex items-center gap-2 rounded-xl border border-white/15 px-3 py-1.5 font-hud text-[10px] font-bold uppercase tracking-wider text-slate-300"
                  style={{ backgroundColor: 'rgba(10, 15, 28, 0.72)' }}
                >
                  {hud.controlMode === 'mouse'
                    ? 'Mouse Steer · L-Click Gas · R-Click Drift · X / E Item'
                    : hud.controlMode === 'controller'
                    ? 'Controller · A/RT Gas · RB Drift · X/Y Item'
                    : 'WASD/Arrows · Space Drift · X / E Item · C Rear'}
                </div>
              )}
            </div>
          </div>

          {/* Transparent Bottom-Middle MiniMap */}
          <div className="fixed bottom-2 sm:bottom-3 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
            <MiniMap
              points={hud.minimapPoints}
              racers={hud.minimapRacers}
              transparent
              size={minimapSize}
            />
          </div>

          {/* Exclusive Circular Touch Overlay (only renders when controlMode is mobile_joystick or mobile_buttons) */}
          <MobileControls
            controlMode={hud.controlMode}
            autoAccel={autoAccel}
            deviceTier={deviceTier}
            onUpdate={(steer, drift, item, throttle, brake) =>
              engineRef.current?.setTouchControls(steer, drift, item, throttle, brake)
            }
          />
        </>
      )}

      {/* ==================== 4. CINEMATIC RACE REPLAY VIEWER ==================== */}
      {hud.mode === 'replay' && (
        <div className="absolute inset-0 z-30 pointer-events-none p-4 md:p-6 flex flex-col justify-between">
          {/* Top Replay Header & Live Event Callout */}
          <div className="flex items-start justify-between gap-4">
            <div
              className="rounded-2xl border border-rose-400/50 px-4 py-2 shadow-2xl flex items-center gap-2.5"
              style={{ backgroundColor: 'rgba(10, 15, 28, 0.88)' }}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
              <span className="text-xs font-black uppercase tracking-widest text-rose-300">
                Race Replay
              </span>
              <span className="text-xs font-bold text-slate-300 tabular-nums">
                {formatTime(hud.replayTimeMs)} / {formatTime(hud.replayDurationMs)}
              </span>
            </div>

            {hud.replayEventBanner && (
              <div
                className="rounded-2xl border border-amber-300/70 px-4 py-2 shadow-2xl text-sm font-black italic uppercase tracking-wider text-amber-300"
                style={{ backgroundColor: 'rgba(10, 15, 28, 0.9)' }}
              >
                {hud.replayEventBanner}
              </div>
            )}
          </div>

          {/* Bottom Replay Scrubber, Event Markers & Transport Bar */}
          <div
            className="pointer-events-auto rounded-2xl border border-white/25 p-3.5 shadow-2xl space-y-2.5 max-w-3xl w-full self-center"
            style={{ backgroundColor: 'rgba(10, 15, 28, 0.92)' }}
          >
            {/* Event Marker Timeline */}
            <div className="relative flex items-center">
              <input
                type="range"
                min={0}
                max={Math.max(1, hud.replayDurationMs)}
                value={hud.replayTimeMs}
                onChange={(e) => engineRef.current?.seekReplay(Number(e.target.value))}
                className="w-full accent-amber-400 cursor-pointer"
              />
              {hud.replayDurationMs > 0 &&
                hud.replayEvents.map((ev, idx) => {
                  const pct = (ev.timeMs / hud.replayDurationMs) * 100;
                  const col =
                    ev.kind === 'hit'
                      ? '#ef4444'
                      : ev.kind === 'overtake'
                      ? '#22c55e'
                      : ev.kind === 'air_boost'
                      ? '#38bdf8'
                      : '#facc15';
                  return (
                    <button
                      key={idx}
                      onClick={() => engineRef.current?.seekReplay(Math.max(0, ev.timeMs - 800))}
                      title={`${ev.label} (${formatTime(ev.timeMs)})`}
                      className="absolute -top-2.5 w-2.5 h-2.5 rounded-full border border-white cursor-pointer"
                      style={{ left: `calc(${pct}% - 5px)`, backgroundColor: col }}
                    />
                  );
                })}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => engineRef.current?.setReplayPaused(!hud.replayPaused)}
                  className="px-3.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs uppercase flex items-center gap-1.5 cursor-pointer"
                >
                  {hud.replayPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                  <span>{hud.replayPaused ? 'Play' : 'Pause'}</span>
                </button>
                <button
                  onClick={() => engineRef.current?.setReplaySpeed(hud.replaySpeed === 1 ? 2 : 1)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/15 text-xs font-black uppercase cursor-pointer"
                >
                  {hud.replaySpeed}x Speed
                </button>
              </div>

              <button
                onClick={() => engineRef.current?.exitReplay()}
                className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/20 text-xs font-black uppercase cursor-pointer"
              >
                Back to Results
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== 5. LARGER PAUSE & FINISH LEADERBOARD PODIUM MODAL ==================== */}
      {(hud.mode === 'paused' || hud.mode === 'finished') && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center p-3 sm:p-5"
          style={{ backgroundColor: 'rgba(6, 10, 20, 0.84)' }}
        >
          <div
            className="w-full max-w-2xl md:max-w-3xl rounded-3xl border-2 border-white/25 p-5 sm:p-7 shadow-2xl space-y-5"
            style={{ backgroundColor: '#0f172a' }}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3.5">
                <Trophy
                  className={`w-9 h-9 sm:w-10 sm:h-10 ${
                    hud.mode === 'finished' && hud.timeTrialResult === 'failed'
                      ? 'text-rose-400'
                      : 'text-amber-300'
                  }`}
                />
                <div>
                  <h2 className="font-mk text-2xl sm:text-3xl uppercase tracking-tight text-amber-300 mk-stroke-sm">
                    {hud.mode === 'finished'
                      ? hud.gameMode === 'time_trial'
                        ? hud.timeTrialResult === 'failed'
                          ? "Time's Up!"
                          : 'Time Trial Cleared!'
                        : `Finished ${ord.num}${ord.suffix}!`
                      : 'Race Paused'}
                  </h2>
                  <p className="font-mk text-xs sm:text-sm text-cyan-300 mk-stroke-sm">
                    {hud.gameMode === 'time_trial'
                      ? hud.timeTrialResult === 'failed'
                        ? `Reached Lap ${hud.lap}/${hud.totalLaps} · ${formatTime(hud.timeLimitMs)} Limit`
                        : `Cleared ${hud.totalLaps} Laps in ${formatTime(hud.raceTimeMs)} (${formatTime(hud.timeRemainingMs)} left)`
                      : `Grand Prix Standings · Time ${formatTime(hud.raceTimeMs)}`}
                  </p>
                </div>
              </div>
              <Gamepad2 className="w-6 h-6 text-slate-500 shrink-0" />
            </div>

            <div className="space-y-2 max-h-[46vh] overflow-y-auto pr-1">
              {hud.standings.map((row) => {
                const racerSpec = getRacerById(row.characterId);
                const vehSpec = getVehicleById(row.vehicleId);
                const medalBadge =
                  row.rank === 1
                    ? 'bg-amber-400 text-slate-950 border-amber-200'
                    : row.rank === 2
                    ? 'bg-slate-200 text-slate-950 border-white'
                    : row.rank === 3
                    ? 'bg-orange-500 text-white border-orange-300'
                    : 'bg-slate-800 text-amber-300 border-white/15';
                return (
                  <div
                    key={row.id}
                    className={`flex items-center justify-between px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-2xl border text-sm sm:text-base ${
                      row.isPlayer
                        ? 'border-amber-400/80 bg-amber-500/18 shadow-lg'
                        : 'border-white/10 bg-slate-900/85'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className={`w-8 h-8 rounded-xl border flex items-center justify-center font-mk text-sm tabular-nums shrink-0 ${medalBadge}`}
                      >
                        {row.rank}
                      </span>
                      <div className="shrink-0">
                        <CharacterPortrait spec={racerSpec} size={36} />
                      </div>
                      <div className="min-w-0">
                        <div className="font-mk uppercase tracking-wide text-white truncate flex items-center gap-2">
                          <span style={{ color: row.isPlayer ? '#fde047' : '#ffffff' }}>{row.name}</span>
                          {row.isPlayer && (
                            <span className="px-1.5 py-0.5 rounded bg-amber-400 text-slate-950 text-[10px] font-black">
                              YOU
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] font-bold text-sky-300 truncate">
                          {vehSpec.name}
                        </div>
                      </div>
                    </div>
                    <span className="font-mk tabular-nums text-emerald-300 text-sm sm:text-base mk-stroke-sm shrink-0 ml-2">
                      {row.finished ? formatTime(row.finishTimeMs) : `Lap ${row.lap}/${hud.totalLaps}`}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-wrap gap-2.5">
              {hud.mode === 'paused' ? (
                <button
                  onClick={() => engineRef.current?.setPaused(false)}
                  className="flex-1 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-mk text-sm uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Play className="w-4 h-4" />
                  <span>Resume</span>
                </button>
              ) : (
                <>
                  {hud.hasReplay && (
                    <button
                      onClick={() => engineRef.current?.startReplay()}
                      className="flex-1 py-3.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-mk text-sm uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Film className="w-4 h-4" />
                      <span>Race Replay</span>
                    </button>
                  )}
                  <button
                    onClick={triggerSoloRace}
                    className="flex-1 py-3.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-mk text-sm uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Race Again</span>
                  </button>
                </>
              )}

              <button
                onClick={handleReturnToPaddock}
                className="flex-1 py-3.5 rounded-xl border border-white/25 bg-slate-800 hover:bg-slate-700 text-cyan-200 font-mk text-sm uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Paddock</span>
              </button>

              <button
                onClick={handleReturnToTitle}
                className="px-5 py-3.5 rounded-xl border border-white/15 bg-slate-900 hover:bg-slate-800 text-rose-300 font-mk text-sm uppercase tracking-wider cursor-pointer"
              >
                Title
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
