import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
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
  Mouse,
  Pause,
  Play,
  RotateCcw,
  Smartphone,
  Timer,
  Trophy,
  Users,
  Volume2,
  VolumeX,
  Wifi,
  X,
} from 'lucide-react';
import { CharacterPortrait } from './components/CharacterPortrait.tsx';
import { CircularAbilityWheel } from './components/CircularAbilityWheel.tsx';
import { MiniMap } from './components/MiniMap.tsx';
import { MobileControls } from './components/MobileControls.tsx';
import { PixelFlagTransition } from './components/PixelFlagTransition.tsx';
import { SpeedometerGauge } from './components/SpeedometerGauge.tsx';
import { WhiteFlagButtonWave } from './components/WhiteFlagButtonWave.tsx';
import {
  KartGameEngine,
  type ControlMode,
  type GameModeType,
  type HudSnapshot,
} from './game/engine.ts';
import { MAPS, type MapId } from './game/maps.ts';
import { getRacerById, ROSTER, type WeightClass } from './game/roster.ts';
import { useMultiplayerRoom } from './hooks/useMultiplayerRoom.ts';
import type { NetRoomSnapshot } from './shared/protocol.ts';

type FilterTab = 'All' | WeightClass;

const INITIAL_HUD: HudSnapshot = {
  mode: 'title',
  gameMode: 'grand_prix',
  mapId: 'plaza',
  controlMode: 'keyboard',
  rank: 1,
  totalRacers: 8,
  lap: 1,
  speedKmh: 0,
  heldItem: 'none',
  rouletteActive: false,
  driftLevel: 0,
  boostActive: false,
  starActive: false,
  boostCallout: null,
  countdownValue: 3,
  raceTimeMs: 0,
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
    desc: 'Solo speed run with Turbo Mushrooms — chase your best lap!',
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
  const [selectedMap, setSelectedMap] = useState<MapId>('plaza');
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

  // Online Room Multiplayer State
  const [playerName, setPlayerName] = useState<string>('Racer');
  const [roomCodeInput, setRoomCodeInput] = useState<string>('');
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const mpStartTriggeredRef = useRef<boolean>(false);
  const pendingFlagActionRef = useRef<
    | {
        type: 'race';
        remotePlayers: { id: string; name: string; characterId: string; slotIndex: number }[];
        gameMode: GameModeType;
      }
    | { type: 'paddock' }
    | { type: 'title' }
    | null
  >(null);

  const selectedSpec = useMemo(() => getRacerById(selectedId), [selectedId]);
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
      engine.enterPaddock();
      setOnlineModalOpen(true);
      mp.joinRoom(clean, 'MobileRacer', 'mario');
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

  // Track Portrait vs Landscape + Compact Mobile + Fullscreen State
  useEffect(() => {
    const checkLayout = () => {
      const touch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      setIsPortraitMobile(touch && window.innerHeight > window.innerWidth);
      setIsCompactViewport(window.innerHeight <= 540 || window.innerWidth < 768);
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
        triggerSoloRace();
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
          const idx = filteredRoster.findIndex((r) => r.id === selectedId);
          if (idx >= 0) {
            let next = idx;
            if (left) next = (idx - 1 + filteredRoster.length) % filteredRoster.length;
            if (right) next = (idx + 1) % filteredRoster.length;
            if (up) next = (idx - 6 + filteredRoster.length) % filteredRoster.length;
            if (down) next = (idx + 6) % filteredRoster.length;
            handleSelectCharacter(filteredRoster[next].id);
          }
        } else if (pad.buttons[0]?.pressed) {
          padNavCooldownRef.current = now + 500;
          if (mp.connected && localRoomPlayer?.isHost) mp.startRace();
          else if (!mp.connected) triggerSoloRace();
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

  const handleSelectMap = (mapId: MapId) => {
    setSelectedMap(mapId);
    engineRef.current?.loadMap(mapId);
    engineRef.current?.audio.playSelect();
  };

  const handleSelectTitleMode = (gm: GameModeType) => {
    engineRef.current?.audio.init();
    engineRef.current?.audio.playSelect();
    engineRef.current?.setGameMode(gm);
    if (gm === 'online_room') {
      transitionToScreen(() => {
        engineRef.current?.enterPaddock();
        setOnlineModalOpen(true);
      });
    } else {
      transitionToScreen(() => {
        engineRef.current?.enterPaddock();
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
    mp.joinRoom(code, playerName || 'Host', selectedId);
  };

  const handleJoinCode = () => {
    const code = (roomCodeInput || 'MK88').toUpperCase().trim();
    if (!code) return;
    setRoomCodeInput(code);
    mp.joinRoom(code, playerName || 'Driver', selectedId);
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
        action.gameMode
      );
    } else if (action.type === 'paddock') {
      engineRef.current.returnToPaddock();
    } else if (action.type === 'title') {
      engineRef.current.returnToTitle();
    }
    pendingFlagActionRef.current = null;
  }, [selectedId, playerName]);

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
        <div className="absolute inset-0 z-20 pointer-events-none flex flex-col justify-between p-3.5 sm:p-5 md:p-8 bg-gradient-to-r from-slate-950/65 via-slate-950/15 to-transparent">
          {/* Top Title Bar */}
          <div className="flex items-start justify-between gap-2">
            <div className="pointer-events-auto flex items-center gap-2.5 sm:gap-3">
              <div
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl border-2 border-amber-300 flex items-center justify-center shadow-2xl shrink-0"
                style={{ backgroundColor: 'rgba(10, 15, 28, 0.88)' }}
              >
                <Flag className="w-5 h-5 sm:w-6 sm:h-6 text-amber-300" />
              </div>
              <div>
                <div className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.26em] text-amber-300 drop-shadow">
                  Championship Arcade Edition
                </div>
                <h1 className="text-2xl sm:text-3xl md:text-5xl font-black italic uppercase tracking-tight text-white drop-shadow-[0_4px_14px_rgba(0,0,0,0.85)] leading-none">
                  Mario Kart Grand Prix
                </h1>
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
          <div className="my-auto flex flex-col gap-2 sm:gap-3 max-w-xs sm:max-w-sm md:max-w-md pl-1 sm:pl-2">
            {TITLE_MODES.map((m) => {
              const isActive = hoveredTitleMode === m.id;
              return (
                <button
                  key={m.id}
                  onMouseEnter={() => setHoveredTitleMode(m.id)}
                  onFocus={() => setHoveredTitleMode(m.id)}
                  onClick={() => handleSelectTitleMode(m.id)}
                  className={`pointer-events-auto group relative flex items-center gap-3 sm:gap-4 px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl border-2 transition-all duration-200 cursor-pointer text-left ${
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
                    className="relative z-10 w-9 h-9 sm:w-11 sm:h-11 shrink-0 rounded-lg border-2 border-white flex items-center justify-center shadow-lg"
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

                  {/* Label */}
                  <div
                    className="relative z-10 flex-1"
                    style={{ transform: 'skewX(10deg)' }}
                  >
                    <div
                      className={`text-lg sm:text-xl md:text-2xl font-black italic uppercase tracking-wide transition-colors ${
                        isActive ? 'text-slate-950 drop-shadow-[0_1px_0_rgba(255,255,255,0.9)]' : 'text-white'
                      }`}
                    >
                      {m.label}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Bottom Bar: Live Cutscene Tag, Made By Shritiz Credit, and Mode Description */}
          <div className="flex flex-wrap items-end justify-between gap-2 sm:gap-4">
            <div className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-white/80 drop-shadow">
              Live 3D AI Demo · Select a Mode to Begin
            </div>
            <div className="px-4 py-1.5 rounded-full border border-amber-300/60 bg-slate-950/85 text-xs sm:text-sm font-black italic uppercase tracking-widest text-amber-300 shadow-lg">
              Made By Shritiz
            </div>
            <div
              className="hidden sm:block rounded-xl border border-white/25 px-3.5 py-1.5 text-xs md:text-sm font-black italic tracking-wide shadow-xl"
              style={{ backgroundColor: 'rgba(10, 15, 28, 0.85)', color: activeTitleMeta.accent }}
            >
              {activeTitleMeta.desc}
            </div>
          </div>
        </div>
      )}

      {/* ==================== 2. CHARACTER & MAP PADDOCK SCREEN ==================== */}
      {hud.mode === 'paddock' && (
        <div className="absolute inset-0 z-20 pointer-events-none flex flex-col justify-between p-3 md:p-5">
          {/* Top Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="pointer-events-auto flex items-center gap-2">
              <button
                onClick={handleReturnToTitle}
                className="px-3 py-2 rounded-xl border border-white/25 hover:border-white/60 text-xs font-black uppercase tracking-wider cursor-pointer"
                style={{ backgroundColor: 'rgba(10, 15, 28, 0.85)' }}
              >
                ← Title
              </button>
              <div
                className="rounded-xl border border-white/25 px-3.5 py-2 shadow-xl flex items-center gap-2.5"
                style={{ backgroundColor: 'rgba(12, 74, 110, 0.86)' }}
              >
                <span className="text-xs md:text-sm font-black uppercase tracking-wider text-amber-300">
                  {hud.gameMode === 'time_trial'
                    ? 'Time Trials'
                    : hud.gameMode === 'vs_race'
                    ? 'VS Race'
                    : hud.gameMode === 'online_room'
                    ? 'Online Room'
                    : 'Grand Prix'}
                </span>
                <span className="text-white/40">·</span>
                <span className="text-[11px] font-bold text-sky-100">
                  {hud.gamepadConnected ? 'Controller Ready' : 'Select Driver & Course'}
                </span>
              </div>
            </div>

            <div className="pointer-events-auto flex flex-wrap items-center gap-2">
              <button
                onClick={() => setOnlineModalOpen(true)}
                className={`px-3 py-2 rounded-xl border text-xs font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer ${
                  mp.connected
                    ? 'border-emerald-300/70 bg-emerald-500/20 text-emerald-200'
                    : 'border-white/25 hover:border-white/60 text-sky-200'
                }`}
                style={{ backgroundColor: mp.connected ? 'rgba(6, 78, 59, 0.85)' : 'rgba(10, 15, 28, 0.85)' }}
              >
                <Wifi className="w-3.5 h-3.5" />
                <span>{mp.connected ? `Room ${mp.room?.roomCode} (${mp.room?.players.length ?? 1}/8)` : 'Online Room'}</span>
              </button>

              <button
                onClick={enterLandscapeFullscreen}
                title="Landscape Fullscreen"
                className="p-2 rounded-xl border border-white/25 hover:border-white/60 transition cursor-pointer"
                style={{ backgroundColor: 'rgba(10, 15, 28, 0.85)' }}
              >
                {isFullscreen ? (
                  <Minimize2 className="w-4 h-4 text-sky-300" />
                ) : (
                  <Maximize2 className="w-4 h-4 text-sky-300" />
                )}
              </button>

              <button
                onClick={() => setPaddockUiVisible((v) => !v)}
                title="Toggle Character Grid (H)"
                className="p-2 rounded-xl border border-white/25 hover:border-white/60 transition cursor-pointer"
                style={{ backgroundColor: 'rgba(10, 15, 28, 0.85)' }}
              >
                {paddockUiVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4 text-amber-300" />}
              </button>

              <button
                onClick={toggleMute}
                title={muted ? 'Unmute Audio' : 'Mute Audio'}
                className="p-2 rounded-xl border border-white/25 hover:border-white/60 transition cursor-pointer"
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

          {/* Middle Section: Left Character + Map Selector | Right Open Moving Backdrop 3D Showcase */}
          {paddockUiVisible && (
            <div className="my-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-2.5 min-h-0">
              <div
                className="pointer-events-auto w-full md:w-[450px] lg:w-[490px] max-h-[calc(100vh-118px)] overflow-y-auto rounded-2xl border-2 border-white/45 p-2.5 sm:p-3 shadow-2xl space-y-2"
                style={{ backgroundColor: 'rgba(14, 116, 174, 0.78)' }}
              >
                {/* Weight Class Tabs */}
                <div className="flex flex-wrap items-center justify-between gap-1.5">
                  <div className="flex flex-wrap gap-1">
                    {(['All', 'All-Around', 'Lightweight', 'Heavyweight'] as FilterTab[]).map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setWeightFilter(tab)}
                        className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider transition cursor-pointer ${
                          weightFilter === tab
                            ? 'bg-amber-400 text-slate-950 shadow'
                            : 'bg-slate-950/55 text-white/85 hover:bg-slate-900'
                        }`}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-200">
                    {selectedSpec.weightClass}
                  </span>
                </div>

                {/* 6-Column Portrait Grid with White Flag Behind Active Character */}
                <div className="grid grid-cols-6 gap-1.5">
                  {filteredRoster.map((racer) => {
                    const active = racer.id === selectedId;
                    return (
                      <button
                        key={racer.id}
                        onClick={() => handleSelectCharacter(racer.id)}
                        title={`${racer.name} (${racer.weightClass})`}
                        className={`relative aspect-square rounded-xl flex items-center justify-center p-1 transition cursor-pointer overflow-hidden ${
                          active ? 'scale-105 bg-sky-200/35' : 'bg-slate-950/40 hover:bg-sky-400/25'
                        }`}
                      >
                        <WhiteFlagButtonWave active={active} compact />
                        <div className="relative z-10">
                          <CharacterPortrait spec={racer} size={isCompactViewport ? 36 : 44} />
                        </div>
                        {active && (
                          <span className="pointer-events-none absolute inset-0 rounded-xl border-2 border-amber-300 shadow-[0_0_12px_rgba(250,204,21,0.9)]" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Live Character Stats */}
                <div
                  className="rounded-xl p-2 border border-white/20 space-y-1"
                  style={{ backgroundColor: 'rgba(9, 13, 26, 0.78)' }}
                >
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-black uppercase tracking-wide text-amber-300">
                      {selectedSpec.name}
                    </span>
                    <span className="text-[10px] text-sky-200 font-semibold">{selectedSpec.title}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                    {[
                      { label: 'Speed', val: selectedSpec.stats.topSpeed, col: '#ef4444' },
                      { label: 'Accel', val: selectedSpec.stats.acceleration, col: '#38bdf8' },
                      { label: 'Handle', val: selectedSpec.stats.handling, col: '#22c55e' },
                      { label: 'Weight', val: selectedSpec.stats.weight, col: '#facc15' },
                    ].map((st) => (
                      <div key={st.label} className="grid grid-cols-[44px_1fr_24px] items-center gap-1.5 text-[10px]">
                        <span className="font-bold text-slate-300 uppercase">{st.label}</span>
                        <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-300"
                            style={{ width: `${st.val}%`, backgroundColor: st.col }}
                          />
                        </div>
                        <span className="font-black text-right tabular-nums">{st.val}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Course / Map Selection Strip (4 Maps) */}
                <div
                  className="rounded-xl p-2 border border-white/20 space-y-1.5"
                  style={{ backgroundColor: 'rgba(9, 13, 26, 0.78)' }}
                >
                  <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-sky-300">
                    <MapIcon className="w-3 h-3" />
                    <span>Select Track</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                    {MAPS.map((m) => {
                      const active = selectedMap === m.id;
                      return (
                        <button
                          key={m.id}
                          onClick={() => handleSelectMap(m.id)}
                          className={`relative overflow-hidden px-2 py-1.5 rounded-lg border text-left transition cursor-pointer ${
                            active
                              ? 'border-amber-300 bg-sky-500/30'
                              : 'border-white/15 bg-slate-900/70 hover:bg-slate-800'
                          }`}
                        >
                          <div className="text-[10px] font-black uppercase tracking-tight text-white truncate">
                            {m.name.split(' ')[0]} {m.name.split(' ')[1]}
                          </div>
                          <div className="text-[9px] text-sky-200/80 truncate">{m.theme}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="hidden md:block flex-1" />
            </div>
          )}

          {/* Bottom Bar: Exclusive Single-Active Control Mode + OK Start Race Button */}
          <div className="pointer-events-auto flex flex-wrap items-center justify-between gap-2">
            <div
              className="rounded-2xl border border-white/20 px-3 py-2 flex flex-wrap items-center gap-1.5 shadow-xl"
              style={{ backgroundColor: 'rgba(10, 15, 28, 0.88)' }}
            >
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 mr-1">
                Input (Exclusive):
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
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase flex items-center gap-1 cursor-pointer transition ${
                    controlMode === opt.id
                      ? 'bg-sky-400 text-slate-950 shadow'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {opt.icon}
                  <span>{opt.label}</span>
                </button>
              ))}
              <button
                onClick={() => setAutoAccel((v) => !v)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase cursor-pointer ml-1 ${
                  autoAccel ? 'bg-emerald-400 text-slate-950' : 'bg-slate-800 text-slate-300'
                }`}
              >
                Auto-Gas
              </button>
            </div>

            <button
              onClick={mp.connected ? () => mp.startRace() : triggerSoloRace}
              disabled={mp.connected && !localRoomPlayer?.isHost}
              className="group relative overflow-hidden px-6 py-3 rounded-2xl border-2 border-amber-300 bg-slate-900 hover:text-slate-950 disabled:opacity-50 font-black text-sm md:text-base uppercase tracking-wider shadow-2xl flex items-center gap-2.5 transition cursor-pointer"
            >
              <WhiteFlagButtonWave active />
              <span className="relative z-10 w-6 h-6 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center text-xs font-black">
                A
              </span>
              <span className="relative z-10 text-slate-950 drop-shadow-[0_1px_0_rgba(255,255,255,0.8)]">
                {mp.connected
                  ? localRoomPlayer?.isHost
                    ? 'OK · Launch MP'
                    : 'Waiting Host'
                  : 'OK · Start Race'}
              </span>
            </button>
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
          <div className="absolute inset-0 z-20 pointer-events-none p-2.5 sm:p-4 md:p-5 flex flex-col justify-between">
            {/* Top Perimeter: Top-Left Circular Ability Wheel + Rank/Lap | Top-Right Analog Speedometer + Utility */}
            <div className="flex items-start justify-between gap-2 sm:gap-4">
              <div className="flex flex-col gap-1.5 sm:gap-2.5">
                {/* Circular Ability Roulette in Top-Left Corner */}
                <CircularAbilityWheel
                  heldItem={hud.heldItem}
                  rouletteActive={hud.rouletteActive}
                />

                {/* Position & Lap Badge */}
                <div className="flex items-center gap-1.5 sm:gap-2">
                  {hud.gameMode !== 'time_trial' && (
                    <div
                      className="rounded-xl sm:rounded-2xl border border-white/20 px-2.5 sm:px-3.5 py-1 sm:py-1.5 shadow-xl flex items-baseline gap-0.5"
                      style={{ backgroundColor: 'rgba(10, 15, 28, 0.86)' }}
                    >
                      <span className="text-2xl sm:text-3xl md:text-4xl font-black italic tracking-tighter text-amber-300 tabular-nums">
                        {ord.num}
                      </span>
                      <span className="text-[10px] sm:text-xs font-black text-amber-400">{ord.suffix}</span>
                      <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 ml-1">
                        / {hud.totalRacers}
                      </span>
                    </div>
                  )}

                  <div
                    className="rounded-xl sm:rounded-2xl border border-white/20 px-2.5 sm:px-3.5 py-1 sm:py-1.5 shadow-xl"
                    style={{ backgroundColor: 'rgba(10, 15, 28, 0.86)' }}
                  >
                    <div className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-sky-300 tabular-nums">
                      LAP {hud.lap} / 3
                    </div>
                    <div className="text-sm sm:text-base font-black tabular-nums tracking-tight leading-tight">
                      {formatTime(hud.raceTimeMs)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Top-Right Visual Analog Speedometer + Utility Controls */}
              <div className="flex items-start gap-2">
                <SpeedometerGauge
                  speedKmh={hud.speedKmh}
                  driftLevel={hud.driftLevel}
                  boostActive={hud.boostActive}
                  starActive={hud.starActive}
                />
                <div className="pointer-events-auto flex flex-col gap-1.5">
                  <button
                    onClick={() => engineRef.current?.setPaused(true)}
                    className="p-2 sm:p-2.5 rounded-xl border border-white/20 hover:border-white/50 cursor-pointer"
                    style={{ backgroundColor: 'rgba(10, 15, 28, 0.86)' }}
                    title="Pause (Esc)"
                  >
                    <Pause className="w-4 h-4" />
                  </button>
                  <button
                    onClick={enterLandscapeFullscreen}
                    className="p-2 sm:p-2.5 rounded-xl border border-white/20 hover:border-white/50 cursor-pointer"
                    style={{ backgroundColor: 'rgba(10, 15, 28, 0.86)' }}
                    title="Fullscreen"
                  >
                    {isFullscreen ? (
                      <Minimize2 className="w-4 h-4 text-sky-300" />
                    ) : (
                      <Maximize2 className="w-4 h-4 text-sky-300" />
                    )}
                  </button>
                  <button
                    onClick={toggleMute}
                    className="p-2 sm:p-2.5 rounded-xl border border-white/20 hover:border-white/50 cursor-pointer"
                    style={{ backgroundColor: 'rgba(10, 15, 28, 0.86)' }}
                    title="Mute / Unmute"
                  >
                    {muted ? (
                      <VolumeX className="w-4 h-4 text-rose-400" />
                    ) : (
                      <Volume2 className="w-4 h-4 text-emerald-400" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Center Countdown */}
            {hud.mode === 'countdown' && (
              <div className="self-center my-auto text-center">
                <div className="text-7xl md:text-9xl font-black italic tracking-tighter text-amber-300 drop-shadow-[0_6px_24px_rgba(0,0,0,0.85)] tabular-nums">
                  {hud.countdownValue > 0 ? hud.countdownValue : 'GO!'}
                </div>
              </div>
            )}

            {/* Floating Kinetic Boost Typography (Rising from bottom-center & fading out, NO big box!) */}
            {hud.boostCallout && (
              <div
                key={hud.boostCallout.id}
                className="animate-boost-word self-center mb-24 sm:mb-28 text-center pointer-events-none"
              >
                <span
                  className="text-3xl md:text-5xl font-black italic uppercase tracking-wider"
                  style={{
                    color: hud.boostCallout.color,
                    textShadow:
                      '0 3px 0 #090d16, 0 -2px 0 #090d16, 3px 0 0 #090d16, -3px 0 0 #090d16, 0 8px 20px rgba(0,0,0,0.75)',
                  }}
                >
                  {hud.boostCallout.text}
                </span>
              </div>
            )}

            {/* Bottom Perimeter: Active Desktop Control Hint (Bottom-Left) */}
            <div className="flex items-end justify-between gap-4">
              {hud.controlMode !== 'mobile_buttons' && hud.controlMode !== 'mobile_joystick' && (
                <div
                  className="hidden md:flex items-center gap-2 rounded-xl border border-white/15 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-300"
                  style={{ backgroundColor: 'rgba(10, 15, 28, 0.72)' }}
                >
                  {hud.controlMode === 'mouse'
                    ? 'Mouse Steer · L-Click Gas · R-Click Drift · Mid/E Item'
                    : hud.controlMode === 'controller'
                    ? 'Controller · A/RT Gas · RB Drift · X/Y Item'
                    : 'WASD/Arrows · Space Drift · E Item · C Rear'}
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
              size={isCompactViewport ? 96 : 134}
            />
          </div>

          {/* Exclusive Circular Touch Overlay (only renders when controlMode is mobile_joystick or mobile_buttons) */}
          <MobileControls
            controlMode={hud.controlMode}
            autoAccel={autoAccel}
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

      {/* ==================== 5. PAUSE & FINISH PODIUM MODAL ==================== */}
      {(hud.mode === 'paused' || hud.mode === 'finished') && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(6, 10, 20, 0.84)' }}
        >
          <div
            className="w-full max-w-lg rounded-3xl border border-white/20 p-6 shadow-2xl space-y-5"
            style={{ backgroundColor: '#0f172a' }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Trophy className="w-7 h-7 text-amber-400" />
                <div>
                  <h2 className="text-2xl font-black uppercase tracking-tight">
                    {hud.mode === 'finished'
                      ? hud.gameMode === 'time_trial'
                        ? 'Time Trial Complete!'
                        : `Finished ${ord.num}${ord.suffix}!`
                      : 'Race Paused'}
                  </h2>
                  <p className="text-xs text-slate-400">
                    Mario Kart Grand Prix · Time {formatTime(hud.raceTimeMs)}
                  </p>
                </div>
              </div>
              <Gamepad2 className="w-5 h-5 text-slate-500" />
            </div>

            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
              {hud.standings.map((row) => (
                <div
                  key={row.id}
                  className={`flex items-center justify-between px-3 py-2 rounded-xl border text-xs ${
                    row.isPlayer
                      ? 'border-amber-400/70 bg-amber-500/15 font-black'
                      : 'border-white/10 bg-slate-900/80 font-semibold'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-5 text-center font-black tabular-nums text-amber-300">
                      #{row.rank}
                    </span>
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: row.color }} />
                    <span>{row.name}</span>
                  </div>
                  <span className="tabular-nums text-slate-300">
                    {row.finished ? formatTime(row.finishTimeMs) : `Lap ${row.lap}/3`}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              {hud.mode === 'paused' ? (
                <button
                  onClick={() => engineRef.current?.setPaused(false)}
                  className="flex-1 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Play className="w-4 h-4" />
                  <span>Resume</span>
                </button>
              ) : (
                <>
                  {hud.hasReplay && (
                    <button
                      onClick={() => engineRef.current?.startReplay()}
                      className="flex-1 py-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Film className="w-4 h-4" />
                      <span>Race Replay</span>
                    </button>
                  )}
                  <button
                    onClick={triggerSoloRace}
                    className="flex-1 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Race Again</span>
                  </button>
                </>
              )}

              <button
                onClick={handleReturnToPaddock}
                className="flex-1 py-3 rounded-xl border border-white/20 bg-slate-800 hover:bg-slate-700 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Paddock</span>
              </button>

              <button
                onClick={handleReturnToTitle}
                className="px-4 py-3 rounded-xl border border-white/15 bg-slate-900 hover:bg-slate-800 text-slate-300 font-black text-xs uppercase tracking-wider cursor-pointer"
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
