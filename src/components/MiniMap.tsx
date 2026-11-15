interface MiniMapProps {
  points: { x: number; z: number }[];
  racers: { x: number; z: number; color: string; isPlayer: boolean }[];
  transparent?: boolean;
  size?: number;
}

export function MiniMap({
  points,
  racers,
  transparent = false,
  size = 156,
}: MiniMapProps) {
  if (points.length === 0) return null;

  const pad = Math.max(12, Math.round(size * 0.1));
  let minX = Infinity,
    maxX = -Infinity,
    minZ = Infinity,
    maxZ = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.z < minZ) minZ = p.z;
    if (p.z > maxZ) maxZ = p.z;
  }
  const span = Math.max(maxX - minX, maxZ - minZ, 1);
  const scale = (size - pad * 2) / span;
  const ox = (size - (maxX - minX) * scale) * 0.5;
  const oz = (size - (maxZ - minZ) * scale) * 0.5;

  const toSvg = (x: number, z: number) => ({
    sx: ox + (x - minX) * scale,
    sy: oz + (z - minZ) * scale,
  });

  const d =
    points
      .map((p, i) => {
        const { sx, sy } = toSvg(p.x, p.z);
        return `${i === 0 ? 'M' : 'L'}${sx.toFixed(1)},${sy.toFixed(1)}`;
      })
      .join(' ') + ' Z';

  const startPt = toSvg(points[0].x, points[0].z);

  const svg = (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="block overflow-visible"
      style={
        transparent
          ? { filter: 'drop-shadow(0 2px 5px rgba(0, 0, 0, 0.85))' }
          : undefined
      }
    >
      <path
        d={d}
        fill="none"
        stroke={transparent ? 'rgba(15, 23, 42, 0.58)' : 'rgba(148,163,184,0.35)'}
        strokeWidth={transparent ? 8.5 : 10}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <path
        d={d}
        fill="none"
        stroke={transparent ? 'rgba(255, 255, 255, 0.85)' : '#e2e8f0'}
        strokeWidth={transparent ? 3.2 : 3.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle
        cx={startPt.sx}
        cy={startPt.sy}
        r={size < 120 ? 3.5 : 4.5}
        fill="#facc15"
        stroke="#0f172a"
        strokeWidth="1.5"
      />
      {racers.map((r, i) => {
        const { sx, sy } = toSvg(r.x, r.z);
        return (
          <circle
            key={i}
            cx={sx}
            cy={sy}
            r={r.isPlayer ? (size < 120 ? 5.2 : 6.2) : size < 120 ? 3.2 : 4}
            fill={r.color}
            stroke="#ffffff"
            strokeWidth={r.isPlayer ? 2.2 : 1.2}
          />
        );
      })}
    </svg>
  );

  if (transparent) {
    return <div className="pointer-events-none select-none">{svg}</div>;
  }

  return (
    <div
      className="rounded-2xl border border-white/15 p-2 shadow-xl"
      style={{ backgroundColor: 'rgba(10, 15, 28, 0.84)' }}
    >
      {svg}
    </div>
  );
}
