import type { RacerSpec } from '../game/roster.ts';

interface CharacterPortraitProps {
  spec: RacerSpec;
  size?: number;
}

export function CharacterPortrait({ spec, size = 46 }: CharacterPortraitProps) {
  const s = spec;

  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className="block drop-shadow-md">
      {/* Species-specific sculpted head portrait */}
      {s.species === 'human_cap' && (
        <g>
          {/* Face */}
          <circle cx="32" cy="36" r="18" fill={s.skinColor} stroke="#0f172a" strokeWidth="2.4" />
          {/* Ears */}
          <circle cx="14" cy="37" r="4.5" fill={s.skinColor} stroke="#0f172a" strokeWidth="2" />
          <circle cx="50" cy="37" r="4.5" fill={s.skinColor} stroke="#0f172a" strokeWidth="2" />
          {/* Cap */}
          <path d="M12 29 C12 13, 52 13, 52 29 Z" fill={s.primaryColor} stroke="#0f172a" strokeWidth="2.4" />
          <ellipse cx="32" cy="29" rx="22" ry="5" fill={s.primaryColor} stroke="#0f172a" strokeWidth="2.2" />
          <circle cx="32" cy="20" r="6.5" fill="#ffffff" />
          <text x="32" y="23" textAnchor="middle" fontSize="9.5" fontWeight="900" fill={s.primaryColor}>
            {s.emblem}
          </text>
          {/* Eyes */}
          <ellipse cx="25" cy="36" rx="2.6" ry="3.8" fill="#0f172a" />
          <ellipse cx="39" cy="36" rx="2.6" ry="3.8" fill="#0f172a" />
          <circle cx="24.2" cy="34.8" r="1" fill="#ffffff" />
          <circle cx="38.2" cy="34.8" r="1" fill="#ffffff" />
          {/* Mustache & Nose */}
          <path d="M19 44 Q26 49 32 45 Q38 49 45 44 Q42 40 32 42 Q22 40 19 44 Z" fill="#1e1b18" />
          <ellipse cx="32" cy="40.5" rx="5.5" ry="4.2" fill="#f5a97f" stroke="#0f172a" strokeWidth="1.8" />
        </g>
      )}

      {s.species === 'princess' && (
        <g>
          {/* Back Hair */}
          <ellipse cx="32" cy="34" rx="22" ry="20" fill={s.id === 'daisy' ? '#b45309' : s.id === 'rosalina' ? '#bae6fd' : '#fde047'} stroke="#0f172a" strokeWidth="2.2" />
          {/* Face */}
          <circle cx="32" cy="37" r="16" fill={s.skinColor} stroke="#0f172a" strokeWidth="2.2" />
          {/* Bangs */}
          <path d="M16 32 Q24 20 32 25 Q40 20 48 32 Q39 26 32 28 Q25 26 16 32 Z" fill={s.id === 'daisy' ? '#b45309' : s.id === 'rosalina' ? '#bae6fd' : '#fde047'} stroke="#0f172a" strokeWidth="1.8" />
          {/* Crown */}
          <polygon points="22,20 25,9 32,16 39,9 42,20" fill="#facc15" stroke="#0f172a" strokeWidth="2" />
          <circle cx="32" cy="15" r="2.2" fill={s.primaryColor} />
          {/* Eyes */}
          <ellipse cx="25.5" cy="38" rx="2.6" ry="3.8" fill="#0284c7" />
          <ellipse cx="38.5" cy="38" rx="2.6" ry="3.8" fill="#0284c7" />
          <circle cx="24.8" cy="36.8" r="1.1" fill="#ffffff" />
          <circle cx="37.8" cy="36.8" r="1.1" fill="#ffffff" />
          {/* Lips */}
          <ellipse cx="32" cy="47" rx="3" ry="1.6" fill="#fb7185" />
        </g>
      )}

      {s.species === 'dino' && (
        <g>
          <path d="M22 14 L27 20 L20 22 Z" fill="#ef4444" stroke="#0f172a" strokeWidth="1.8" />
          <circle cx="26" cy="25" r="11" fill="#22c55e" stroke="#0f172a" strokeWidth="2.2" />
          <ellipse cx="38" cy="38" rx="16" ry="13" fill="#22c55e" stroke="#0f172a" strokeWidth="2.4" />
          <ellipse cx="34" cy="44" rx="12" ry="7" fill="#ffffff" />
          <circle cx="25" cy="23" r="4.5" fill="#ffffff" stroke="#0f172a" strokeWidth="1.8" />
          <circle cx="33" cy="23" r="4.5" fill="#ffffff" stroke="#0f172a" strokeWidth="1.8" />
          <circle cx="26" cy="23" r="2" fill="#0f172a" />
          <circle cx="34" cy="23" r="2" fill="#0f172a" />
        </g>
      )}

      {s.species === 'toad' && (
        <g>
          <ellipse cx="32" cy="24" rx="22" ry="16" fill="#ffffff" stroke="#0f172a" strokeWidth="2.4" />
          <circle cx="32" cy="19" r="6" fill="#ef4444" />
          <circle cx="15" cy="24" r="4.5" fill="#ef4444" />
          <circle cx="49" cy="24" r="4.5" fill="#ef4444" />
          <circle cx="32" cy="40" r="14" fill={s.skinColor} stroke="#0f172a" strokeWidth="2.2" />
          <ellipse cx="26.5" cy="39" rx="2.2" ry="3.5" fill="#0f172a" />
          <ellipse cx="37.5" cy="39" rx="2.2" ry="3.5" fill="#0f172a" />
          <path d="M27 46 Q32 50 37 46" fill="none" stroke="#0f172a" strokeWidth="2" strokeLinecap="round" />
        </g>
      )}

      {s.species === 'koopa_troopa' && (
        <g>
          <circle cx="30" cy="24" r="11" fill="#facc15" stroke="#0f172a" strokeWidth="2.2" />
          <ellipse cx="36" cy="39" rx="15" ry="12" fill="#facc15" stroke="#0f172a" strokeWidth="2.4" />
          <ellipse cx="28" cy="23" r="3.8" rx="3" ry="4" fill="#ffffff" stroke="#0f172a" strokeWidth="1.6" />
          <ellipse cx="35" cy="23" r="3.8" rx="3" ry="4" fill="#ffffff" stroke="#0f172a" strokeWidth="1.6" />
          <circle cx="29" cy="23" r="1.6" fill="#0f172a" />
          <circle cx="36" cy="23" r="1.6" fill="#0f172a" />
          <path d="M26 42 Q36 47 45 41" fill="none" stroke="#0f172a" strokeWidth="2" strokeLinecap="round" />
        </g>
      )}

      {s.species === 'shyguy' && (
        <g>
          <circle cx="32" cy="33" r="21" fill="#dc2626" stroke="#0f172a" strokeWidth="2.4" />
          <ellipse cx="32" cy="35" rx="15" ry="17" fill="#f8fafc" stroke="#0f172a" strokeWidth="2.2" />
          <ellipse cx="26" cy="32" rx="3.2" ry="4.8" fill="#0f172a" />
          <ellipse cx="38" cy="32" rx="3.2" ry="4.8" fill="#0f172a" />
          <circle cx="32" cy="44" rx="2.5" ry="3" r="2.6" fill="#0f172a" />
        </g>
      )}

      {s.species === 'boo' && (
        <g>
          <circle cx="32" cy="36" r="19" fill="#f8fafc" stroke="#0f172a" strokeWidth="2.4" />
          <polygon points="22,19 25,9 32,15 39,9 42,19" fill="#facc15" stroke="#0f172a" strokeWidth="2" />
          <circle cx="32" cy="14" r="2.2" fill="#ef4444" />
          <path d="M22 28 L29 31 M42 28 L35 31" stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="26" cy="33" r="2.5" fill="#0f172a" />
          <circle cx="38" cy="33" r="2.5" fill="#0f172a" />
          <path d="M22 42 Q32 51 42 42 Z" fill="#0f172a" />
          <polygon points="25,42 27,46 29,42" fill="#ffffff" />
          <polygon points="35,42 37,46 39,42" fill="#ffffff" />
          <ellipse cx="32" cy="48" rx="4" ry="5" fill="#fb7185" stroke="#0f172a" strokeWidth="1.6" />
        </g>
      )}

      {s.species === 'koopa_king' && (
        <g>
          <path d="M18 20 Q32 8 46 20" fill="#dc2626" stroke="#0f172a" strokeWidth="2.2" />
          <polygon points="16,24 11,13 22,19" fill="#fef3c7" stroke="#0f172a" strokeWidth="2" />
          <polygon points="48,24 53,13 42,19" fill="#fef3c7" stroke="#0f172a" strokeWidth="2" />
          <circle cx="32" cy="35" r="18" fill={s.skinColor} stroke="#0f172a" strokeWidth="2.4" />
          <ellipse cx="32" cy="43" rx="14" ry="9" fill="#fef3c7" stroke="#0f172a" strokeWidth="2" />
          <circle cx="25" cy="31" r="3" fill="#ef4444" />
          <circle cx="39" cy="31" r="3" fill="#ef4444" />
          <circle cx="25" cy="31" r="1.3" fill="#0f172a" />
          <circle cx="39" cy="31" r="1.3" fill="#0f172a" />
          <path d="M23 44 L26 48 L29 44 L35 44 L38 48 L41 44" fill="#ffffff" stroke="#0f172a" strokeWidth="1.5" />
        </g>
      )}

      {s.species === 'kong' && (
        <g>
          <path d="M24 16 Q32 6 40 16 Z" fill="#78350f" stroke="#0f172a" strokeWidth="2.2" />
          <circle cx="32" cy="35" r="19" fill="#78350f" stroke="#0f172a" strokeWidth="2.4" />
          <ellipse cx="32" cy="40" rx="15" ry="12" fill="#e6b89c" stroke="#0f172a" strokeWidth="2" />
          <path d="M20 28 Q32 33 44 28" fill="none" stroke="#451a03" strokeWidth="4" strokeLinecap="round" />
          <circle cx="26" cy="33" r="2.6" fill="#0f172a" />
          <circle cx="38" cy="33" r="2.6" fill="#0f172a" />
          <path d="M23 44 Q32 50 41 44" fill="none" stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" />
        </g>
      )}

      {s.species === 'pacman' && (
        <g>
          <path d="M32,32 L52,22 A21,21 0 1,0 52,42 Z" fill="#facc15" stroke="#0f172a" strokeWidth="2.4" />
          <circle cx="35" cy="21" r="3.5" fill="#0f172a" />
        </g>
      )}

      {s.species === 'ghost' && (
        <g>
          <path d="M14 52 L14 30 A18 18 0 0 1 50 30 L50 52 L44 46 L38 52 L32 46 L26 52 L20 46 Z" fill={s.primaryColor} stroke="#0f172a" strokeWidth="2.4" />
          <ellipse cx="26" cy="30" rx="4.5" ry="5.5" fill="#ffffff" />
          <ellipse cx="38" cy="30" rx="4.5" ry="5.5" fill="#ffffff" />
          <circle cx="27.5" cy="30" r="2.4" fill="#1d4ed8" />
          <circle cx="39.5" cy="30" r="2.4" fill="#1d4ed8" />
        </g>
      )}

      {s.species === 'taiko' && (
        <g>
          <circle cx="32" cy="34" r="20" fill="#fb7185" stroke="#0f172a" strokeWidth="2.4" />
          <circle cx="32" cy="34" r="15" fill="#fef3c7" stroke="#0f172a" strokeWidth="2" />
          <circle cx="26" cy="31" r="2.4" fill="#0f172a" />
          <circle cx="38" cy="31" r="2.4" fill="#0f172a" />
          <path d="M26 39 Q32 45 38 39" fill="none" stroke="#0f172a" strokeWidth="2.4" strokeLinecap="round" />
        </g>
      )}
    </svg>
  );
}
