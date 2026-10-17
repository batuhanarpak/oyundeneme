'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { SoldierWire } from '@/lib/net';

/**
 * Shared battlefield — a node network rather than a straight lane.
 *
 * Map layout (per player): a home keep plus neutral outposts strung between
 * the keeps. Solving a word banks a unit in your HOME garrison; drag that
 * stack onto an outpost to capture it, then drag onto an enemy node to march.
 *
 * Soldier positions are derived from `spawnedAt` + `duration`, so all clients
 * render the same march without streaming coordinates — and because the clock
 * is shared (same machine), opposing units meet at the same place on every
 * screen, which is what makes deterministic combat possible.
 */

const W = 960;
const H = 580;

export const HOME_HP = 100;

/**
 * Keeps must sit clear of the viewBox edges: each one carries its nameplate,
 * HP readout and garrison badge BELOW it, which is ~100px of furniture. The
 * bottom keep previously sat at y=470 in a 540-tall box, so all of it was
 * clipped and the garrison counter was invisible.
 */
const HOME_SLOTS = [
  { x: 480, y: 424 },
  { x: 138, y: 96 },
  { x: 822, y: 96 },
];

const OUTPOST_SLOTS = [
  { x: 168, y: 344 },
  { x: 792, y: 344 },
  { x: 480, y: 170 },
  { x: 480, y: 300 },
];

/** Distance at which two hostile units engage. */
export const CLASH_RANGE = 28;

export interface MapPlayer {
  id: string;
  name: string;
  color: string;
  hp: number;
  maxHp: number;
  score: number;
}

export interface Garrison {
  node: string;
  ownerId: string;
  power: number;
  count: number;
}

export interface Burst {
  id: string;
  x: number;
  y: number;
  color: string;
  power: number;
  at: number;
}

export const homeNode = (playerId: string) => `h:${playerId}`;
export const outpostNode = (index: number) => `o:${index}`;

export function slotMap(players: MapPlayer[]): Record<string, number> {
  const ids = players.map((p) => p.id).sort();
  const out: Record<string, number> = {};
  ids.forEach((id, i) => {
    out[id] = i % HOME_SLOTS.length;
  });
  return out;
}

export function nodePos(node: string, slots: Record<string, number>): { x: number; y: number } | null {
  if (node.startsWith('h:')) {
    const idx = slots[node.slice(2)];
    return idx === undefined ? null : HOME_SLOTS[idx];
  }
  if (node.startsWith('o:')) {
    return OUTPOST_SLOTS[Number(node.slice(2))] ?? null;
  }
  return null;
}

/**
 * Bowed path between two nodes. The bow direction comes from a stable hash of
 * the destination node, so a given route looks identical on every client.
 */
export function routePath(a: { x: number; y: number }, b: { x: number; y: number }, node: string) {
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const hash = node.split('').reduce((h, c) => h + c.charCodeAt(0), 0);
  const sign = hash % 2 === 0 ? 1 : -1;
  const bow = Math.min(46, len * 0.16) * sign;
  return { cx: mx + (-dy / len) * bow, cy: my + (dx / len) * bow };
}

function qbez(t: number, a: number, c: number, b: number) {
  const u = 1 - t;
  return u * u * a + 2 * u * t * c + t * t * b;
}

export function soldierPos(
  s: SoldierWire,
  slots: Record<string, number>,
  now: number
): { x: number; y: number; angle: number; t: number } | null {
  const a = nodePos(s.fromNode, slots);
  const b = nodePos(s.toNode, slots);
  if (!a || !b) return null;

  /* `spawnedAt` may sit in the future for staggered deployments. */
  if (now < s.spawnedAt) return { x: a.x, y: a.y, angle: 0, t: 0 };

  const t = Math.max(0, Math.min(1, (now - s.spawnedAt) / s.duration));
  const { cx, cy } = routePath(a, b, s.toNode);

  const x = qbez(t, a.x, cx, b.x);
  const y = qbez(t, a.y, cy, b.y);
  const t2 = Math.min(1, t + 0.02);
  const x2 = qbez(t2, a.x, cx, b.x);
  const y2 = qbez(t2, a.y, cy, b.y);

  return { x, y, angle: (Math.atan2(y2 - y, x2 - x) * 180) / Math.PI, t };
}

