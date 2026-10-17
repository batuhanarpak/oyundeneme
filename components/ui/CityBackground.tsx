'use client';

import React, { useEffect, useRef } from 'react';

/**
 * Procedural cyberpunk skyline.
 *
 * Everything is drawn to canvas, so it never 404s, never blocks first paint,
 * and stays crisp at any resolution. Layers scroll at different speeds for
 * parallax depth; a rain sheet and sporadic lightning sit on top.
 */

interface Building {
  x: number;
  w: number;
  h: number;
  depth: number; // 0 = far, 1 = near
  hue: number;
  windows: { x: number; y: number; on: number; flicker: number }[];
}

const LAYERS = [
  { speed: 0.06, count: 26, hue: 205, minH: 0.16, maxH: 0.4, alpha: 0.5 },
  { speed: 0.14, count: 20, hue: 265, minH: 0.24, maxH: 0.58, alpha: 0.7 },
  { speed: 0.26, count: 14, hue: 190, minH: 0.34, maxH: 0.78, alpha: 0.92 },
];

export const CityBackground: React.FC<{ intensity?: number }> = ({ intensity = 1 }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const raf = useRef<number>(0);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let W = 0;
    let H = 0;
    let buildings: Building[] = [];
    let rain: { x: number; y: number; len: number; sp: number }[] = [];
    let t = 0;
    let flash = 0;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const build = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = canvas.clientWidth;
      H = canvas.clientHeight;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      buildings = [];
      LAYERS.forEach((layer, li) => {
        let x = -60;
        for (let i = 0; i < layer.count; i++) {
          const w = 46 + Math.random() * 92;
          const h = H * (layer.minH + Math.random() * (layer.maxH - layer.minH));
          const windows: Building['windows'] = [];
          const cols = Math.max(2, Math.floor(w / 13));
          const rows = Math.max(3, Math.floor(h / 17));
          for (let c = 0; c < cols; c++) {
            for (let r = 0; r < rows; r++) {
              if (Math.random() > 0.42) continue;
              windows.push({
                x: 6 + c * 13,
                y: 8 + r * 17,
                on: 0.35 + Math.random() * 0.65,
                flicker: Math.random() < 0.12 ? 0.5 + Math.random() * 2 : 0,
              });
            }
          }
          buildings.push({
            x,
            w,
            h,
            depth: li / (LAYERS.length - 1),
            hue: layer.hue + (Math.random() - 0.5) * 26,
            windows,
          });
          x += w + 10 + Math.random() * 22;
        }
      });

      rain = Array.from({ length: reduce ? 0 : 150 }, () => ({
        x: Math.random() * W,
        y: Math.random() * H,
        len: 8 + Math.random() * 22,
        sp: 5 + Math.random() * 11,
      }));
    };

    const draw = () => {
      t += 1;

      // Sky: deep gradient with two light-pollution blooms.
      const sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, '#04060c');
      sky.addColorStop(0.55, '#0a1020');
      sky.addColorStop(1, '#0d1526');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, H);

      const bloom1 = ctx.createRadialGradient(W * 0.26, H * 0.66, 0, W * 0.26, H * 0.66, H * 0.7);
      bloom1.addColorStop(0, 'rgba(34,211,238,0.13)');
      bloom1.addColorStop(1, 'transparent');
      ctx.fillStyle = bloom1;
      ctx.fillRect(0, 0, W, H);

      const bloom2 = ctx.createRadialGradient(W * 0.78, H * 0.6, 0, W * 0.78, H * 0.6, H * 0.6);
      bloom2.addColorStop(0, 'rgba(167,139,250,0.12)');
      bloom2.addColorStop(1, 'transparent');
      ctx.fillStyle = bloom2;
      ctx.fillRect(0, 0, W, H);

      // Occasional lightning sweep.
      if (flash > 0) {
        ctx.fillStyle = `rgba(180,225,255,${flash * 0.1})`;
        ctx.fillRect(0, 0, W, H);
        flash -= 0.045;
      } else if (Math.random() < 0.0016) {
        flash = 1;
      }

      // Buildings, painted far → near so nearer towers occlude.
      buildings
        .slice()
        .sort((a, b) => a.depth - b.depth)
        .forEach((b) => {
          const drift = (t * LAYERS[Math.round(b.depth * 2)].speed) % (W + 200);
          const x = ((b.x - drift + W + 200) % (W + 200)) - 100;
          const layer = LAYERS[Math.round(b.depth * 2)];
          const y = H - b.h;

          const body = ctx.createLinearGradient(x, y, x, H);
          body.addColorStop(0, `hsla(${b.hue}, 42%, ${12 + b.depth * 6}%, ${layer.alpha})`);
          body.addColorStop(1, `hsla(${b.hue}, 30%, ${5 + b.depth * 3}%, ${layer.alpha})`);
          ctx.fillStyle = body;
          ctx.fillRect(x, y, b.w, b.h);

          // Neon roofline.
          ctx.strokeStyle = `hsla(${b.hue}, 95%, ${64 + b.depth * 10}%, ${0.18 + b.depth * 0.42})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(x, y + 0.5);
          ctx.lineTo(x + b.w, y + 0.5);
          ctx.stroke();

          // Lit windows, with slow flicker on a few.
          b.windows.forEach((win) => {
            const f = win.flicker
              ? win.on * (0.45 + 0.55 * Math.abs(Math.sin(t * 0.02 * win.flicker + win.x)))
              : win.on;
            ctx.fillStyle = `hsla(${b.hue + 16}, 92%, ${68 + b.depth * 8}%, ${f * layer.alpha})`;
            ctx.fillRect(x + win.x, y + win.y, 4, 6);
          });
        });

      // Rain.
      if (!reduce) {
        ctx.strokeStyle = 'rgba(150,205,255,0.3)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        rain.forEach((d) => {
          ctx.moveTo(d.x, d.y);
          ctx.lineTo(d.x - 1.6, d.y + d.len);
          d.y += d.sp * (0.7 + intensity * 0.5);
          d.x -= 0.7;
          if (d.y > H) {
            d.y = -20;
            d.x = Math.random() * W;
          }
        });
        ctx.stroke();
      }

      // Ground haze to seat the skyline.
      const haze = ctx.createLinearGradient(0, H * 0.72, 0, H);
      haze.addColorStop(0, 'transparent');
      haze.addColorStop(1, 'rgba(4,6,12,0.92)');
      ctx.fillStyle = haze;
      ctx.fillRect(0, H * 0.7, W, H * 0.3);

      raf.current = requestAnimationFrame(draw);
    };

    build();
    draw();
    window.addEventListener('resize', build);

    return () => {
      cancelAnimationFrame(raf.current);
      window.removeEventListener('resize', build);
    };
  }, [intensity]);

  return (
    <canvas
      ref={ref}
      aria-hidden
      className="fixed inset-0 -z-10 h-full w-full"
      style={{ display: 'block' }}
    />
  );
};
