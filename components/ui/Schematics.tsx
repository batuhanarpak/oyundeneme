'use client';

import React from 'react';

/**
 * Mode-specific artwork for The Breach.
 *
 * Each role gets a schematic styled after the tool it would really use:
 * a floor plan for the Ghost, a spectrum analyser for the Oracle, and a
 * power/network diagram for the Architect.
 */

/* ============================================================
   GHOST — isometric facility floor plan
   ============================================================ */

export const FacilityMap: React.FC<{
  /** Grid cell index the player marker sits on. */
  playerCell: number;
  /** Grid cell index of the objective. */
  targetCell: number;
  accent?: string;
}> = ({ playerCell, targetCell, accent = '#fbbf24' }) => {
  const COLS = 10;
  const ROWS = 6;
  const cell = 28;

  /* Corridors: everything except a few sealed rooms. */
  const isWall = (i: number) => {
    const r = Math.floor(i / COLS);
    const c = i % COLS;
    return (r === 1 && c >= 2 && c <= 4) || (r === 4 && c >= 6 && c <= 8) || (r === 2 && c === 7);
  };

  return (
    <svg viewBox={`0 0 ${COLS * cell} ${ROWS * cell}`} className="w-full" role="img" aria-label="Tesis haritası">
      <defs>
        <pattern id="floor" width="8" height="8" patternUnits="userSpaceOnUse">
          <path d="M8 0H0V8" fill="none" stroke={accent} strokeOpacity="0.07" strokeWidth="0.5" />
        </pattern>
      </defs>
      <rect width={COLS * cell} height={ROWS * cell} fill="#05080f" />
      <rect width={COLS * cell} height={ROWS * cell} fill="url(#floor)" />

      {Array.from({ length: COLS * ROWS }, (_, i) => {
        const r = Math.floor(i / COLS);
        const c = i % COLS;
        const x = c * cell;
        const y = r * cell;
        const wall = isWall(i);
        const isPlayer = i === playerCell;
        const isTarget = i === targetCell;

        return (
          <g key={i}>
            <rect
              x={x + 1.5}
              y={y + 1.5}
              width={cell - 3}
              height={cell - 3}
              rx="2"
              fill={wall ? 'rgba(148,197,255,0.14)' : 'rgba(148,197,255,0.03)'}
              stroke={wall ? 'rgba(148,197,255,0.25)' : 'rgba(148,197,255,0.1)'}
              strokeWidth="0.7"
            />
            {isTarget && (
              <>
                <rect
                  x={x + 4}
                  y={y + 4}
                  width={cell - 8}
                  height={cell - 8}
                  rx="2"
                  fill="rgba(74,222,128,0.2)"
                  stroke="#4ade80"
                  strokeWidth="1.4"
                />
                <circle cx={x + cell / 2} cy={y + cell / 2} r="3" fill="#4ade80" />
              </>
            )}
            {isPlayer && (
              <>
                <circle cx={x + cell / 2} cy={y + cell / 2} r="6.5" fill={accent} fillOpacity="0.9" />
                <circle cx={x + cell / 2} cy={y + cell / 2} r="11" fill="none" stroke={accent} strokeOpacity="0.5" strokeWidth="1.2" />
                <circle cx={x + cell / 2} cy={y + cell / 2} r="15" fill="none" stroke={accent} strokeOpacity="0.2" strokeWidth="1" />
              </>
            )}
          </g>
        );
      })}

      {/* Sight cone from the player marker */}
      <path
        d={`M${(playerCell % COLS) * cell + cell / 2} ${Math.floor(playerCell / COLS) * cell + cell / 2}
           L${(playerCell % COLS) * cell + cell / 2 - 34} ${Math.floor(playerCell / COLS) * cell - 24}
           L${(playerCell % COLS) * cell + cell / 2 + 34} ${Math.floor(playerCell / COLS) * cell - 24} Z`}
        fill={accent}
        fillOpacity="0.1"
      />
    </svg>
  );
};

/* ============================================================
   ORACLE — spectrum analyser
   ============================================================ */

