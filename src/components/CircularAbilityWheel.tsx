import { useEffect, useState } from 'react';
import type { ItemKind } from '../shared/protocol.ts';

export type DeviceTier = 'mobile' | 'tablet' | 'desktop';

interface CircularAbilityWheelProps {
  heldItem: ItemKind;
  rouletteActive: boolean;
  deviceTier: DeviceTier;
  onUseItem?: () => void;
}

const SLOT_ORDER: Exclude<ItemKind, 'none'>[] = ['mushroom', 'shell', 'banana', 'star'];

function itemVisual(item: ItemKind): { name: string; color: string; ring: string } {
  switch (item) {
    case 'mushroom':
      return { name: 'TURBO SHROOM', color: '#ef4444', ring: '#fca5a5' };
    case 'shell':
      return { name: 'GREEN SHELL', color: '#22c55e', ring: '#86efac' };
    case 'banana':
      return { name: 'BANANA PEEL', color: '#eab308', ring: '#fde047' };
    case 'star':
      return { name: 'SUPER STAR', color: '#f59e0b', ring: '#fef08a' };
    default:
      return { name: 'NO ITEM', color: '#475569', ring: '#94a3b8' };
  }
}

function ItemSvgIcon({ item, iconSize }: { item: ItemKind; iconSize: number }) {
  if (item === 'mushroom') {
    return (
      <svg width={iconSize} height={iconSize} viewBox="0 0 40 40">
        <path d="M8 22 C8 10 32 10 32 22 Z" fill="#ef4444" stroke="#ffffff" strokeWidth="2.2" />
        <circle cx="15" cy="17" r="3.2" fill="#ffffff" />
        <circle cx="25" cy="17" r="3.2" fill="#ffffff" />
        <rect x="14" y="22" width="12" height="10" rx="4" fill="#fef3c7" stroke="#0f172a" strokeWidth="1.6" />
      </svg>
    );
  }
  if (item === 'shell') {
    return (
      <svg width={iconSize} height={iconSize} viewBox="0 0 40 40">
        <ellipse cx="20" cy="21" rx="13.5" ry="11.5" fill="#22c55e" stroke="#ffffff" strokeWidth="2.2" />
        <path d="M12 19 L20 13 L28 19 L25 27 L15 27 Z" fill="#15803d" stroke="#dcfce7" strokeWidth="1.6" />
      </svg>
    );
  }
  if (item === 'banana') {
    return (
      <svg width={iconSize} height={iconSize} viewBox="0 0 40 40">
        <path
          d="M11 28 C14 14 23 11 29 9 C28 19 25 29 11 28 Z"
          fill="#facc15"
          stroke="#ffffff"
          strokeWidth="2.2"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (item === 'star') {
    return (
      <svg width={iconSize} height={iconSize} viewBox="0 0 40 40">
        <polygon
          points="20,5 24.5,14.5 35,16 27.2,23.2 29.2,33.8 20,28.5 10.8,33.8 12.8,23.2 5,16 15.5,14.5"
          fill="#facc15"
          stroke="#ffffff"
          strokeWidth="2.2"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  return <span className="text-xl font-black text-slate-400">—</span>;
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
    }, 85);
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
    <div className="flex items-center gap-2.5 sm:gap-3">
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

        {/* Crisp Key Shortcut Chip */}
        {deviceTier !== 'mobile' && (
          <span
            className="absolute -bottom-1.5 px-2 py-0.5 rounded-full text-[10px] font-hud font-bold uppercase tracking-wider border border-white/40 text-white shadow"
            style={{ backgroundColor: hasItem ? vis.color : '#1e293b' }}
          >
            X / E
          </span>
        )}
      </button>

      {/* Floating Ability Label (transparent drop-shadowed multi-color MK typography) */}
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
