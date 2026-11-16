import { useEffect, useRef } from 'react';

interface RainDroplet {
  x: number;
  y: number;
  r: number;
  vx: number;
  vy: number;
  alpha: number;
  trail: { x: number; y: number; r: number }[];
}

interface CameraRainOverlayProps {
  rainFactor: number;
  sunGlare: { visible: boolean; x: number; y: number; intensity: number };
}

export function CameraRainOverlay({ rainFactor, sunGlare }: CameraRainOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dropletsRef = useRef<RainDroplet[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;
    const updateSize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    updateSize();
    window.addEventListener('resize', updateSize);

    // Seed droplets
    const droplets: RainDroplet[] = [];
    const count = Math.round(55 * Math.max(0.2, rainFactor));
    for (let i = 0; i < count; i++) {
      droplets.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        r: 1.5 + Math.random() * 3.5,
        vx: (Math.random() - 0.5) * 0.4,
        vy: 0.8 + Math.random() * 2.2,
        alpha: 0.35 + Math.random() * 0.55,
        trail: [],
      });
    }
    dropletsRef.current = droplets;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 1. Rain Droplets on Camera Glass
      if (rainFactor > 0.05) {
        ctx.save();
        for (const d of dropletsRef.current) {
          d.y += d.vy * (0.8 + rainFactor * 0.8);
          d.x += d.vx;
          if (Math.random() < 0.08) {
            d.trail.push({ x: d.x, y: d.y, r: d.r * 0.55 });
            if (d.trail.length > 5) d.trail.shift();
          }

          // Wrap around top if fell off bottom
          if (d.y > canvas.height + 10) {
            d.y = -10;
            d.x = Math.random() * canvas.width;
            d.trail = [];
          }

          // Draw condensation streak trail
          for (let t = 0; t < d.trail.length; t++) {
            const tr = d.trail[t];
            ctx.beginPath();
            ctx.arc(tr.x, tr.y, tr.r, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(224, 242, 254, ${0.12 * (t / d.trail.length)})`;
            ctx.fill();
          }

          // Draw main bead with specular rim & glass shadow
          const grad = ctx.createRadialGradient(
            d.x - d.r * 0.3,
            d.y - d.r * 0.3,
            d.r * 0.1,
            d.x,
            d.y,
            d.r
          );
          grad.addColorStop(0, `rgba(255, 255, 255, ${d.alpha * 0.95})`);
          grad.addColorStop(0.5, `rgba(186, 230, 253, ${d.alpha * 0.6})`);
          grad.addColorStop(0.9, `rgba(14, 165, 233, ${d.alpha * 0.35})`);
          grad.addColorStop(1, 'rgba(15, 23, 42, 0.45)');

          ctx.beginPath();
          ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
          ctx.fillStyle = grad;
          ctx.fill();

          // Tiny specular catchlight on top-left of droplet
          ctx.beginPath();
          ctx.arc(d.x - d.r * 0.35, d.y - d.r * 0.35, Math.max(0.8, d.r * 0.28), 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
          ctx.fill();
        }
        ctx.restore();
      }

      // 2. Ray-Traced Solar Lens Flare & Anamorphic Sunburst Streaks
      if (sunGlare.visible && sunGlare.intensity > 0.05) {
        ctx.save();
        const gx = (sunGlare.x / 100) * canvas.width;
        const gy = (sunGlare.y / 100) * canvas.height;
        const baseRadius = 80 + sunGlare.intensity * 140;

        // Radial Solar Corona
        const sunGrad = ctx.createRadialGradient(gx, gy, 10, gx, gy, baseRadius * 1.8);
        sunGrad.addColorStop(0, `rgba(255, 255, 240, ${0.75 * sunGlare.intensity})`);
        sunGrad.addColorStop(0.2, `rgba(253, 224, 71, ${0.45 * sunGlare.intensity})`);
        sunGrad.addColorStop(0.5, `rgba(249, 115, 22, ${0.22 * sunGlare.intensity})`);
        sunGrad.addColorStop(1, 'rgba(239, 68, 68, 0)');
        ctx.fillStyle = sunGrad;
        ctx.beginPath();
        ctx.arc(gx, gy, baseRadius * 1.8, 0, Math.PI * 2);
        ctx.fill();

        // Anamorphic horizontal optical glare streak
        const streakGrad = ctx.createLinearGradient(0, gy, canvas.width, gy);
        streakGrad.addColorStop(0, 'rgba(56, 189, 248, 0)');
        streakGrad.addColorStop(
          Math.max(0, gx / canvas.width - 0.2),
          `rgba(56, 189, 248, ${0.28 * sunGlare.intensity})`
        );
        streakGrad.addColorStop(
          gx / canvas.width,
          `rgba(255, 255, 255, ${0.85 * sunGlare.intensity})`
        );
        streakGrad.addColorStop(
          Math.min(1, gx / canvas.width + 0.2),
          `rgba(244, 114, 182, ${0.28 * sunGlare.intensity})`
        );
        streakGrad.addColorStop(1, 'rgba(168, 85, 247, 0)');

        ctx.fillStyle = streakGrad;
        ctx.fillRect(0, gy - 2.5, canvas.width, 5);

        // Secondary Hexagonal Lens Artifacts across center line
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const dirX = centerX - gx;
        const dirY = centerY - gy;
        const artifacts = [
          { dist: 0.35, size: 28, color: 'rgba(56, 189, 248, 0.25)' },
          { dist: 0.65, size: 44, color: 'rgba(250, 204, 21, 0.22)' },
          { dist: 1.15, size: 62, color: 'rgba(244, 63, 94, 0.18)' },
          { dist: 1.45, size: 34, color: 'rgba(168, 85, 247, 0.2)' },
        ];
        for (const art of artifacts) {
          const ax = gx + dirX * art.dist;
          const ay = gy + dirY * art.dist;
          ctx.beginPath();
          ctx.arc(ax, ay, art.size * sunGlare.intensity, 0, Math.PI * 2);
          ctx.fillStyle = art.color;
          ctx.fill();
        }

        ctx.restore();
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', updateSize);
    };
  }, [rainFactor, sunGlare]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-20 w-full h-full"
    />
  );
}
