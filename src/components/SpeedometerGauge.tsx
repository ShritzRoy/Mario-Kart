interface SpeedometerGaugeProps {
  speedKmh: number;
  driftLevel: number;
  boostActive: boolean;
  starActive: boolean;
  sizePx?: number;
}

function polarToXY(cx: number, cy: number, r: number, angleDegFromTop: number) {
  const rad = ((angleDegFromTop - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

function describeArc(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number
) {
  const start = polarToXY(cx, cy, r, startAngle);
  const end = polarToXY(cx, cy, r, endAngle);
  const largeArc = endAngle - startAngle <= 180 ? '0' : '1';
  return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${r} ${r} 0 ${largeArc} 1 ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
}

const MAJOR_MARKS = [0, 20, 40, 60, 80, 100, 120, 140, 160, 180, 200, 220, 240];

export function SpeedometerGauge({
  speedKmh,
  driftLevel,
  boostActive,
  starActive,
  sizePx = 132,
}: SpeedometerGaugeProps) {
  const maxGaugeKmh = 240;
  const clamped = Math.min(maxGaugeKmh, Math.max(0, speedKmh));
  const pct = clamped / maxGaugeKmh;
  const startAngle = -135;
  const endAngle = 135;
  const needleAngle = startAngle + pct * (endAngle - startAngle);

  const cx = 100;
  const cy = 100;

  return (
    <div
      className="relative select-none drop-shadow-[0_8px_18px_rgba(0,0,0,0.7)] shrink-0"
      style={{ width: sizePx, height: sizePx }}
    >
      <svg viewBox="0 0 200 200" className="w-full h-full overflow-visible">
        <defs>
          <linearGradient id="speedChromeOuter" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f8fafc" />
            <stop offset="28%" stopColor="#94a3b8" />
            <stop offset="52%" stopColor="#e2e8f0" />
            <stop offset="78%" stopColor="#475569" />
            <stop offset="100%" stopColor="#cbd5e1" />
          </linearGradient>
          <linearGradient id="speedChromeInner" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#334155" />
            <stop offset="45%" stopColor="#e2e8f0" />
            <stop offset="100%" stopColor="#1e293b" />
          </linearGradient>
          <radialGradient id="speedDialFace" cx="50%" cy="46%" r="55%">
            <stop offset="0%" stopColor="#272b34" />
            <stop offset="70%" stopColor="#13161c" />
            <stop offset="100%" stopColor="#090b0f" />
          </radialGradient>
          <linearGradient id="speedColorArc" x1="0%" y1="100%" x2="100%" y2="20%">
            <stop offset="0%" stopColor="#22c55e" />
            <stop offset="32%" stopColor="#a3e635" />
            <stop offset="55%" stopColor="#facc15" />
            <stop offset="76%" stopColor="#fb923c" />
            <stop offset="100%" stopColor="#ef4444" />
          </linearGradient>
          <radialGradient id="speedHubCap" cx="35%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="45%" stopColor="#cbd5e1" />
            <stop offset="100%" stopColor="#475569" />
          </radialGradient>
        </defs>

        <circle cx={cx} cy={cy} r="96" fill="url(#speedChromeOuter)" stroke="#1e293b" strokeWidth="2.5" />
        <circle cx={cx} cy={cy} r="87" fill="url(#speedChromeInner)" />
        <circle cx={cx} cy={cy} r="82" fill="url(#speedDialFace)" stroke="#0f172a" strokeWidth="2" />

        <path
          d={describeArc(cx, cy, 74, startAngle, endAngle)}
          fill="none"
          stroke="url(#speedColorArc)"
          strokeWidth="9.5"
          strokeLinecap="round"
          opacity={boostActive || starActive ? 1 : 0.92}
        />

        {Array.from({ length: 49 }).map((_, i) => {
          const t = i / 48;
          const angle = startAngle + t * (endAngle - startAngle);
          const isMajor = i % 4 === 0;
          const pOut = polarToXY(cx, cy, 67, angle);
          const pIn = polarToXY(cx, cy, isMajor ? 56 : 61, angle);
          return (
            <line
              key={i}
              x1={pIn.x}
              y1={pIn.y}
              x2={pOut.x}
              y2={pOut.y}
              stroke="#f8fafc"
              strokeWidth={isMajor ? 2.4 : 1.1}
              strokeLinecap="round"
              opacity={isMajor ? 0.95 : 0.65}
            />
          );
        })}

        {MAJOR_MARKS.map((val) => {
          const t = val / maxGaugeKmh;
          const angle = startAngle + t * (endAngle - startAngle);
          const pos = polarToXY(cx, cy, 45, angle);
          return (
            <text
              key={val}
              x={pos.x}
              y={pos.y + 3.2}
              textAnchor="middle"
              fill="#f1f5f9"
              fontSize="9.5"
              fontWeight="800"
              fontFamily="'Chakra Petch', sans-serif"
            >
              {val}
            </text>
          );
        })}

        <rect
          x="74"
          y="134"
          width="52"
          height="20"
          rx="4"
          fill="#05070b"
          stroke="#334155"
          strokeWidth="1.5"
        />
        <text
          x="100"
          y="148.5"
          textAnchor="middle"
          fill={starActive ? '#fde047' : boostActive ? '#fb923c' : '#e2e8f0'}
          fontSize="12.5"
          fontWeight="900"
          fontFamily="'Chakra Petch', monospace"
        >
          {String(speedKmh).padStart(3, '0')}
        </text>

        {[1, 2, 3].map((lv) => {
          const lit = boostActive || starActive || driftLevel >= lv;
          const dotColor =
            starActive
              ? '#fde047'
              : lv === 3
              ? '#c084fc'
              : lv === 2
              ? '#fb923c'
              : '#38bdf8';
          return (
            <circle
              key={lv}
              cx={88 + (lv - 1) * 12}
              cy="163"
              r="3.2"
              fill={lit ? dotColor : '#1e293b'}
              stroke="#0f172a"
              strokeWidth="1"
            />
          );
        })}

        <g
          transform={`rotate(${needleAngle.toFixed(1)} ${cx} ${cy})`}
          style={{ transition: 'transform 55ms linear' }}
        >
          <rect x="97.5" y="100" width="5" height="16" rx="2" fill="#dc2626" />
          <polygon points="97,100 103,100 101,31 99,31" fill="#ef4444" />
          <polygon points="99,100 101,100 100.5,31 99.5,31" fill="#fca5a5" opacity="0.55" />
        </g>

        <circle cx={cx} cy={cy} r="12" fill="url(#speedHubCap)" stroke="#1e293b" strokeWidth="2" />

        <path
          d="M 28 84 A 74 74 0 0 1 172 84 Q 100 104 28 84 Z"
          fill="#ffffff"
          opacity="0.09"
        />
      </svg>
    </div>
  );
}
