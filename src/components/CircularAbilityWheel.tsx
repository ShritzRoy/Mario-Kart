import { useEffect, useState } from 'react';
import type { ItemKind } from '../shared/protocol.ts';

interface CircularAbilityWheelProps {
  heldItem: ItemKind;
  rouletteActive: boolean;
  onUseItem?: () => void;
}

const SLOT_ORDER: Exclude<ItemKind, 'none'>[] = ['mushroom', 'shell', 'banana', 'star'];

function itemVisual(item: ItemKind): { name: string; color: string; ring: string; glyph: string } {
  switch (item) {
    case 'mushroom':
      return { name: 'TURBO MUSHROOM', color: '#ef4444', ring: '#fca5a5', glyph: 'M' };
    case 'shell':
      return { name: 'GREEN SHELL', color: '#22c55e', ring: '#86efac', glyph: 'S' };
    case 'banana':
      return { name: 'BANANA PEEL', color: '#eab308', ring: '#fde047', glyph: 'B' };
    case 'star':
      return { name: 'SUPER STAR', color: '#f59e0b', ring: '#fef08a', glyph: '★' };
    default:
      return { name: 'NO ITEM', color: '#334155', ring: '#64748b', glyph: '—' };
  }
}

function ItemSvgIcon({ item }: { item: ItemKind }) {
  if (item === 'mushroom') {
    return (
      <svg width="34" height="34" viewBox="0 0 40 40">
        <path d="M8 22 C8 10 32 10 32 22 Z" fill="#ef4444" stroke="#ffffff" strokeWidth="2" />
        <circle cx="15" cy="17" r="3" fill="#ffffff" />
        <circle cx="25" cy="17" r="3" fill="#ffffff" />
        <rect x="14" y="22" width="12" height="10" rx="4" fill="#fef3c7" stroke="#0f172a" strokeWidth="1.5" />
      </svg>
    );
  }
  if (item === 'shell') {
    return (
      <svg width="34" height="34" viewBox="0 0 40 40">
        <ellipse cx="20" cy="21" rx="13" ry="11" fill="#22c55e" stroke="#ffffff" strokeWidth="2" />
        <path d="M12 19 L20 13 L28 19 L25 27 L15 27 Z" fill="#15803d" stroke="#dcfce7" strokeWidth="1.5" />
      </svg>
    );
  }
  if (item === 'banana') {
    return (
      <svg width="34" height="34" viewBox="0 0 40 40">
        <path
          d="M11 28 C14 14 23 11 29 9 C28 19 25 29 11 28 Z"
          fill="#facc15"
          stroke="#ffffff"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (item === 'star') {
    return (
      <svg width="34" height="34" viewBox="0 0 40 40">
        <polygon
          points="20,5 24.5,14.5 35,16 27.2,23.2 29.2,33.8 20,28.5 10.8,33.8 12.8,23.2 5,16 15.5,14.5"
          fill="#facc15"
          stroke="#ffffff"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  return <span className="text-lg font-black text-slate-500">—</span>;
}

export function CircularAbilityWheel({
  heldItem,
  rouletteActive,
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

  return (
    <div className="flex items-center gap-2.5">
      <button
        type="button"
        onClick={onUseItem}
        disabled={heldItem === 'none' || rouletteActive}
        title="Use Ability (E / X)"
        className={`pointer-events-auto relative w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center shadow-2xl border-[3px] transition-transform ${
          heldItem !== 'none' && !rouletteActive ? 'hover:scale-105 active:scale-95 cursor-pointer' : 'cursor-default'
        }`}
        style={{
          backgroundColor: 'rgba(10, 15, 28, 0.9)',
          borderColor: vis.ring,
          boxShadow: `0 0 22px ${vis.color}55`,
        }}
      >
        {/* Spinning Slot Ring */}
        <svg
          className={`absolute inset-0 w-full h-full ${rouletteActive ? 'animate-spin' : ''}`}
          viewBox="0 0 80 80"
        >
          <circle
            cx="40"
            cy="40"
            r="34"
            fill="none"
            stroke={vis.color}
            strokeWidth="3.5"
            strokeDasharray={rouletteActive ? '16 10' : '220'}
            opacity="0.85"
          />
        </svg>

        <div
          className={`relative z-10 w-11 h-11 md:w-13 md:h-13 rounded-full flex items-center justify-center transition-transform ${
            rouletteActive ? 'scale-110' : ''
          }`}
          style={{ backgroundColor: `${vis.color}33` }}
        >
          <ItemSvgIcon item={displayedItem} />
        </div>
      </button>

      {/* Ability Name Tag beside the Circular Slot */}
      <div
        className="rounded-xl border border-white/20 px-3 py-1.5 shadow-xl"
        style={{ backgroundColor: 'rgba(10, 15, 28, 0.86)' }}
      >
        <div className="text-[9px] font-black uppercase tracking-widest text-slate-400">
          {rouletteActive ? 'Rolling Slot...' : 'Ability · E / X'}
        </div>
        <div
          className="text-xs md:text-sm font-black uppercase tracking-wide whitespace-nowrap"
          style={{ color: displayedItem === 'none' ? '#94a3b8' : '#ffffff' }}
        >
          {rouletteActive ? vis.name : heldItem === 'none' ? 'Empty Slot' : vis.name}
        </div>
      </div>
    </div>
  );
}
