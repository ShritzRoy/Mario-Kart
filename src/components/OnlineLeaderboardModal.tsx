import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Crown, Flame, Medal, RefreshCw, Timer, Trophy, X } from 'lucide-react';
import { fetchLeaderboard, type LeaderboardEntry } from '../services/cloudSave.ts';

interface OnlineLeaderboardModalProps {
  open: boolean;
  onClose: () => void;
  currentUsername: string;
}

type TabType = 'level' | 'playtime' | 'wins';

export function OnlineLeaderboardModal({
  open,
  onClose,
  currentUsername,
}: OnlineLeaderboardModalProps) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<TabType>('level');

  const loadData = async () => {
    setLoading(true);
    const data = await fetchLeaderboard();
    setEntries(data);
    setLoading(false);
  };

  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open]);

  if (!open) return null;

  const sortedEntries = [...entries].sort((a, b) => {
    if (activeTab === 'playtime') return b.playtimeSeconds - a.playtimeSeconds;
    if (activeTab === 'wins') return b.wins - a.wins;
    if (b.level !== a.level) return b.level - a.level;
    return b.xp - a.xp;
  });

  const myEntry = entries.find(
    (e) => e.username.toLowerCase() === currentUsername.toLowerCase()
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md font-mk animate-in fade-in duration-200">
      <motion.div
        initial={{ y: 80, opacity: 0, scale: 0.95 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 80, opacity: 0, scale: 0.95 }}
        transition={{ type: 'spring', damping: 22, stiffness: 280 }}
        className="relative w-full max-w-2xl max-h-[90vh] rounded-3xl border-4 border-white/40 shadow-2xl flex flex-col overflow-hidden text-white"
        style={{ backgroundColor: 'rgba(12, 18, 38, 0.94)' }}
      >
        {/* Top Header Banner with Mario Kart Gold Theme */}
        <div
          className="relative px-6 py-3.5 border-b-2 border-white/30 flex items-center justify-between"
          style={{
            background: 'linear-gradient(90deg, #f59e0b, #facc15, #f59e0b)',
          }}
        >
          <div className="flex items-center gap-2.5 text-slate-950">
            <Trophy className="w-6 h-6 sm:w-7 sm:h-7" />
            <h2 className="font-mk text-xl sm:text-2xl uppercase tracking-wider text-slate-950">
              Global Cloud Leaderboard
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadData}
              disabled={loading}
              title="Refresh Leaderboard"
              className="p-1.5 rounded-xl bg-slate-950/20 hover:bg-slate-950/40 text-slate-950 transition cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-slate-950/20 hover:bg-slate-950/40 text-slate-950 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="px-4 pt-3 pb-2 flex flex-wrap items-center justify-between gap-2 border-b border-white/15 bg-slate-950/40">
          <div className="flex items-center gap-1.5">
            {[
              { id: 'level' as const, label: 'Highest Level & XP', icon: Crown },
              { id: 'playtime' as const, label: 'Total Playtime', icon: Timer },
              { id: 'wins' as const, label: 'Most Wins', icon: Medal },
            ].map((tab) => {
              const active = activeTab === tab.id;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-mk uppercase tracking-wider flex items-center gap-1.5 transition cursor-pointer ${
                    active
                      ? 'bg-amber-400 text-slate-950 shadow-md font-bold'
                      : 'bg-white/10 text-white/80 hover:bg-white/20'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
          <span className="text-[11px] text-cyan-300 mk-stroke-sm">
            {sortedEntries.length} Racers Cloud-Saved
          </span>
        </div>

        {/* Leaderboard Table / Rows */}
        <div className="flex-1 overflow-y-auto no-scrollbar p-3 space-y-1.5">
          {sortedEntries.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <RefreshCw className="w-8 h-8 mx-auto mb-2 animate-spin text-amber-400" />
              <p>Fetching online cloud scores...</p>
            </div>
          ) : (
            sortedEntries.map((row, idx) => {
              const rank = idx + 1;
              const isMe = row.username.toLowerCase() === currentUsername.toLowerCase();
              return (
                <div
                  key={`${row.username}_${idx}`}
                  className={`px-3.5 py-2.5 rounded-2xl border flex items-center justify-between gap-3 transition ${
                    isMe
                      ? 'border-amber-300 bg-amber-400/20 shadow-[0_0_16px_rgba(250,204,21,0.4)]'
                      : 'border-white/15 bg-white/5 hover:bg-white/10'
                  }`}
                >
                  {/* Left: Rank & Username */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl font-mk text-xs sm:text-sm flex items-center justify-center shrink-0 shadow ${
                        rank === 1
                          ? 'bg-amber-400 text-slate-950 font-bold border-2 border-white'
                          : rank === 2
                          ? 'bg-slate-300 text-slate-950 font-bold border-2 border-white'
                          : rank === 3
                          ? 'bg-amber-700 text-white font-bold border-2 border-white'
                          : 'bg-slate-800 text-white/80'
                      }`}
                    >
                      {rank}
                    </div>

                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mk text-sm sm:text-base uppercase tracking-wider text-white truncate">
                          {row.username}
                        </span>
                        {isMe && (
                          <span className="px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-950 text-[9px] uppercase font-bold">
                            YOU
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-white/60">
                        <span>{row.racesCompleted} races</span>
                        <span>·</span>
                        <span className="text-emerald-400 font-bold">{row.wins} wins</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Level Badge & Active Stat */}
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-950/70 border border-white/20">
                      <Flame className="w-3.5 h-3.5 text-amber-400" />
                      <span className="font-mk text-xs sm:text-sm uppercase text-amber-300">
                        LVL {row.level}
                      </span>
                    </div>

                    <div className="text-right min-w-[70px]">
                      {activeTab === 'playtime' ? (
                        <div className="text-xs sm:text-sm text-cyan-300 font-mk">
                          {row.playtimeFormatted}
                        </div>
                      ) : activeTab === 'wins' ? (
                        <div className="text-xs sm:text-sm text-emerald-300 font-mk">
                          {row.wins} 1st
                        </div>
                      ) : (
                        <div className="text-xs sm:text-sm text-amber-200 font-mk">
                          {row.xp} XP
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Bottom Current Player Summary Card */}
        {myEntry && (
          <div className="p-3 border-t-2 border-white/20 bg-slate-950/70 flex items-center justify-between text-xs sm:text-sm">
            <span className="text-white/70">
              Your Cloud Rank:{' '}
              <strong className="text-amber-300 font-mk text-base">
                #{sortedEntries.findIndex((e) => e.username.toLowerCase() === currentUsername.toLowerCase()) + 1}
              </strong>
            </span>
            <span className="text-white/70">
              Level <strong className="text-amber-300 font-mk">{myEntry.level}</strong> ({myEntry.xp} XP) · {myEntry.playtimeFormatted}
            </span>
          </div>
        )}
      </motion.div>
    </div>
  );
}
