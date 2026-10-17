'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useGame } from '@/store/useGameStore';
import { sfx } from '@/lib/sfx';
import { net } from '@/lib/net';
import { IconBolt, IconTarget } from '@/components/ui/Icons';

/**
 * The keep-siege duel.
 *
 * When an attack is about to finish an enemy keep, the defender gets a chance
 * to save it in a Pong match. Winner keeps the keep; loser loses its grip on
 * the outpost and hands the attacker 10 troops.
 *
 * Networking: the HOST owns the ball. It simulates, and broadcasts position
 * each frame in the `vx`/`vy` fields. The guest only reports its paddle. That
 * keeps one authority for the ball so the two screens can never disagree on
 * the score.
 */

const W = 560;
const H = 360;
const PADDLE_H = 64;
const PADDLE_W = 8;
const BALL_R = 7;
const WIN_SCORE = 5;

export const PongDuel: React.FC = () => {
  const duel = useGame((s) => s.duel);
  const playerId = useGame((s) => s.playerId);
  const updateDuel = useGame((s) => s.updateDuel);
  const endDuel = useGame((s) => s.endDuel);
  const pushToast = useGame((s) => s.pushToast);

  const [localPaddle, setLocalPaddle] = useState(50);
  const paddleRef = useRef(50);
  const rafRef = useRef(0);
  const ballRef = useRef({ x: 50, y: 50, vx: 0.9, vy: 0.5 });
  const keysRef = useRef<{ up: boolean; down: boolean }>({ up: false, down: false });

  const isHost = duel?.host === playerId;
  const playing = duel?.state === 'playing';

  /* --- keyboard steering --- */
  useEffect(() => {
    if (!playing) return;
    const down = (e: KeyboardEvent) => {
      if (e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp') keysRef.current.up = true;
      if (e.key === 's' || e.key === 'S' || e.key === 'ArrowDown') keysRef.current.down = true;
    };
    const up = (e: KeyboardEvent) => {
      if (e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp') keysRef.current.up = false;
      if (e.key === 's' || e.key === 'S' || e.key === 'ArrowDown') keysRef.current.down = false;
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, [playing]);

  /* --- host: own the ball --- */
  useEffect(() => {
    if (!playing || !isHost) return;

    let last = performance.now();
    const step = (now: number) => {
      const dt = Math.min(48, now - last) / 16.67;
      last = now;

      const b = ballRef.current;
      b.x += b.vx * dt;
      b.y += b.vy * dt;

      /* Walls */
      if (b.y < 0) {
        b.y = 0;
        b.vy = Math.abs(b.vy);
      }
      if (b.y > 100) {
        b.y = 100;
        b.vy = -Math.abs(b.vy);
      }

      /* Paddle collisions. Host paddle is on the left, guest on the right. */
      const myY = paddleRef.current;
      const guestY = useGame.getState().duel?.guestY ?? 50;

      if (b.x <= 4 && b.vx < 0) {
        if (Math.abs(b.y - myY) < PADDLE_H / 2 / 3.6) {
          b.vx = Math.abs(b.vx) * 1.04;
          b.vy += (b.y - myY) * 0.06;
          sfx.key();
        } else if (b.x < -2) {
          /* Guest scores */
          const d = useGame.getState().duel;
          if (d) {
            const sg = d.scoreGuest + 1;
            updateDuel({ scoreGuest: sg });
            sfx.deny();
            if (sg >= WIN_SCORE) return finish(d.host, d.guest);
          }
          resetBall(-1);
        }
      }

      if (b.x >= 96 && b.vx > 0) {
        if (Math.abs(b.y - guestY) < PADDLE_H / 2 / 3.6) {
          b.vx = -Math.abs(b.vx) * 1.04;
          b.vy += (b.y - guestY) * 0.06;
          sfx.key();
        } else if (b.x > 102) {
          const d = useGame.getState().duel;
          if (d) {
            const sh = d.scoreHost + 1;
            updateDuel({ scoreHost: sh });
            sfx.confirm();
            if (sh >= WIN_SCORE) return finish(d.guest, d.host);
          }
          resetBall(1);
        }
      }

      /* Clamp ball speed so rallies stay playable. */
      b.vx = Math.max(-2.4, Math.min(2.4, b.vx));
      b.vy = Math.max(-1.8, Math.min(1.8, b.vy));

      /* Broadcast: position packed into vx/vy, paddle in y. */
      net.send({ t: 'pong:state', from: playerId, y: myY, vx: b.x, vy: b.y });

      rafRef.current = requestAnimationFrame(step);
    };

    const resetBall = (dir: number) => {
      ballRef.current = { x: 50, y: 20 + Math.random() * 60, vx: 0.9 * dir, vy: (Math.random() - 0.5) * 0.9 };
      updateDuel({ ballX: ballRef.current.x, ballY: ballRef.current.y });
    };

    const finish = (winner: string, loser: string) => {
      cancelAnimationFrame(rafRef.current);
      net.send({ t: 'pong:result', from: playerId, winner, loser });
      updateDuel({ state: 'done', winner });
    };

    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, isHost, playerId]);

  /* --- both sides: move own paddle, relay it --- */
  useEffect(() => {
    if (!playing) return;
    let last = performance.now();
    const id = setInterval(() => {
      const now = performance.now();
      const dt = Math.min(48, now - last) / 16.67;
      last = now;

      const k = keysRef.current;
      if (k.up || k.down) {
        const next = Math.max(6, Math.min(94, paddleRef.current + (k.down ? 1 : -1) * 1.5 * dt));
        paddleRef.current = next;
        setLocalPaddle(next);
        net.send({ t: 'pong:state', from: playerId, y: next, vx: 0, vy: 0 });
      }
    }, 33);
    return () => clearInterval(id);
  }, [playing, playerId]);

  /* --- guest: mirror the host's ball --- */
  useEffect(() => {
    if (!playing || isHost) return;
    const id = setInterval(() => {
      const d = useGame.getState().duel;
      if (d) ballRef.current = { ...ballRef.current, x: d.ballX, y: d.ballY };
    }, 40);
    return () => clearInterval(id);
  }, [playing, isHost]);

  /* --- resolution --- */
  useEffect(() => {
    if (!duel || duel.state !== 'done') return;
    const won = duel.winner === playerId;
    pushToast(won ? 'DÜELLO KAZANILDI — kale korundu' : 'DÜELLO KAYBEDİLDİ — 10 birlik düşmana', won ? 'good' : 'warn');
    const t = setTimeout(() => endDuel(), 2600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duel?.state, duel?.winner]);

  /* --- waiting screen --- */
  if (!duel) return null;

  if (duel.state === 'pending') {
    const iAmGuest = duel.guest === playerId;
    return (
      <div className="fixed inset-0 z-[9994] flex items-center justify-center bg-black/80 backdrop-blur-md">
        <div className="panel anim-rise w-full max-w-md p-7 text-center">
          <IconTarget size={40} className="mx-auto mb-4 text-[var(--neon-rose)]" />
          <h2 className="text-xl font-black uppercase tracking-wider text-white">KALE KUŞATMASI</h2>
          <p className="mt-3 text-sm leading-relaxed text-[var(--text-mid)]">
            <span className="font-bold text-[var(--neon-rose)]">{duel.hostName}</span> son savunmaya
            geçti. Kaybeden kule hakimiyetini bırakır ve düşmana 10 birlik verir.
          </p>
          {iAmGuest ? (
            <button
              onClick={() => {
                useGame.getState().acceptDuel(duel.host, duel.hostName);
                sfx.confirm();
              }}
              className="mt-6 w-full rounded-xl border-2 border-[var(--neon-cyan)] bg-[rgba(34,211,238,0.14)] py-4 text-sm font-black uppercase tracking-[0.2em] text-[var(--neon-cyan)]"
            >
              DÜELLOYU KABUL ET
            </button>
          ) : (
            <p className="anim-pulse mt-6 text-[11px] uppercase tracking-[0.2em] text-[var(--neon-amber)]">
              rakip bekleniyor...
            </p>
          )}
          <button
            onClick={endDuel}
            className="mt-3 w-full py-2 text-[10px] uppercase tracking-widest text-[var(--text-lo)] hover:text-white"
          >
            vazgeç
          </button>
        </div>
      </div>
    );
  }

  /* --- the match --- */
  const d = duel;
  const myPaddle = isHost ? localPaddle : localPaddle;
  const theirPaddle = isHost ? d.guestY : d.hostY;
  const ball = ballRef.current;
  /* The guest reads the mirrored ball straight from the store. */
  const shownBall = isHost ? ball : { x: d.ballX, y: d.ballY };

  return (
    <div className="fixed inset-0 z-[9994] flex items-center justify-center bg-black/85 backdrop-blur-md">
      <div className="panel anim-rise w-full max-w-2xl overflow-hidden">
        {/* Scoreboard */}
        <div className="flex items-center justify-between border-b border-[var(--line)] px-6 py-4">
          <div className="text-left">
            <p className="label">sen</p>
            <p className="text-lg font-black text-[var(--neon-cyan)]">{d.host === playerId ? d.hostName : d.guestName}</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="stat text-4xl font-black text-[var(--neon-cyan)]">
              {d.host === playerId ? d.scoreHost : d.scoreGuest}
            </span>
            <span className="text-2xl text-[var(--text-lo)]">:</span>
            <span className="stat text-4xl font-black text-[var(--neon-rose)]">
              {d.host === playerId ? d.scoreGuest : d.scoreHost}
            </span>
          </div>
          <div className="text-right">
            <p className="label">rakip</p>
            <p className="text-lg font-black text-[var(--neon-rose)]">
              {d.host === playerId ? d.guestName : d.hostName}
            </p>
          </div>
        </div>

        {/* Field */}
        <div className="grid-bg relative" style={{ aspectRatio: `${W} / ${H}` }}>
          <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full">
            <defs>
              <filter id="pg" x="-80%" y="-80%" width="260%" height="260%">
                <feGaussianBlur stdDeviation="4" result="b" />
                <feMerge>
                  <feMergeNode in="b" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Net */}
            <line x1={W / 2} y1="0" x2={W / 2} y2={H} stroke="#38bdf8" strokeOpacity="0.25" strokeWidth="2" strokeDasharray="8 10" />
            <circle cx={W / 2} cy={H / 2} r="46" fill="none" stroke="#38bdf8" strokeOpacity="0.12" strokeWidth="1.5" />

            {/* My paddle (left) */}
            <rect
              x={12}
              y={(myPaddle / 100) * (H - PADDLE_H)}
              width={PADDLE_W}
              height={PADDLE_H}
              rx="4"
              fill="#22d3ee"
              filter="url(#pg)"
            />
            {/* Opponent paddle (right) */}
            <rect
              x={W - 20}
              y={(theirPaddle / 100) * (H - PADDLE_H)}
              width={PADDLE_W}
              height={PADDLE_H}
              rx="4"
              fill="#f43f5e"
              filter="url(#pg)"
            />

            {/* Ball */}
            <circle cx={(shownBall.x / 100) * W} cy={(shownBall.y / 100) * H} r={BALL_R} fill="#fff" filter="url(#pg)" />
          </svg>

            {/* Instructions overlay */}
            <div className="pointer-events-none absolute inset-x-0 bottom-3 text-center">
              <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-lo)]">
                <IconBolt size={10} className="mr-1 inline" />
                W / S veya ok tuşları — ilk {WIN_SCORE} sayı kazanır
              </p>
            </div>
          </div>

        {duel.state === 'done' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70">
            <div className="text-center">
              <p
                className="text-4xl font-black uppercase tracking-wider"
                style={{ color: duel.winner === playerId ? 'var(--neon-green)' : 'var(--neon-rose)' }}
              >
                {duel.winner === playerId ? 'KALE KORUNDU' : 'KALE DÜŞTÜ'}
              </p>
              <p className="mt-2 text-xs text-[var(--text-mid)]">
                {duel.winner === playerId ? 'Kule sende kaldı' : 'Kuleyi kaybettin — 10 birlik düşmana'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
