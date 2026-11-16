import { useState } from 'react';
import { Check, Cloud, Crown, Edit2, Timer } from 'lucide-react';
import type { CloudPlayerProfile } from '../shared/protocol.ts';

interface RacerProfileHeaderProps {
  profile: CloudPlayerProfile;
  onUpdateUsername: (newUsername: string) => void;
}

export function RacerProfileHeader({ profile, onUpdateUsername }: RacerProfileHeaderProps) {
  const [editing, setEditing] = useState(false);
  const [inputVal, setInputVal] = useState(profile.username);

  const handleSave = () => {
    const clean = (inputVal || 'Racer').trim().slice(0, 16);
    if (clean) {
      onUpdateUsername(clean);
    }
    setEditing(false);
  };

  const nextReq = 100 + profile.level * 50;
  const progressPct = Math.min(100, Math.round((profile.xp / nextReq) * 100));

  const hours = Math.floor(profile.playtimeSeconds / 3600);
  const minutes = Math.floor((profile.playtimeSeconds % 3600) / 60);
  const playtimeStr = `${hours}h ${minutes}m`;

  return (
    <div
      className="pointer-events-auto rounded-2xl border-2 border-white/35 px-3 py-1.5 sm:px-4 sm:py-2 flex items-center gap-2.5 sm:gap-3.5 shadow-2xl backdrop-blur-md font-mk"
      style={{ backgroundColor: 'rgba(10, 15, 30, 0.72)' }}
    >
      {/* Level Star Badge */}
      <div className="relative shrink-0 flex items-center justify-center">
        <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-amber-300 via-amber-400 to-amber-600 border-2 border-white flex flex-col items-center justify-center shadow-lg text-slate-950">
          <Crown className="w-3.5 h-3.5 text-amber-950" />
          <span className="text-[10px] sm:text-xs font-mk uppercase leading-none">
            {profile.level}
          </span>
        </div>
      </div>

      {/* Center Details: Username & XP Bar */}
      <div className="flex flex-col min-w-0">
        <div className="flex items-center gap-1.5">
          {editing ? (
            <div className="flex items-center gap-1">
              <input
                type="text"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSave();
                  else if (e.key === 'Escape') setEditing(false);
                }}
                autoFocus
                maxLength={16}
                className="w-28 sm:w-36 px-2 py-0.5 rounded bg-slate-900 border border-amber-300 text-xs sm:text-sm font-mk text-amber-300 uppercase outline-none"
              />
              <button
                onClick={handleSave}
                className="p-1 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 cursor-pointer"
                title="Save Username"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 group cursor-pointer" onClick={() => setEditing(true)}>
              <span className="font-mk text-sm sm:text-base uppercase tracking-wider text-white mk-stroke-sm truncate">
                {profile.username}
              </span>
              <button
                className="text-white/60 group-hover:text-amber-300 transition"
                title="Change Username"
              >
                <Edit2 className="w-3 h-3" />
              </button>
            </div>
          )}

          <div className="hidden sm:flex items-center gap-1 text-[9px] text-sky-300 bg-sky-950/60 px-1.5 py-0.5 rounded-full border border-sky-400/30">
            <Cloud className="w-2.5 h-2.5" />
            <span>CLOUD SYNC</span>
          </div>
        </div>

        {/* Dynamic XP Progress Bar */}
        <div className="flex items-center gap-1.5 pt-0.5">
          <div className="w-24 sm:w-36 h-2 rounded-full bg-slate-950/80 border border-white/25 overflow-hidden p-0.5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-200 transition-all duration-300 shadow-[0_0_8px_rgba(250,204,21,0.6)]"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <span className="text-[9px] text-amber-300/90 whitespace-nowrap">
            {profile.xp} / {nextReq} XP
          </span>
        </div>
      </div>

      {/* Playtime Badge on Right */}
      <div className="hidden md:flex flex-col items-end pl-2 border-l border-white/20 text-right">
        <span className="text-[9px] uppercase tracking-wider text-white/60">Playtime</span>
        <div className="flex items-center gap-1 font-mk text-xs text-emerald-300 mk-stroke-sm">
          <Timer className="w-3 h-3" />
          <span>{playtimeStr}</span>
        </div>
      </div>
    </div>
  );
}
