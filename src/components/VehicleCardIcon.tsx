import type { VehicleSpec } from '../game/vehicles.ts';

interface VehicleCardIconProps {
  vehicle: VehicleSpec;
  size?: number;
}

export function VehicleCardIcon({ vehicle, size = 76 }: VehicleCardIconProps) {
  const w = size;
  const h = Math.round(size * 0.62);
  const id = vehicle.id;

  if (vehicle.wheelLayout === 'two') {
    const isScooter = id === 'bumble_scooter';
    const isChopper = id === 'pipe_chopper';
    const isDirt = id === 'rally_dirt_bike';
    const isSuper = id === 'apex_superbike';

    return (
      <svg width={w} height={h} viewBox="0 0 110 68" className="drop-shadow-[0_3px_6px_rgba(0,0,0,0.65)]">
        {/* Rear & Front Tires */}
        <circle cx={isChopper ? 25 : 27} cy="48" r={isScooter ? 10.5 : 13.5} fill="#0f172a" stroke="#475569" strokeWidth="2.2" />
        <circle cx={isChopper ? 25 : 27} cy="48" r={isScooter ? 4.8 : 6.5} fill={vehicle.accentHex} />
        <circle cx={isChopper ? 87 : 83} cy="48" r={isScooter ? 10 : 12.8} fill="#0f172a" stroke="#475569" strokeWidth="2.2" />
        <circle cx={isChopper ? 87 : 83} cy="48" r={isScooter ? 4.4 : 6} fill={vehicle.accentHex} />

        {/* Frame / Exhaust */}
        {isScooter ? (
          <>
            <path d="M26 42 Q40 28 58 34 L74 18 L82 22 L66 44 Z" fill={vehicle.bodyTintHex} stroke="#ffffff" strokeWidth="2" strokeLinejoin="round" />
            <rect x="28" y="29" width="22" height="7" rx="3.5" fill="#1e293b" />
            <circle cx="80" cy="21" r="4" fill="#fef08a" />
          </>
        ) : isSuper ? (
          <>
            <path d="M26 44 L44 26 L70 22 L89 35 L68 45 Z" fill={vehicle.bodyTintHex} stroke="#facc15" strokeWidth="2" strokeLinejoin="round" />
            <path d="M62 22 L76 17 L83 25 Z" fill="#38bdf8" opacity="0.85" />
            <rect x="20" y="34" width="18" height="6" rx="3" fill="#64748b" />
          </>
        ) : (
          <>
            <path
              d={isChopper ? 'M25 46 L48 31 L71 22 L87 46' : 'M27 46 L46 28 L72 26 L83 46'}
              fill="none"
              stroke={vehicle.bodyTintHex}
              strokeWidth="6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <rect x="42" y="26" width="24" height="10" rx="4" fill={vehicle.bodyTintHex} stroke="#ffffff" strokeWidth="1.8" />
            {isDirt && <polygon points="71,22 88,24 76,30" fill="#ffffff" />}
            <rect x="16" y="36" width="17" height="5.5" rx="2.5" fill="#94a3b8" />
          </>
        )}
      </svg>
    );
  }

  if (vehicle.wheelLayout === 'hover') {
    return (
      <svg width={w} height={h} viewBox="0 0 110 68" className="drop-shadow-[0_3px_6px_rgba(0,0,0,0.65)]">
        {/* Hydro Jet Hull + Twin Rear Fans */}
        <path d="M12 42 Q22 24 62 24 L98 38 L86 50 L20 50 Z" fill={vehicle.bodyTintHex} stroke="#ffffff" strokeWidth="2" strokeLinejoin="round" />
        <path d="M24 46 L88 46 L94 40 L18 40 Z" fill={vehicle.accentHex} />
        <circle cx="24" cy="27" r="9.5" fill="#0f172a" stroke="#38bdf8" strokeWidth="2.4" />
        <circle cx="24" cy="27" r="4.5" fill="#38bdf8" />
        <path d="M60 24 L74 17 L80 26 Z" fill="#bae6fd" opacity="0.85" />
        <circle cx="42" cy="51" r="6" fill="#0f172a" stroke="#64748b" strokeWidth="1.5" />
        <circle cx="74" cy="51" r="6" fill="#0f172a" stroke="#64748b" strokeWidth="1.5" />
      </svg>
    );
  }

  if (id === 'monster_truck') {
    return (
      <svg width={w} height={h} viewBox="0 0 110 68" className="drop-shadow-[0_3px_6px_rgba(0,0,0,0.65)]">
        <path d="M22 36 L34 21 L72 21 L92 31 L90 40 L20 40 Z" fill="#f97316" stroke="#ffffff" strokeWidth="2" strokeLinejoin="round" />
        <rect x="44" y="16" width="20" height="8" rx="3" fill="#38bdf8" />
        <circle cx="30" cy="48" r="14.5" fill="#0f172a" stroke="#64748b" strokeWidth="2.5" strokeDasharray="5 3" />
        <circle cx="30" cy="48" r="6.5" fill="#f97316" />
        <circle cx="80" cy="48" r="14.5" fill="#0f172a" stroke="#64748b" strokeWidth="2.5" strokeDasharray="5 3" />
        <circle cx="80" cy="48" r="6.5" fill="#f97316" />
      </svg>
    );
  }

  if (id === 'mach_convertible') {
    return (
      <svg width={w} height={h} viewBox="0 0 110 68" className="drop-shadow-[0_3px_6px_rgba(0,0,0,0.65)]">
        <path d="M12 34 L22 20 L38 30 L76 28 L96 36 L94 46 L14 46 Z" fill="#f472b6" stroke="#ffffff" strokeWidth="2" strokeLinejoin="round" />
        <rect x="64" y="25" width="12" height="7" rx="2" fill="#bae6fd" />
        <rect x="86" y="34" width="10" height="9" rx="2" fill="#e2e8f0" />
        <circle cx="28" cy="48" r="10.5" fill="#0f172a" stroke="#ffffff" strokeWidth="2" />
        <circle cx="28" cy="48" r="5" fill="#f472b6" />
        <circle cx="80" cy="48" r="10.5" fill="#0f172a" stroke="#ffffff" strokeWidth="2" />
        <circle cx="80" cy="48" r="5" fill="#f472b6" />
      </svg>
    );
  }

  if (id === 'pipe_frame' || vehicle.wheelLayout === 'trike') {
    return (
      <svg width={w} height={h} viewBox="0 0 110 68" className="drop-shadow-[0_3px_6px_rgba(0,0,0,0.65)]">
        <path d="M20 44 L36 30 L64 30 L84 42" fill="none" stroke={vehicle.bodyTintHex} strokeWidth="6.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M36 30 L48 18 L60 28" fill="none" stroke={vehicle.accentHex} strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="20" y="22" width="16" height="8" rx="3" fill="#475569" transform="rotate(-18 20 22)" />
        <circle cx="26" cy="48" r="12.5" fill="#0f172a" stroke="#94a3b8" strokeWidth="2" />
        <circle cx="26" cy="48" r="6" fill={vehicle.accentHex} />
        <circle cx="82" cy="48" r="10.5" fill="#0f172a" stroke="#94a3b8" strokeWidth="2" />
        <circle cx="82" cy="48" r="4.8" fill={vehicle.accentHex} />
      </svg>
    );
  }

  if (id === 'rally_coupe' || id === 'arcade_racer') {
    return (
      <svg width={w} height={h} viewBox="0 0 110 68" className="drop-shadow-[0_3px_6px_rgba(0,0,0,0.65)]">
        <polygon points="18,22 30,22 26,32 16,32" fill="#0f172a" />
        <path d="M20 42 L26 28 L66 26 L94 36 L92 45 L18 45 Z" fill={vehicle.bodyTintHex} stroke="#ffffff" strokeWidth="2" strokeLinejoin="round" />
        <rect x="52" y="24" width="16" height="8" rx="2" fill="#38bdf8" />
        <circle cx="28" cy="48" r="11.5" fill="#0f172a" stroke="#94a3b8" strokeWidth="2" />
        <circle cx="28" cy="48" r="5.5" fill={vehicle.accentHex} />
        <circle cx="80" cy="48" r="11" fill="#0f172a" stroke="#94a3b8" strokeWidth="2" />
        <circle cx="80" cy="48" r="5.2" fill={vehicle.accentHex} />
      </svg>
    );
  }

  // Standard Kart, Cloud Coupe, Gold Standard
  return (
    <svg width={w} height={h} viewBox="0 0 110 68" className="drop-shadow-[0_3px_6px_rgba(0,0,0,0.65)]">
      {/* Twin Exhausts */}
      <rect x="13" y="23" width="16" height="7" rx="3" fill="#475569" stroke="#e2e8f0" strokeWidth="1.2" transform="rotate(-18 13 23)" />
      {/* Kart Shell */}
      <path d="M20 42 L30 26 L62 28 L92 36 L90 45 L20 45 Z" fill={vehicle.bodyTintHex} stroke="#ffffff" strokeWidth="2" strokeLinejoin="round" />
      <rect x="74" y="34" width="16" height="9" rx="3" fill="#1d4ed8" />
      <circle cx="72" cy="31" r="6" fill="#ffffff" />
      {/* Wheels */}
      <circle cx="28" cy="48" r="12" fill="#0f172a" stroke="#64748b" strokeWidth="2.2" />
      <circle cx="28" cy="48" r="5.5" fill={vehicle.accentHex} />
      <circle cx="80" cy="48" r="10.5" fill="#0f172a" stroke="#64748b" strokeWidth="2.2" />
      <circle cx="80" cy="48" r="4.8" fill={vehicle.accentHex} />
    </svg>
  );
}