export const SpectrumAnalyser: React.FC<{ phase: number; accent?: string }> = ({
  phase,
  accent = '#a78bfa',
}) => {
  const W = 320;
  const H = 90;
  const BARS = 56;

  const bars = Array.from({ length: BARS }, (_, i) => {
    const base = Math.sin(i * 0.42 + phase) * 0.5 + 0.5;
    const detail = Math.sin(i * 1.7 + phase * 2.3) * 0.5 + 0.5;
    return Math.max(0.06, base * 0.75 + detail * 0.25);
  });

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Sinyal spektrumu">
      <rect width={W} height={H} fill="#04060d" />
      {/* Graticule */}
      {[0.25, 0.5, 0.75].map((f) => (
        <line key={f} x1="0" y1={H * f} x2={W} y2={H * f} stroke={accent} strokeOpacity="0.1" strokeWidth="0.6" />
      ))}
      {Array.from({ length: 8 }, (_, i) => (
        <line key={i} x1={(W / 8) * i} y1="0" x2={(W / 8) * i} y2={H} stroke={accent} strokeOpacity="0.08" strokeWidth="0.6" />
      ))}

      {bars.map((v, i) => {
        const h = v * (H - 12);
        const x = (W / BARS) * i + 1.5;
        const w = W / BARS - 3;
        const peak = v > 0.82;
        return (
          <g key={i}>
            <rect x={x} y={H - h} width={w} height={h} rx="1.5" fill={accent} fillOpacity={peak ? 0.95 : 0.45} />
            {peak && <rect x={x} y={H - h - 3} width={w} height="2" rx="1" fill="#fff" fillOpacity="0.85" />}
          </g>
        );
      })}

      {/* Playhead */}
      <line
        x1={(phase * 14) % W}
        y1="0"
        x2={(phase * 14) % W}
        y2={H}
        stroke="#fff"
        strokeOpacity="0.3"
        strokeWidth="1"
      />
    </svg>
  );
};

/* ============================================================
   ARCHITECT — power / network schematic
   ============================================================ */

export const CircuitDiagram: React.FC<{
  /** Which breakers are currently closed. */
  open: number[];
  solution: number[];
  accent?: string;
}> = ({ open, solution, accent = '#4ade80' }) => {
  const W = 340;
  const H = 120;
  const total = Math.max(solution.length, open.length, 5);
  const spacing = W / (total + 1);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Enerji şebekesi şeması">
      <rect width={W} height={H} fill="#040a07" />

      {/* Bus bar along the top */}
      <line x1="14" y1="26" x2={W - 14} y2="26" stroke={accent} strokeOpacity="0.5" strokeWidth="2" />
      <text x="14" y="17" fill={accent} fillOpacity="0.7" fontSize="8" fontFamily="monospace">
        ANA BARA
      </text>

      {/* Ground rail */}
      <line x1="14" y1={H - 12} x2={W - 14} y2={H - 12} stroke={accent} strokeOpacity="0.35" strokeWidth="2" />

      {Array.from({ length: total }, (_, i) => {
        const x = spacing * (i + 1);
        const isOpen = open.includes(i);
        const isTarget = solution.includes(i);

        return (
          <g key={i}>
            {/* Feed from the bus bar */}
            <line x1={x} y1="26" x2={x} y2="46" stroke={accent} strokeOpacity={isOpen ? 0.85 : 0.2} strokeWidth="1.6" />
            {/* Breaker symbol */}
            <rect
              x={x - 9}
              y="46"
              width="18"
              height="14"
              rx="2"
              fill={isOpen ? `${accent}33` : '#0a1210'}
              stroke={accent}
              strokeOpacity={isOpen ? 1 : 0.35}
              strokeWidth="1.3"
            />
            {/* Closed contact */}
            <line
              x1={x - 5}
              y1="53"
              x2={isOpen ? x + 5 : x + 4}
              y2={isOpen ? 53 : 60}
              stroke={accent}
              strokeOpacity={isOpen ? 1 : 0.3}
              strokeWidth="1.6"
              strokeLinecap="round"
            />
            <text x={x} y="72" fill={accent} fillOpacity="0.55" fontSize="7" textAnchor="middle" fontFamily="monospace">
              H{i + 1}
            </text>
            {/* Drop to the ground rail */}
            <line x1={x} y1="60" x2={x} y2={H - 12} stroke={accent} strokeOpacity={isOpen ? 0.7 : 0.15} strokeWidth="1.4" />

            {/* Load bulb — lights when live */}
            <circle
              cx={x}
              cy={H - 26}
              r="5"
              fill={isOpen ? accent : 'transparent'}
              fillOpacity={isOpen ? 0.85 : 1}
              stroke={accent}
              strokeOpacity="0.5"
              strokeWidth="1.2"
            />

            {/* Highlight the correct breaker once the puzzle is solved */}
            {isTarget && (
              <circle cx={x} cy="53" r="15" fill="none" stroke={accent} strokeOpacity="0.35" strokeWidth="1" strokeDasharray="3 3" />
            )}
          </g>
        );
      })}
    </svg>
  );
};