/**
 * Resolve unit-versus-unit combat for one tick.
 *
 * Deliberately deterministic: given the same soldier list every client derives
 * the same casualties, so no messages are needed to keep the battle in sync.
 * Ties are broken by id, and pairs are walked in id order, so the outcome can
 * never depend on iteration order.
 */
export function resolveClashes(
  soldiers: SoldierWire[],
  slots: Record<string, number>,
  now: number
): { dead: string[]; bursts: Burst[] } {
  const pos = new Map<string, { x: number; y: number }>();
  soldiers.forEach((s) => {
    const p = soldierPos(s, slots, now);
    if (p) pos.set(s.id, p);
  });

  const dead = new Set<string>();
  const bursts: Burst[] = [];

  const sorted = [...soldiers].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

  for (let i = 0; i < sorted.length; i++) {
    const a = sorted[i];
    if (dead.has(a.id)) continue;
    const pa = pos.get(a.id);
    if (!pa) continue;

    for (let j = i + 1; j < sorted.length; j++) {
      const b = sorted[j];
      if (dead.has(b.id)) continue;
      if (b.ownerId === a.ownerId) continue; // same side never fights
      const pb = pos.get(b.id);
      if (!pb) continue;

      if (Math.hypot(pa.x - pb.x, pa.y - pb.y) > CLASH_RANGE) continue;

      /* Stronger unit wins; equal strength falls to the lower id. */
      const aWins = a.power > b.power || (a.power === b.power && a.id < b.id);
      const loser = aWins ? b : a;

      dead.add(loser.id);
      bursts.push({
        id: `b-${loser.id}-${Math.round(now / 250)}`,
        x: (pa.x + pb.x) / 2,
        y: (pa.y + pb.y) / 2,
        color: loser.color,
        power: loser.power,
        at: now,
      });

      if (!aWins) break; // `a` is gone; stop testing it against others
    }
  }

  return { dead: Array.from(dead), bursts };
}

interface Props {
  players: MapPlayer[];
  soldiers: SoldierWire[];
  garrisons: Garrison[];
  outpostOwners: Record<number, string>;
  bursts: Burst[];
  meId: string;
  onRetarget: (soldierId: string, toNode: string) => void;
  onTransfer: (fromNode: string, toNode: string, count: number) => void;
  clock: number;
}

interface DragState {
  kind: 'soldier' | 'stack';
  id: string;
  from: string;
  count: number;
  x: number;
  y: number;
  /** Where the pointer went down, so a plain click isn't read as a drag. */
  sx: number;
  sy: number;
  moved: boolean;
}

/** Pointer travel required before a press counts as a drag. */
const DRAG_THRESHOLD = 10;

