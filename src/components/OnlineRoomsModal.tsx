import { useEffect, useState } from 'react';
import {
  Check,
  Copy,
  LogOut,
  Play,
  Plus,
  RefreshCw,
  Sparkles,
  Users,
  Wifi,
  X,
} from 'lucide-react';
import { fetchHostedRooms } from '../services/cloudSave.ts';
import type { HostedRoomSummary, NetRoomSnapshot } from '../shared/protocol.ts';

interface OnlineRoomsModalProps {
  open: boolean;
  onClose: () => void;
  playerName: string;
  onPlayerNameChange: (name: string) => void;
  connected: boolean;
  room: NetRoomSnapshot | null;
  localPlayerId?: string;
  onCreateRoom: (code?: string) => void;
  onJoinRoom: (code: string) => void;
  onLeaveRoom: () => void;
  onStartRace: () => void;
}

export function OnlineRoomsModal({
  open,
  onClose,
  playerName,
  onPlayerNameChange,
  connected,
  room,
  localPlayerId,
  onCreateRoom,
  onJoinRoom,
  onLeaveRoom,
  onStartRace,
}: OnlineRoomsModalProps) {
  const [hostedRooms, setHostedRooms] = useState<HostedRoomSummary[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [customCodeInput, setCustomCodeInput] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);

  const loadRooms = async () => {
    setLoadingRooms(true);
    const list = await fetchHostedRooms();
    setHostedRooms(list);
    setLoadingRooms(false);
  };

  useEffect(() => {
    if (open) {
      loadRooms();
    }
  }, [open]);

  if (!open) return null;

  const isHost = Boolean(room?.players.find((p) => p.id === localPlayerId)?.isHost);

  const handleCopy = () => {
    if (room?.roomCode) {
      navigator.clipboard?.writeText(room.roomCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md font-mk animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-xl max-h-[90vh] rounded-3xl border-4 border-white/40 shadow-2xl flex flex-col overflow-hidden text-white"
        style={{ backgroundColor: 'rgba(10, 15, 34, 0.95)' }}
      >
        {/* Header */}
        <div
          className="px-5 py-3.5 border-b-2 border-white/25 flex items-center justify-between"
          style={{ background: 'linear-gradient(90deg, #38bdf8, #0ea5e9, #0284c7)' }}
        >
          <div className="flex items-center gap-2 text-slate-950">
            <Wifi className="w-6 h-6 text-slate-950" />
            <h2 className="font-mk text-xl sm:text-2xl uppercase tracking-wider text-slate-950">
              Mario Kart Online Rooms
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-950/20 hover:bg-slate-950/40 text-slate-950 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-5 flex-1 overflow-y-auto no-scrollbar space-y-4">
          {/* Driver Name Input */}
          <div className="rounded-2xl p-3 border border-white/15 bg-white/5 flex flex-wrap items-center justify-between gap-2">
            <label className="text-xs uppercase text-amber-300 tracking-wider">
              Your Driver Name:
            </label>
            <input
              type="text"
              value={playerName}
              onChange={(e) => onPlayerNameChange(e.target.value)}
              maxLength={14}
              className="px-3 py-1 rounded-xl bg-slate-900 border border-white/30 text-white font-mk uppercase text-sm outline-none focus:border-amber-300 w-44"
            />
          </div>

          {connected && room ? (
            /* Current Room Lobby View */
            <div className="rounded-2xl border-2 border-emerald-400/40 p-4 bg-emerald-950/20 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <span className="text-[10px] uppercase text-emerald-400 tracking-wider font-bold">
                    Connected Room
                  </span>
                  <div className="font-mk text-2xl uppercase text-amber-300 tracking-widest flex items-center gap-2">
                    <span>{room.roomCode}</span>
                    <button
                      onClick={handleCopy}
                      className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-xs text-white flex items-center gap-1 cursor-pointer"
                      title="Copy Code"
                    >
                      {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-xl bg-white/10 text-xs font-mk uppercase">
                    {room.players.length} / 8 Racers
                  </span>
                  <button
                    onClick={onLeaveRoom}
                    className="p-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/40 text-rose-300 transition cursor-pointer"
                    title="Leave Room"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Roster of joined players */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] uppercase text-white/60 tracking-wider">
                  Joined Racers in Room:
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  {room.players.map((p) => (
                    <div
                      key={p.id}
                      className="px-2.5 py-1.5 rounded-xl bg-slate-900/80 border border-white/15 flex items-center justify-between text-xs"
                    >
                      <span className="font-mk uppercase text-white truncate">
                        {p.name} {p.id === localPlayerId ? '(You)' : ''}
                      </span>
                      {p.isHost && (
                        <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-amber-400 text-slate-950 font-bold">
                          HOST
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {isHost ? (
                <button
                  onClick={() => {
                    onStartRace();
                    onClose();
                  }}
                  className="w-full py-3 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-mk text-base uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg cursor-pointer transition font-bold"
                >
                  <Play className="w-5 h-5 fill-slate-950" />
                  <span>Launch Multiplayer Race</span>
                </button>
              ) : (
                <div className="py-2.5 text-center text-xs text-amber-200/90 font-mk uppercase">
                  Waiting for Host to launch race...
                </div>
              )}
            </div>
          ) : (
            /* Browse Live Rooms on Game Cloud Server */
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-cyan-300" />
                  <span className="font-mk text-sm uppercase tracking-wide text-cyan-300">
                    Live Game Cloud Rooms
                  </span>
                </div>
                <button
                  onClick={loadRooms}
                  disabled={loadingRooms}
                  className="text-xs text-white/70 hover:text-white flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingRooms ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>
              </div>

              <div className="space-y-2 max-h-52 overflow-y-auto no-scrollbar">
                {hostedRooms.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-400">
                    No active rooms. Create your own room below!
                  </div>
                ) : (
                  hostedRooms.map((hr) => (
                    <div
                      key={hr.roomCode}
                      className="p-3 rounded-2xl border border-white/20 bg-white/5 hover:bg-white/10 flex items-center justify-between gap-2 transition"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mk text-base uppercase tracking-widest text-amber-300">
                            {hr.roomCode}
                          </span>
                          <span className="text-[10px] text-white/60">
                            Host: {hr.hostName}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-300 truncate">
                          {hr.mapName} · {hr.weatherChoice}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs font-mk text-cyan-300">
                          {hr.playerCount}/8
                        </span>
                        <button
                          onClick={() => {
                            onJoinRoom(hr.roomCode);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-mk text-xs uppercase tracking-wider font-bold cursor-pointer transition shadow"
                        >
                          Join
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Host or Join by Code */}
              <div className="pt-2 border-t border-white/15 space-y-2.5">
                <span className="text-[10px] uppercase text-white/60 tracking-wider">
                  Or Join / Host Private Room by Code:
                </span>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customCodeInput}
                    onChange={(e) => setCustomCodeInput(e.target.value.toUpperCase())}
                    placeholder="ENTER CODE"
                    maxLength={6}
                    className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-white/30 text-white font-mk uppercase text-center text-sm outline-none focus:border-amber-300"
                  />
                  <button
                    onClick={() => {
                      if (customCodeInput.trim()) onJoinRoom(customCodeInput.trim());
                    }}
                    disabled={!customCodeInput.trim()}
                    className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-slate-950 font-mk text-xs uppercase tracking-wider font-bold cursor-pointer"
                  >
                    Join Code
                  </button>
                </div>

                <button
                  onClick={() => onCreateRoom()}
                  className="w-full py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-mk text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer font-bold shadow-md"
                >
                  <Plus className="w-4 h-4" />
                  <span>Host New Room</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
