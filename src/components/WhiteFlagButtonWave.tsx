interface WhiteFlagButtonWaveProps {
  active: boolean;
  compact?: boolean;
}

/**
 * Animated fluttering white & silver-checkered racing flag wave
 * rendered behind active Start Menu buttons and Character Selection tiles.
 */
export function WhiteFlagButtonWave({ active, compact = false }: WhiteFlagButtonWaveProps) {
  if (!active) return null;

  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]"
      aria-hidden="true"
    >
      {/* Pure white glowing flag wave sweep */}
      <div
        className="animate-flag-flutter absolute inset-y-0 -left-4 -right-4"
        style={{
          background:
            'linear-gradient(95deg, rgba(255,255,255,0.92) 0%, rgba(248,250,252,0.78) 45%, rgba(226,232,240,0.35) 78%, rgba(255,255,255,0) 100%)',
        }}
      />
      {/* Animated subtle waving flag stripes */}
      <svg
        className="animate-flag-slide absolute inset-y-0 left-0 h-full w-[160%] opacity-35"
        viewBox={compact ? '0 0 120 60' : '0 0 260 72'}
        preserveAspectRatio="none"
      >
        <defs>
          <pattern
            id={compact ? 'wfPatCompact' : 'wfPatWide'}
            width="16"
            height="16"
            patternUnits="userSpaceOnUse"
          >
            <rect width="8" height="8" fill="#ffffff" />
            <rect x="8" width="8" height="8" fill="#cbd5e1" />
            <rect y="8" width="8" height="8" fill="#cbd5e1" />
            <rect x="8" y="8" width="8" height="8" fill="#ffffff" />
          </pattern>
        </defs>
        <path
          d={
            compact
              ? 'M0,0 Q30,10 60,2 T120,4 L120,60 Q90,50 60,58 T0,56 Z'
              : 'M0,0 Q65,12 130,3 T260,5 L260,72 Q195,60 130,68 T0,66 Z'
          }
          fill={`url(#${compact ? 'wfPatCompact' : 'wfPatWide'})`}
        />
      </svg>
    </div>
  );
}
