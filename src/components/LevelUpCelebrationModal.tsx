import { Crown, Sparkles, Trophy } from 'lucide-react';

interface LevelUpCelebrationModalProps {
  newLevel: number;
  onDismiss: () => void;
}

export function LevelUpCelebrationModal({ newLevel, onDismiss }: LevelUpCelebrationModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in zoom-in-95 duration-200 font-mk">
      <div
        className="relative max-w-sm w-full rounded-3xl border-4 border-amber-300 p-6 text-center text-white shadow-2xl space-y-4"
        style={{
          background: 'radial-gradient(circle at center, #1e1b4b 0%, #0f172a 100%)',
          boxShadow: '0 0 50px rgba(250, 204, 21, 0.65)',
        }}
      >
        <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-tr from-amber-400 to-amber-200 border-4 border-white flex items-center justify-center text-slate-950 shadow-2xl animate-bounce">
          <Crown className="w-10 h-10 text-amber-950" />
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-center gap-1.5 text-amber-300 text-xs tracking-widest uppercase">
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>LEVEL PROGRESSION</span>
            <Sparkles className="w-4 h-4 text-amber-300" />
          </div>
          <h2 className="font-mk text-3xl uppercase tracking-wider text-amber-300 mk-stroke">
            LEVEL UP!
          </h2>
          <p className="font-mk text-lg uppercase tracking-wide text-white">
            You reached <span className="text-amber-300 font-bold">LEVEL {newLevel}</span>!
          </p>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          Your cloud rank increased on the Global Online Leaderboard! Keep racing to unlock new vehicle stats and badges!
        </p>

        <button
          onClick={onDismiss}
          className="w-full py-3 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-mk text-base uppercase tracking-wider font-bold shadow-xl cursor-pointer transition"
        >
          Awesome! Continue
        </button>
      </div>
    </div>
  );
}