export const Battlefield: React.FC<Props> = ({
  players,
  soldiers,
  garrisons,
  outpostOwners,
  bursts,
  meId,
  onRetarget,
  onTransfer,
  clock,
}) => {
  const slots = useMemo(() => slotMap(players), [players]);
  const svgRef = useRef<SVGSVGElement>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [hoverNode, setHoverNode] = useState<string | null>(null);

  /* Keep the latest drag/hover readable from the window-level pointerup
     listener without re-binding it on every mouse move. */
  const dragRef = useRef<DragState | null>(null);
  const hoverRef = useRef<string | null>(null);
  dragRef.current = drag;
  hoverRef.current = hoverNode;

  const byId = useMemo(() => {
    const m: Record<string, MapPlayer> = {};
    players.forEach((p) => (m[p.id] = p));
    return m;
  }, [players]);

  const garrisonAt = useMemo(() => {
    const m: Record<string, Garrison> = {};
    garrisons.forEach((g) => (m[g.node] = g));
    return m;
  }, [garrisons]);

  const toSvg = (clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const r = svg.getBoundingClientRect();
    return {
      x: ((clientX - r.left) / r.width) * W,
      y: ((clientY - r.top) / r.height) * H,
    };
  };

  const nodeUnder = (x: number, y: number, excludeNode: string): string | null => {
    let best: string | null = null;
    let bestD = 74;

    players.forEach((p) => {
      if (p.hp <= 0) return;
      const n = homeNode(p.id);
      if (n === excludeNode) return;
      const s = HOME_SLOTS[slots[p.id] ?? 0];
      const d = Math.hypot(s.x - x, s.y - y);
      if (d < bestD) {
        bestD = d;
        best = n;
      }
    });

    OUTPOST_SLOTS.forEach((s, i) => {
      const n = outpostNode(i);
      if (n === excludeNode) return;
      const d = Math.hypot(s.x - x, s.y - y);
      if (d < Math.min(bestD, 56)) {
        bestD = d;
        best = n;
      }
    });

    return best;
  };

  /* --- capture-based drag ---------------------------------------------
     Pointer capture on the SVG root is what makes this reliable: without it,
     `pointermove` follows whatever element sits under the cursor, so the drag
     silently dies the moment the pointer leaves the unit it grabbed. */
  const beginDrag = (
    e: React.PointerEvent,
    state: { kind: 'soldier' | 'stack'; id: string; from: string; count: number }
  ) => {
    e.stopPropagation();
    const pt = toSvg(e.clientX, e.clientY);
    const next: DragState = { ...state, x: pt.x, y: pt.y, sx: pt.x, sy: pt.y, moved: false };

    try {
      svgRef.current?.setPointerCapture(e.pointerId);
    } catch {
      /* capture is best-effort; the window listener below is the fallback */
    }
    dragRef.current = next;
    setDrag(next);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    const { x, y } = toSvg(e.clientX, e.clientY);

    /* Until the pointer travels far enough, this is still a click. */
    const moved = d.moved || Math.hypot(x - d.sx, y - d.sy) > DRAG_THRESHOLD;

    const next: DragState = { ...d, x, y, moved };
    dragRef.current = next;
    setDrag(next);
    setHoverNode(nodeUnder(x, y, d.from));
  };

  /**
   * Ends the drag. Registered on the SVG *and* on window; the `dragRef` guard
   * makes it idempotent so a pointerup that reaches both handlers does not
   * fire the transfer twice.
   */
  const commit = () => {
    const d = dragRef.current;
    const target = hoverRef.current;
    if (!d) return;
    dragRef.current = null;
    hoverRef.current = null;
    if (d.moved && target) {
      if (d.kind === 'soldier') onRetarget(d.id, target);
      else onTransfer(d.from, target, d.count);
    }
    setDrag(null);
    setHoverNode(null);
  };

  /* Safety net: a pointer released outside the SVG still ends the drag. */
  useEffect(() => {
    const onUp = () => {
      if (dragRef.current) commit();
    };
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const now = Date.now();
  const live = soldiers
    .map((s) => ({ s, p: soldierPos(s, slots, now) }))
    .filter(
      (x): x is { s: SoldierWire; p: NonNullable<ReturnType<typeof soldierPos>> } =>
        x.p !== null && x.p.t < 1
    );

  const routes: { key: string; d: string }[] = [];
  players.forEach((p) => {
    const a = HOME_SLOTS[slots[p.id] ?? 0];
    players.forEach((q) => {
      if (p.id === q.id) return;
      const b = HOME_SLOTS[slots[q.id] ?? 0];
      const { cx, cy } = routePath(a, b, homeNode(q.id));
      routes.push({ key: `${p.id}-${q.id}`, d: `M${a.x} ${a.y} Q${cx} ${cy} ${b.x} ${b.y}` });
    });
    OUTPOST_SLOTS.forEach((o, i) => {
      const { cx, cy } = routePath(a, o, outpostNode(i));
      routes.push({ key: `${p.id}-o${i}`, d: `M${a.x} ${a.y} Q${cx} ${cy} ${o.x} ${o.y}` });
    });
  });

  const dragOrigin = drag ? nodePos(drag.from, slots) : null;

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${W} ${H}`}
      className="w-full touch-none select-none"
      style={{ aspectRatio: `${W} / ${H}` }}
      onPointerMove={onPointerMove}
      onPointerUp={commit}
      role="img"
      aria-label="Ortak savaş haritası"
    >
      <defs>
        <pattern id="bf-grid" width="32" height="32" patternUnits="userSpaceOnUse">
          <path d="M32 0H0V32" fill="none" stroke="#38bdf8" strokeOpacity="0.06" strokeWidth="1" />
        </pattern>
        <radialGradient id="bf-void" cx="50%" cy="48%" r="72%">
          <stop offset="0%" stopColor="#0b1424" />
          <stop offset="100%" stopColor="#04060c" />
        </radialGradient>
        <filter id="bf-glow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="3.2" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="bf-blast" x="-120%" y="-120%" width="340%" height="340%">
          <feGaussianBlur stdDeviation="6" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <rect width={W} height={H} fill="url(#bf-void)" />
      <rect width={W} height={H} fill="url(#bf-grid)" />

      {routes.map((r) => (
        <path
          key={r.key}
          d={r.d}
          fill="none"
          stroke="#38bdf8"
          strokeOpacity={0.11}
          strokeWidth="1.5"
          strokeDasharray="6 10"
        />
      ))}

      {/* --- outposts --- */}
      {OUTPOST_SLOTS.map((o, i) => {
        const owner = outpostOwners[i];
        const ownerColor = owner ? byId[owner]?.color ?? '#94a3b8' : '#64748b';
        const g = garrisonAt[outpostNode(i)];
        const isMine = owner === meId;
        const isTarget = hoverNode === outpostNode(i);

        return (
          <g key={i}>
            {isTarget && (
              <circle cx={o.x} cy={o.y} r="50" fill="none" stroke="#22d3ee" strokeWidth="2.5" strokeDasharray="7 5" filter="url(#bf-glow)" />
            )}
            <circle cx={o.x} cy={o.y} r="30" fill={`${ownerColor}18`} stroke={`${ownerColor}88`} strokeWidth="1.8" />
            <path
              d={`M${o.x} ${o.y + 16}V${o.y - 4}M${o.x - 12} ${o.y + 10}L${o.x} ${o.y - 16}L${o.x + 12} ${o.y + 10}`}
              fill="none"
              stroke={ownerColor}
              strokeWidth="2.2"
              strokeLinecap="round"
            />
            <circle cx={o.x} cy={o.y - 18} r="3.4" fill={ownerColor} filter="url(#bf-glow)" />

            <text x={o.x} y={o.y + 44} textAnchor="middle" fontSize="10" fontFamily="monospace" fontWeight="700" fill={ownerColor} letterSpacing="1">
              {owner ? `${byId[owner]?.name ?? '?'}${isMine ? ' (SEN)' : ''}` : 'BOŞ'}
            </text>

            {g && g.count > 0 && (
              <g
                style={{ cursor: isMine ? 'grab' : 'default' }}
                onPointerDown={(e) => {
                  if (!isMine) return;
                  beginDrag(e, {
                    kind: 'stack',
                    id: outpostNode(i),
                    from: outpostNode(i),
                    count: g.count,
                  });
                }}
              >
                <rect x={o.x - 20} y={o.y - 8} width="40" height="17" rx="8.5" fill="#04060c" stroke={ownerColor} strokeWidth="1.6" />
                <text x={o.x} y={o.y + 4} textAnchor="middle" fontSize="11" fontWeight="800" fontFamily="monospace" fill={ownerColor}>
                  {g.count}
                </text>
              </g>
            )}
          </g>
        );
      })}

      {/* --- home keeps --- */}
      {players.map((p) => {
        const s = HOME_SLOTS[slots[p.id] ?? 0];
        const pct = Math.max(0, Math.min(1, p.hp / p.maxHp));
        const isMe = p.id === meId;
        const dead = p.hp <= 0;
        const node = homeNode(p.id);
        const isTarget = hoverNode === node;
        const g = garrisonAt[node];

        return (
          <g key={p.id} opacity={dead ? 0.32 : 1}>
            {isTarget && (
              <circle cx={s.x} cy={s.y} r="64" fill="none" stroke={p.color} strokeWidth="2.5" strokeDasharray="8 6" filter="url(#bf-glow)" />
            )}
            <circle cx={s.x} cy={s.y} r="48" fill={`${p.color}14`} stroke={`${p.color}55`} strokeWidth="1.6" />
            <circle cx={s.x} cy={s.y} r="39" fill="none" stroke={`${p.color}33`} strokeWidth="1" strokeDasharray="4 5" />

            <path
              d={`M${s.x - 23} ${s.y + 27}V${s.y - 9}h10v-9h9v9h8v-9h9v9h10V${s.y + 27}Z`}
              fill="#0a0f18"
              stroke={p.color}
              strokeWidth="1.8"
            />
            <path d={`M${s.x - 7} ${s.y - 18}v-13h14v13Z`} fill="#0a0f18" stroke={p.color} strokeWidth="1.5" />
            <path d={`M${s.x - 10} ${s.y - 31} ${s.x} ${s.y - 45} ${s.x + 10} ${s.y - 31}Z`} fill={p.color} fillOpacity="0.6" stroke={p.color} strokeWidth="1.4" />

            {[[-10, 2], [4, 2], [-10, 14], [4, 14]].map(([ox, oy], i) => (
              <rect
                key={i}
                x={s.x + ox}
                y={s.y + oy}
                width="6"
                height="8"
                rx="1"
                fill={i / 4 < pct ? p.color : '#05080f'}
                fillOpacity={i / 4 < pct ? 0.9 : 1}
                stroke={`${p.color}55`}
                strokeWidth="0.8"
              />
            ))}

            <rect x={s.x - 36} y={s.y - 62} width="72" height="6" rx="3" fill="#ffffff1a" />
            <rect
              x={s.x - 36}
              y={s.y - 62}
              width={72 * pct}
              height="6"
              rx="3"
              fill={pct > 0.5 ? '#4ade80' : pct > 0.25 ? '#fbbf24' : '#f43f5e'}
            />

            {/* Nameplate sits ABOVE the keep so the garrison badge below has
                room without colliding. */}
            <text x={s.x} y={s.y - 74} textAnchor="middle" fontSize="13" fontWeight="800" fontFamily="monospace" fill={p.color} letterSpacing="1.5">
              {p.name}
              {isMe ? ' (SEN)' : ''}
            </text>
            <text x={s.x} y={s.y - 48} textAnchor="middle" fontSize="10" fontFamily="monospace" fill="#5b7392">
              {Math.max(0, Math.round(p.hp))} HP · {p.score} P
            </text>

            {/* Garrison badge — the draggable stack. Deliberately large, and
                drawn even at zero so the count is never a mystery. */}
            {(() => {
              const count = g?.count ?? 0;
              return (
                <g
                  style={{ cursor: count > 0 ? 'grab' : 'default' }}
                  onPointerDown={(e) => {
                    if (count <= 0) return;
                    beginDrag(e, { kind: 'stack', id: node, from: node, count });
                  }}
                >
                  {isMe && count > 0 && (
                    <circle
                      cx={s.x}
                      cy={s.y + 50}
                      r="27"
                      fill="none"
                      stroke={p.color}
                      strokeOpacity="0.65"
                      strokeWidth="1.8"
                      strokeDasharray="4 5"
                      className="anim-pulse"
                    />
                  )}
                  <rect
                    x={s.x - 31}
                    y={s.y + 36}
                    width="62"
                    height="28"
                    rx="14"
                    fill="#04060c"
                    stroke={p.color}
                    strokeWidth="2"
                    strokeOpacity={count > 0 ? 1 : 0.35}
                  />
                  <text
                    x={s.x}
                    y={s.y + 55}
                    textAnchor="middle"
                    fontSize="14"
                    fontWeight="800"
                    fontFamily="monospace"
                    fill={p.color}
                    fillOpacity={count > 0 ? 1 : 0.45}
                  >
                    ⚔ {count}
                  </text>
                </g>
              );
            })()}
          </g>
        );
      })}

      {/* --- marching units --- */}
      {live.map(({ s, p }) => {
        const mine = s.ownerId === meId;
        const dragging = drag?.kind === 'soldier' && drag.id === s.id;
        return (
          <g
            key={s.id}
            transform={`translate(${p.x} ${p.y})`}
            opacity={dragging ? 0.4 : 1}
            style={{ cursor: mine ? 'grab' : 'default' }}
            onPointerDown={(e) => {
              if (!mine) return;
              beginDrag(e, { kind: 'soldier', id: s.id, from: s.fromNode, count: 1 });
            }}
          >
            <g transform={`rotate(${p.angle})`}>
              <line x1="-22" y1="0" x2="-8" y2="0" stroke={s.color} strokeOpacity="0.4" strokeWidth="2.4" strokeLinecap="round" />
              <g transform={`scale(${0.85 + s.power * 0.24})`}>
                <path d="M-8 -6 L10 0 L-8 6 Z" fill={s.color} filter="url(#bf-glow)" />
                <path d="M-8 -6 L10 0 L-8 6 Z" fill="none" stroke="#fff" strokeOpacity="0.55" strokeWidth="0.9" />
                <circle cx="-2" cy="0" r="2.4" fill="#04060c" />
              </g>
            </g>
            {Array.from({ length: s.power }, (_, i) => (
              <circle key={i} cx={-9 + i * 7} cy="14" r="2.2" fill={s.color} fillOpacity="0.9" />
            ))}
            {mine && <circle r="20" fill="none" stroke={s.color} strokeOpacity="0.45" strokeWidth="1.2" strokeDasharray="3 4" />}
          </g>
        );
      })}

      {/* --- kill flashes --- */}
      {bursts.map((b) => {
        const age = now - b.at;
        const t = Math.max(0, Math.min(1, age / 700));
        if (t >= 1) return null;
        const r = 8 + t * 30 * (0.6 + b.power * 0.25);
        const opacity = 1 - t;

        return (
          <g key={b.id} pointerEvents="none">
            {/* Shockwave ring */}
            <circle cx={b.x} cy={b.y} r={r} fill="none" stroke="#ffffff" strokeOpacity={opacity * 0.9} strokeWidth={3 * (1 - t) + 0.6} />
            <circle cx={b.x} cy={b.y} r={r * 0.55} fill="none" stroke={b.color} strokeOpacity={opacity} strokeWidth={2.4 * (1 - t) + 0.5} />
            {/* Core flash */}
            <circle cx={b.x} cy={b.y} r={9 * (1 - t) + 2} fill="#ffffff" fillOpacity={opacity * 0.95} filter="url(#bf-blast)" />
            {/* Sparks */}
            {Array.from({ length: 6 }, (_, k) => {
              const ang = (k / 6) * Math.PI * 2 + b.power;
              const d = r * 0.9;
              return (
                <circle
                  key={k}
                  cx={b.x + Math.cos(ang) * d}
                  cy={b.y + Math.sin(ang) * d}
                  r={2.4 * (1 - t)}
                  fill={b.color}
                  fillOpacity={opacity}
                />
              );
            })}
          </g>
        );
      })}

      {/* --- drag feedback --- */}
      {drag && dragOrigin && (
        <g pointerEvents="none">
          <line x1={dragOrigin.x} y1={dragOrigin.y} x2={drag.x} y2={drag.y} stroke="#22d3ee" strokeWidth="2" strokeDasharray="7 5" />
          {drag.kind === 'stack' ? (
            <g>
              <rect x={drag.x - 22} y={drag.y - 11} width="44" height="22" rx="11" fill="#04060c" stroke="#22d3ee" strokeWidth="2" />
              <text x={drag.x} y={drag.y + 5} textAnchor="middle" fontSize="12" fontWeight="800" fontFamily="monospace" fill="#22d3ee">
                {drag.count}
              </text>
            </g>
          ) : (
            <circle cx={drag.x} cy={drag.y} r="9" fill="none" stroke="#22d3ee" strokeWidth="2" />
          )}
        </g>
      )}

      {drag && (
        <text x={W / 2} y="28" textAnchor="middle" fontSize="15" fontWeight="800" fontFamily="monospace" fill="#22d3ee">
          {drag.kind === 'stack'
            ? hoverNode
              ? `BIRAK → ${nodeLabel(hoverNode, byId, meId)}`
              : 'KARAKOL VEYA DÜŞMAN KULESİ SEÇ'
            : hoverNode
              ? `YÖNLENDİR → ${nodeLabel(hoverNode, byId, meId)}`
              : 'HEDEF SEÇ'}
        </text>
      )}
    </svg>
  );
};

function nodeLabel(node: string, byId: Record<string, MapPlayer>, meId: string) {
  if (node.startsWith('h:')) {
    const id = node.slice(2);
    return `${byId[id]?.name ?? '?'}${id === meId ? ' (SEN)' : ''}`;
  }
  return `${Number(node.slice(2)) + 1}. KARAKOL`;
}
