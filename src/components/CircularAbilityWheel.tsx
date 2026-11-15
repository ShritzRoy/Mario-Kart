import { useEffect, useState } from 'react';
import type { ItemKind } from '../shared/protocol.ts';

export type DeviceTier = 'mobile' | 'tablet' | 'desktop';

interface CircularAbilityWheelProps {
  heldItem: ItemKind;
  rouletteActive: boolean;
  deviceTier: DeviceTier;
  onUseItem?: () => void;
}

const SLOT_ORDER: Exclude<ItemKind, 'none'>[] = [
  'mushroom',
  'shell',
  'banana',
  'star',
  'golden_flower',
  'super_bell',
  'p_balloon',
  'mini_mushroom',
  'double_cherry',
  'bee_mushroom',
  'blue_shell',
  'elephant_fruit',
  'drill_mushroom',
  'purple_shell',
  'cannon_box',
  'cloud_flower',
];

export function itemVisual(item: ItemKind): { name: string; color: string; ring: string } {
  switch (item) {
    case 'mushroom':
      return { name: 'TURBO SHROOM', color: '#ef4444', ring: '#fca5a5' };
    case 'shell':
      return { name: 'GREEN SHELL', color: '#22c55e', ring: '#86efac' };
    case 'banana':
      return { name: 'BANANA PEEL', color: '#eab308', ring: '#fde047' };
    case 'star':
      return { name: 'SUPER STAR', color: '#f59e0b', ring: '#fef08a' };
    case 'golden_flower':
      return { name: 'GOLDEN FLOWER', color: '#f59e0b', ring: '#fde047' };
    case 'super_bell':
      return { name: 'SUPER BELL', color: '#eab308', ring: '#fef08a' };
    case 'p_balloon':
      return { name: 'P-BALLOON SHIELD', color: '#0ea5e9', ring: '#7dd3fc' };
    case 'mini_mushroom':
      return { name: 'MINI SHROOM', color: '#38bdf8', ring: '#bae6fd' };
    case 'double_cherry':
      return { name: 'DOUBLE CHERRY', color: '#ec4899', ring: '#f9a8d4' };
    case 'bee_mushroom':
      return { name: 'BEE MUSHROOM', color: '#eab308', ring: '#fef08a' };
    case 'blue_shell':
      return { name: 'SPINY BLUE SHELL', color: '#2563eb', ring: '#93c5fd' };
    case 'elephant_fruit':
      return { name: 'ELEPHANT FRUIT', color: '#f43f5e', ring: '#fda4af' };
    case 'drill_mushroom':
      return { name: 'DRILL MUSHROOM', color: '#64748b', ring: '#cbd5e1' };
    case 'purple_shell':
      return { name: 'POISON SHELL', color: '#9333ea', ring: '#d8b4fe' };
    case 'cannon_box':
      return { name: 'CANNON BOX', color: '#475569', ring: '#94a3b8' };
    case 'cloud_flower':
      return { name: 'CLOUD FLOWER', color: '#38bdf8', ring: '#e0f2fe' };
    default:
      return { name: 'NO ITEM', color: '#475569', ring: '#94a3b8' };
  }
}

