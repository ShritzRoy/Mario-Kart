import { useEffect, useState } from 'react';

interface PixelFlagTransitionProps {
  active: boolean;
  onMidpoint?: () => void;
  onComplete?: () => void;
}

const COLS = 20;
const ROWS = 12;

export function PixelFlagTransition({
  active,
  onMidpoint,
  onComplete,
}: PixelFlagTransitionProps) {
  const [phase, setPhase] = useState<'idle' | 'sweep' | 'fadeout'>('idle');

  useEffect(() => {
    if (!active) {
      setPhase('idle');
      return;
    }
    setPhase('sweep');
    const midTimer = window.setTimeout(() => {
      onMidpoint?.();
      setPhase('fadeout');
    }, 680);
    const endTimer = window.setTimeout(() => {
      setPhase('idle');
      onComplete?.();
    }, 1250);

    return () => {
      clearTimeout(midTimer);
      clearTimeout(endTimer);
    };
  }, [active, onMidpoint, onComplete]);

  if (phase === 'idle') return null;

  return (
    <div
      className="fixed inset-0 z-50 pointer-events-none overflow-hidden transition-opacity duration-500"
      style={{
        opacity: phase === 'fadeout' ? 0 : 1,
      }}
      aria-hidden="true"
    >
      <div
        className="w-full h-full grid"
        style={{
          gridTemplateColumns: `repeat(${COLS}, 1fr)`,
          gridTemplateRows: `repeat(${ROWS}, 1fr)`,
        }}
      >
        {Array.from({ length: ROWS * COLS }).map((_, i) => {
          const r = Math.floor(i / COLS);
          const c = i % COLS;
          const isWhite = (r + c) % 2 === 0;
          const waveOffset = Math.sin(r * 0.65) * 45;
          const delayMs = c * 22 + Math.max(0, waveOffset);

          return (
            <div
              key={i}
              style={{
                backgroundColor: isWhite ? '#f8fafc' : '#090d16',
                transform: phase === 'sweep' ? 'translateX(0%) scale(1.03)' : 'translateX(8%) scale(1)',
                opacity: 1,
                animation: `pixelFlagWipe 320ms cubic-bezier(0.22, 1, 0.36, 1) ${delayMs}ms both`,
              }}
            />
          );
        })}
      </div>
      <style>{`
        @keyframes pixelFlagWipe {
          0% {
            transform: translateX(-100vw) scale(0.9);
            opacity: 0;
          }
          60% {
            opacity: 1;
          }
          100% {
            transform: translateX(0) scale(1.03);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