/* ============================================================
   Tower Typing — the keep being defended
   ============================================================ */

export const TowerArt: React.FC<{ hp: number; max: number; accent?: string }> = ({
  hp,
  max,
  accent = '#fbbf24',
}) => {
  const pct = Math.max(0, Math.min(1, hp / max));
  const damaged = 1 - pct;

  return (
    <svg viewBox="0 0 80 110" className="w-full" role="img" aria-label="Kule">
      {/* Ground */}
      <ellipse cx="40" cy="104" rx="34" ry="6" fill={accent} fillOpacity="0.14" />

      {/* Main keep */}
      <path d="M22 102V46h36v56Z" fill="#0b0f18" stroke={accent} strokeOpacity={0.6} strokeWidth="1.4" />
      {/* Crenellations */}
      <path d="M20 46V34h7v7h7v-7h12v7h7v-7h7v12Z" fill="#0e1420" stroke={accent} strokeOpacity="0.7" strokeWidth="1.3" />
      {/* Upper tower */}
      <path d="M32 34V20h16v14Z" fill="#0b0f18" stroke={accent} strokeOpacity="0.55" strokeWidth="1.2" />
      <path d="M30 20 40 6l10 14Z" fill={accent} fillOpacity="0.35" stroke={accent} strokeWidth="1.2" />

      {/* Windows — lit in proportion to remaining health */}
      {[
        [34, 56],
        [46, 56],
        [34, 72],
        [46, 72],
        [40, 88],
      ].map(([x, y], i) => {
        const lit = i / 5 < pct + 0.15;
        return (
          <rect
            key={i}
            x={x - 3}
            y={y}
            width="6"
            height="8"
            rx="1.5"
            fill={lit ? accent : '#05080f'}
            fillOpacity={lit ? 0.85 : 1}
            stroke={accent}
            strokeOpacity="0.4"
            strokeWidth="0.8"
          />
        );
      })}

      {/* Damage: cracks appear as health falls */}
      {damaged > 0.3 && (
        <path d="M46 48l-5 12 6 9-4 13" fill="none" stroke="#f43f5e" strokeOpacity={Math.min(0.9, damaged)} strokeWidth="1.4" strokeLinecap="round" />
      )}
      {damaged > 0.6 && (
        <path d="M30 62l7 10-6 12" fill="none" stroke="#f43f5e" strokeOpacity={Math.min(0.9, damaged - 0.3)} strokeWidth="1.4" strokeLinecap="round" />
      )}

      {/* Health bar above the keep */}
      <rect x="20" y="0" width="40" height="4" rx="2" fill="#ffffff18" />
      <rect
        x="20"
        y="0"
        width={40 * pct}
        height="4"
        rx="2"
        fill={pct > 0.5 ? '#4ade80' : pct > 0.25 ? '#fbbf24' : '#f43f5e'}
      />
    </svg>
  );
};