export function ItemSvgIcon({ item, iconSize }: { item: ItemKind; iconSize: number }) {
  switch (item) {
    case 'mushroom':
      return (
        <svg width={iconSize} height={iconSize} viewBox="0 0 40 40">
          <path d="M7 22 C7 8 33 8 33 22 Z" fill="#ef4444" stroke="#ffffff" strokeWidth="2.2" />
          <circle cx="15" cy="16" r="3.3" fill="#ffffff" />
          <circle cx="25" cy="16" r="3.3" fill="#ffffff" />
          <rect x="13.5" y="22" width="13" height="10.5" rx="4.5" fill="#fef3c7" stroke="#0f172a" strokeWidth="1.6" />
          <line x1="17.5" y1="25" x2="17.5" y2="28" stroke="#0f172a" strokeWidth="1.8" strokeLinecap="round" />
          <line x1="22.5" y1="25" x2="22.5" y2="28" stroke="#0f172a" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case 'shell':
      return (
        <svg width={iconSize} height={iconSize} viewBox="0 0 40 40">
          <ellipse cx="20" cy="21" rx="13.5" ry="11.5" fill="#22c55e" stroke="#ffffff" strokeWidth="2.2" />
          <path d="M12 19 L20 13 L28 19 L25 27 L15 27 Z" fill="#15803d" stroke="#dcfce7" strokeWidth="1.6" />
          <ellipse cx="20" cy="29.5" rx="11.5" ry="3.2" fill="#fef08a" stroke="#0f172a" strokeWidth="1.2" />
        </svg>
      );
    case 'banana':
      return (
        <svg width={iconSize} height={iconSize} viewBox="0 0 40 40">
          <path
            d="M10 29 C13 13 22 10 29 8 C28 19 25 30 10 29 Z"
            fill="#facc15"
            stroke="#ffffff"
            strokeWidth="2.2"
            strokeLinejoin="round"
          />
          <path d="M27 8 L31 6" stroke="#78350f" strokeWidth="2.4" strokeLinecap="round" />
        </svg>
      );
    case 'star':
      return (
        <svg width={iconSize} height={iconSize} viewBox="0 0 40 40">
          <polygon
            points="20,4.5 24.5,14.2 35.2,15.8 27.4,23.2 29.4,34 20,28.7 10.6,34 12.6,23.2 4.8,15.8 15.5,14.2"
            fill="#facc15"
            stroke="#ffffff"
            strokeWidth="2.2"
            strokeLinejoin="round"
          />
          <line x1="17.5" y1="17.5" x2="17.5" y2="21.5" stroke="#0f172a" strokeWidth="2" strokeLinecap="round" />
          <line x1="22.5" y1="17.5" x2="22.5" y2="21.5" stroke="#0f172a" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case 'golden_flower':
      return (
        <svg width={iconSize} height={iconSize} viewBox="0 0 40 40">
          <rect x="18" y="24" width="4" height="11" rx="2" fill="#22c55e" stroke="#ffffff" strokeWidth="1.2" />
          <ellipse cx="14" cy="30" rx="5" ry="2.5" fill="#4ade80" transform="rotate(-25 14 30)" />
          <ellipse cx="26" cy="30" rx="5" ry="2.5" fill="#4ade80" transform="rotate(25 26 30)" />
          <ellipse cx="20" cy="15.5" rx="12" ry="9" fill="#fbbf24" stroke="#ffffff" strokeWidth="2" />
          <ellipse cx="20" cy="15.5" rx="8" ry="5.5" fill="#fef08a" />
          <ellipse cx="20" cy="15.5" rx="4.5" ry="3" fill="#ffffff" />
          <line x1="18.2" y1="14" x2="18.2" y2="17" stroke="#0f172a" strokeWidth="1.6" strokeLinecap="round" />
          <line x1="21.8" y1="14" x2="21.8" y2="17" stroke="#0f172a" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      );
    case 'super_bell':
      return (
        <svg width={iconSize} height={iconSize} viewBox="0 0 40 40">
          <polygon points="10,14 14,6 18,12" fill="#facc15" stroke="#ffffff" strokeWidth="1.8" />
          <polygon points="30,14 26,6 22,12" fill="#facc15" stroke="#ffffff" strokeWidth="1.8" />
          <path
            d="M11 26 C11 12 29 12 29 26 L32 30 L8 30 Z"
            fill="#facc15"
            stroke="#ffffff"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <circle cx="20" cy="32" r="3" fill="#ca8a04" />
          <line x1="17.5" y1="19" x2="17.5" y2="23" stroke="#0f172a" strokeWidth="2" strokeLinecap="round" />
          <line x1="22.5" y1="19" x2="22.5" y2="23" stroke="#0f172a" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case 'p_balloon':
      return (
        <svg width={iconSize} height={iconSize} viewBox="0 0 40 40">
          <circle cx="20" cy="18.5" r="12.5" fill="#38bdf8" stroke="#ffffff" strokeWidth="2.2" />
          <polygon points="17,31 23,31 20,35.5" fill="#38bdf8" stroke="#ffffff" strokeWidth="1.4" />
          <text x="20" y="23" textAnchor="middle" fill="#fef08a" fontSize="14" fontWeight="900" fontFamily="'Fredoka', sans-serif">
            P
          </text>
        </svg>
      );
    case 'mini_mushroom':
      return (
        <svg width={iconSize} height={iconSize} viewBox="0 0 40 40">
          <path d="M11 23 C11 13 29 13 29 23 Z" fill="#0ea5e9" stroke="#ffffff" strokeWidth="2" />
          <circle cx="16.5" cy="18.5" r="2.5" fill="#ffffff" />
          <circle cx="23.5" cy="18.5" r="2.5" fill="#ffffff" />
          <rect x="15.5" y="23" width="9" height="8" rx="3.5" fill="#fef3c7" stroke="#0f172a" strokeWidth="1.4" />
        </svg>
      );
    case 'double_cherry':
      return (
        <svg width={iconSize} height={iconSize} viewBox="0 0 40 40">
          <path d="M13 22 Q18 10 23 7 Q26 12 27 22" fill="none" stroke="#22c55e" strokeWidth="2.4" strokeLinecap="round" />
          <ellipse cx="26.5" cy="9.5" rx="4.5" ry="2.4" fill="#4ade80" transform="rotate(-18 26.5 9.5)" />
          <circle cx="13.5" cy="26.5" r="7" fill="#ec4899" stroke="#ffffff" strokeWidth="1.8" />
          <circle cx="26.5" cy="26.5" r="7" fill="#f43f5e" stroke="#ffffff" strokeWidth="1.8" />
          <circle cx="11.5" cy="24.5" r="1.6" fill="#ffffff" />
          <circle cx="24.5" cy="24.5" r="1.6" fill="#ffffff" />
        </svg>
      );
    case 'bee_mushroom':
      return (
        <svg width={iconSize} height={iconSize} viewBox="0 0 40 40">
          <path d="M8 22 C8 10 32 10 32 22 Z" fill="#facc15" stroke="#ffffff" strokeWidth="2" />
          <path d="M10 17 H30" stroke="#1e293b" strokeWidth="3.2" />
          <circle cx="11" cy="10" r="2.2" fill="#facc15" stroke="#1e293b" strokeWidth="1.2" />
          <circle cx="29" cy="10" r="2.2" fill="#facc15" stroke="#1e293b" strokeWidth="1.2" />
          <rect x="14" y="22" width="12" height="10" rx="4" fill="#fef3c7" stroke="#0f172a" strokeWidth="1.5" />
        </svg>
      );
    case 'blue_shell':
      return (
        <svg width={iconSize} height={iconSize} viewBox="0 0 40 40">
          <ellipse cx="20" cy="22" rx="13" ry="10.5" fill="#2563eb" stroke="#ffffff" strokeWidth="2" />
          <polygon points="20,6 17,13 23,13" fill="#ffffff" />
          <polygon points="9,15 14,17 12,21" fill="#ffffff" />
          <polygon points="31,15 26,17 28,21" fill="#ffffff" />
          <ellipse cx="20" cy="30" rx="11" ry="3" fill="#f8fafc" />
        </svg>
      );
    case 'elephant_fruit':
      return (
        <svg width={iconSize} height={iconSize} viewBox="0 0 40 40">
          <ellipse cx="10" cy="19" rx="5" ry="7.5" fill="#fda4af" stroke="#ffffff" strokeWidth="1.6" />
          <ellipse cx="30" cy="19" rx="5" ry="7.5" fill="#fda4af" stroke="#ffffff" strokeWidth="1.6" />
          <circle cx="20" cy="21" r="10.5" fill="#f43f5e" stroke="#ffffff" strokeWidth="2" />
          <path d="M18 22 Q20 33 25 31" fill="none" stroke="#fda4af" strokeWidth="4.2" strokeLinecap="round" />
          <circle cx="16.5" cy="18.5" r="1.5" fill="#ffffff" />
          <circle cx="23.5" cy="18.5" r="1.5" fill="#ffffff" />
        </svg>
      );
    case 'drill_mushroom':
      return (
        <svg width={iconSize} height={iconSize} viewBox="0 0 40 40">
          <polygon points="20,4 32,22 8,22" fill="#94a3b8" stroke="#ffffff" strokeWidth="2" strokeLinejoin="round" />
          <line x1="14" y1="13" x2="26" y2="13" stroke="#334155" strokeWidth="2" />
          <line x1="11" y1="18" x2="29" y2="18" stroke="#334155" strokeWidth="2" />
          <rect x="14" y="22" width="12" height="10" rx="4" fill="#fbbf24" stroke="#0f172a" strokeWidth="1.5" />
        </svg>
      );
    case 'purple_shell':
      return (
        <svg width={iconSize} height={iconSize} viewBox="0 0 40 40">
          <ellipse cx="20" cy="21" rx="13.5" ry="11.5" fill="#9333ea" stroke="#ffffff" strokeWidth="2.2" />
          <path d="M12 19 L20 13 L28 19 L25 27 L15 27 Z" fill="#6b21a8" stroke="#a3e635" strokeWidth="1.6" />
          <ellipse cx="20" cy="29.5" rx="11.5" ry="3.2" fill="#a3e635" stroke="#0f172a" strokeWidth="1.2" />
        </svg>
      );
    case 'cannon_box':
      return (
        <svg width={iconSize} height={iconSize} viewBox="0 0 40 40">
          <rect x="8" y="10" width="22" height="20" rx="3" fill="#1e293b" stroke="#ffffff" strokeWidth="2" />
          <circle cx="25" cy="20" r="7.5" fill="#475569" stroke="#cbd5e1" strokeWidth="2" />
          <circle cx="25" cy="20" r="3.8" fill="#090d16" />
        </svg>
      );
    case 'cloud_flower':
      return (
        <svg width={iconSize} height={iconSize} viewBox="0 0 40 40">
          <rect x="18" y="23" width="4" height="11" rx="2" fill="#22c55e" />
          <circle cx="14" cy="17" r="6" fill="#ffffff" stroke="#38bdf8" strokeWidth="1.8" />
          <circle cx="26" cy="17" r="6" fill="#ffffff" stroke="#38bdf8" strokeWidth="1.8" />
          <circle cx="20" cy="13" r="7" fill="#ffffff" stroke="#38bdf8" strokeWidth="1.8" />
          <circle cx="20" cy="17.5" r="4" fill="#e0f2fe" />
        </svg>
      );
    default:
      return <span className="font-mk text-xl text-slate-400">—</span>;
  }
}

export function CircularAbilityWheel({
  heldItem,
  rouletteActive,
  deviceTier,
  onUseItem,
}: CircularAbilityWheelProps) {
  const [spinIdx, setSpinIdx] = useState(0);

  useEffect(() => {
    if (!rouletteActive) return;
    const id = window.setInterval(() => {
      setSpinIdx((i) => (i + 1) % SLOT_ORDER.length);
    }, 75);
    return () => clearInterval(id);
  }, [rouletteActive]);

  const displayedItem: ItemKind = rouletteActive ? SLOT_ORDER[spinIdx] : heldItem;
  const vis = itemVisual(displayedItem);

  const circleSize =
    deviceTier === 'desktop' ? 104 : deviceTier === 'tablet' ? 84 : 62;
  const iconSize =
    deviceTier === 'desktop' ? 54 : deviceTier === 'tablet' ? 44 : 32;
  const hasItem = heldItem !== 'none' && !rouletteActive;

  return (
    <div className="flex items-center gap-2.5 sm:gap-3 font-mk">
      <button
        type="button"
        onClick={onUseItem}
        disabled={!hasItem}
        title="Use Ability (X / E)"
        className={`pointer-events-auto relative rounded-full flex items-center justify-center shadow-2xl border-[3px] transition-transform shrink-0 ${
          hasItem ? 'hover:scale-105 active:scale-95 cursor-pointer' : 'cursor-default'
        }`}
        style={{
          width: circleSize,
          height: circleSize,
          backgroundColor: 'rgba(10, 15, 28, 0.82)',
          borderColor: hasItem || rouletteActive ? vis.ring : 'rgba(255,255,255,0.28)',
          boxShadow: hasItem || rouletteActive ? `0 0 26px ${vis.color}88` : '0 8px 20px rgba(0,0,0,0.45)',
        }}
      >
        <svg
          className={`absolute inset-0 w-full h-full ${rouletteActive ? 'animate-spin' : ''}`}
          viewBox="0 0 80 80"
        >
          <circle
            cx="40"
            cy="40"
            r="35"
            fill="none"
            stroke={vis.color}
            strokeWidth="3.5"
            strokeDasharray={rouletteActive ? '16 10' : '220'}
            opacity="0.9"
          />
        </svg>

        <div
          className={`relative z-10 rounded-full flex items-center justify-center transition-transform ${
            rouletteActive ? 'scale-110' : ''
          }`}
          style={{
            width: Math.round(circleSize * 0.68),
            height: Math.round(circleSize * 0.68),
            backgroundColor: `${vis.color}36`,
          }}
        >
          <ItemSvgIcon item={displayedItem} iconSize={iconSize} />
        </div>

        {deviceTier !== 'mobile' && (
          <span
            className="absolute -bottom-1.5 px-2 py-0.5 rounded-full text-[10px] font-mk uppercase tracking-wider border border-white/40 text-white shadow"
            style={{ backgroundColor: hasItem ? vis.color : '#1e293b' }}
          >
            X / E
          </span>
        )}
      </button>

      <div className="flex flex-col leading-tight">
        <span className="font-mk text-[10px] sm:text-xs uppercase tracking-widest text-amber-300 mk-stroke-sm">
          {rouletteActive ? 'SPINNING...' : hasItem ? 'READY · PRESS X' : 'ABILITY SLOT'}
        </span>
        <span
          className={`font-mk uppercase tracking-wide whitespace-nowrap mk-stroke-sm ${
            deviceTier === 'desktop'
              ? 'text-lg'
              : deviceTier === 'tablet'
              ? 'text-sm'
              : 'text-xs'
          }`}
          style={{ color: displayedItem === 'none' ? '#cbd5e1' : vis.ring }}
        >
          {rouletteActive ? vis.name : heldItem === 'none' ? 'Empty' : vis.name}
        </span>
      </div>
    </div>
  );
}
