'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useGame, bossHostRef } from '@/store/useGameStore';
import { net } from '@/lib/net';
import { sfx } from '@/lib/sfx';
import { DRONES, SKILLS, formationName, mergeNames } from '@/config/space';
import { SKILL_ICONS } from '@/components/ui/SkillIcons';
import { Btn, Chip } from '@/components/ui/Panel';
import { IconUsers, IconBolt, IconTarget } from '@/components/ui/Icons';
import { alpha } from '@/lib/color';

/**
 * Drone Network defence — the mission room.
 *
 * Every pilot in the room picks a chassis and marks ready. Once EVERYONE present
 * is ready a countdown starts automatically and the squadron launches — no
 * one has to press a separate button.
 *
 * Presence is a repeating `space:join` broadcast (which carries our chassis and
 * ready flag), so a late joiner immediately sees the current roster.
 */

export const LAUNCH_SECONDS = 5;

interface Pilot {
  id: string;
  name: string;
  drone: string;
  color: string;
  ready: boolean;
  at: number;
}

export interface Squadron {
  pilots: Pilot[];
  allReady: boolean;
  /** Seconds remaining before launch, or null when not counting. */
  countdown: number | null;
  /** Formation name for the current roster size. */
  formation: string;
}

/** Tracks who is in the room, and whether the squadron is cleared to launch. */
export function useSquadron(): Squadron {
  const playerId = useGame((s) => s.playerId);
  const name = useGame((s) => s.name);
  const color = useGame((s) => s.color);

  const [others, setOthers] = useState<Pilot[]>([]);

  /* OUR OWN ready flag lives in the store so the caller and this hook agree. */
  const myReady = useGame((s) => s.spaceReady);
  const myDrone = useGame((s) => s.spaceDrone);

  /* Presence + ready broadcast. Re-sent often so late joiners catch up. */
  useEffect(() => {
    if (!playerId) return;
    const announce = () => {
      net.send({
        t: 'space:join',
        from: playerId,
        name,
        drone: myDrone,
        color,
        ready: myReady,
      });
    };
    announce();
    const id = setInterval(announce, 1200);
    return () => clearInterval(id);
  }, [playerId, name, color, myDrone, myReady]);

  /* Listen for other pilots; drop the ones that go quiet. */
  useEffect(() => {
    const off = net.on((msg) => {
      if (msg.t === 'space:join') {
        setOthers((prev) => [
          ...prev.filter((p) => p.id !== msg.from),
          { id: msg.from, name: msg.name, drone: msg.drone, color: msg.color, ready: msg.ready, at: Date.now() },
        ]);
      }
      if (msg.t === 'space:leave') {
        setOthers((prev) => prev.filter((p) => p.id !== msg.from));
      }
    });

    const prune = setInterval(() => {
      setOthers((prev) => prev.filter((p) => Date.now() - p.at < 5000));
    }, 1500);

    return () => {
      off();
      clearInterval(prune);
    };
  }, []);

  /* The roster always includes us, carrying OUR real ready state. */
  const roster = useMemo<Pilot[]>(
    () => [
      { id: playerId, name, drone: myDrone, color, ready: myReady, at: Date.now() },
      ...others.filter((p) => p.id !== playerId),
    ],
    [others, playerId, name, myDrone, color, myReady]
  );

/* Two operators minimum, and every one of them ready. */
  const allReady = roster.length >= 2 && roster.every((p) => p.ready);

  /* Countdown: starts the moment the room is cleared, and cancels if anyone
     backs out. Anchored to a wall-clock deadline so it can't drift. */
  const deadlineRef = useRef<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (allReady) {
      if (deadlineRef.current === null) {
        deadlineRef.current = Date.now() + LAUNCH_SECONDS * 1000;
        sfx.power();
      }
    } else {
      deadlineRef.current = null;
    }
  }, [allReady]);

  const remaining = deadlineRef.current === null
    ? null
    : Math.max(0, Math.ceil((deadlineRef.current - now) / 1000));

  return {
    pilots: roster,
    allReady,
    countdown: allReady ? remaining : null,
    formation: formationName(roster.length),
  };
}

/* ============================================================
   Broadcast helpers
   ============================================================ */

/** Re-announces our chassis from outside the hook. */
export function announcePilot(droneId: string, ready: boolean) {
  const s = useGame.getState();
  if (!s.playerId) return;
  net.send({
    t: 'space:join',
    from: s.playerId,
    name: s.name,
    drone: droneId,
    color: s.color,
    ready,
  });
}

/**
 * Elects the boss owner.
 *
 * Every tab runs its own arena, so the boss must be authoritative somewhere.
 * A race would be possible if each client simply claimed it, so instead the
 * host is elected deterministically: the lowest player id present wins. Both
 * clients compute the same answer without any negotiation.
 */
export function claimBossHost(peerIds: string[]): void {
  const s = useGame.getState();
  if (!s.playerId) return;

  const candidates = [s.playerId, ...peerIds].filter(Boolean).sort();
  const host = candidates[0] ?? s.playerId;

  bossHostRef.value = host;
  useGame.setState({ bossHost: host });
  net.send({ t: 'space:launch', from: s.playerId, at: Date.now(), host });
}

/** Gives up the boss claim so another pilot can adopt it. */
export function releaseBossHost(): void {
  const s = useGame.getState();
  if (bossHostRef.value === s.playerId) {
    bossHostRef.value = '';
  }
}

export function leaveSquadron() {
  releaseBossHost();
  const s = useGame.getState();
  net.send({ t: 'space:leave', from: s.playerId });
}

/* ============================================================
   Briefing UI
   ============================================================ */

export const BriefingRoom: React.FC<{
  onLaunch: () => void;
  onBack: () => void;
}> = ({ onLaunch, onBack }) => {
  const sq = useSquadron();
  const setSpaceDrone = useGame((s) => s.setSpaceDrone);
  const setSpaceReady = useGame((s) => s.setSpaceReady);
  const myDroneId = useGame((s) => s.spaceDrone);
  const ready = useGame((s) => s.spaceReady);
  const playerId = useGame((s) => s.playerId);
  const launchedRef = useRef(false);

  /* Launch fires from the countdown, on every client, at the same moment.
     The first announcer also claims the shared boss. */
  useEffect(() => {
    if (sq.countdown !== 0 || launchedRef.current) return;
    launchedRef.current = true;
    claimBossHost(sq.pilots.map((p) => p.id));
    sfx.success();
    onLaunch();
  }, [sq.countdown, onLaunch, sq.pilots]);

  const readyCount = sq.pilots.filter((p) => p.ready).length;

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="text-center">
        <p className="label">drone network</p>
        <h1 className="mt-1 text-3xl font-black tracking-tight text-white">OPERASYON ODASI</h1>
        <p className="mx-auto mt-3 max-w-xl text-xs leading-relaxed text-[var(--text-mid)]">
          Platformunuzu seçin ve hazır olun. Herkes hazır olduğunda geri sayım başlar ve filo
          otomatik olarak ağa bağlanır.
        </p>
      </div>

      {/* Countdown takeover */}
      {sq.countdown !== null && (
        <div className="panel anim-rise border-[var(--neon-green)] p-6 text-center" style={{ boxShadow: '0 0 44px rgba(74,222,128,0.3)' }}>
          <p className="label mb-2">tüm operatörler hazır — bağlanmaya</p>
          <p
            key={sq.countdown}
            className="anim-rise text-7xl font-black text-[var(--neon-green)] text-glow"
          >
            {sq.countdown > 0 ? sq.countdown : 'BAĞLAN!'}
          </p>
          <p className="mt-2 text-[10px] uppercase tracking-[0.24em] text-[var(--text-lo)]">
            {formationName(sq.pilots.length)} oluşturuluyor
          </p>
        </div>
      )}

      {/* Roster */}
      <div className="panel p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="label">filo — {sq.pilots.length} operatör</p>
          <Chip color={sq.allReady ? 'var(--neon-green)' : 'var(--text-lo)'}>
            <IconUsers size={10} /> {readyCount}/{sq.pilots.length} hazır
          </Chip>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {sq.pilots.map((p) => {
            const sp = DRONES.find((x) => x.id === p.drone);
            const isMe = p.id === playerId;
            return (
              <div
                key={p.id}
                className="rounded-lg border p-3 text-center transition-all"
                style={{
                  borderColor: p.ready ? '#4ade80' : `${alpha(p.color, 0.33)}`,
                  background: p.ready ? 'rgba(74,222,128,0.09)' : `${alpha(p.color, 0.05)}`,
                }}
              >
                <svg viewBox="-30 -30 60 60" className="mx-auto h-12 w-12">
                  <g style={{ filter: `drop-shadow(0 0 6px ${p.color})`, opacity: p.drone ? 1 : 0.35 }}>
                    <path d="M0 -24 L16 13 L7 8 L0 18 L-7 8 L-16 13 Z" fill="#0b1220" stroke={p.color} strokeWidth="2.2" />
                    <ellipse cx="0" cy="-6" rx="4.5" ry="8" fill={p.color} fillOpacity="0.85" />
                  </g>
                </svg>
                <p className="mt-1.5 truncate text-[10px] font-black uppercase tracking-wider" style={{ color: p.color }}>
                  {p.name}
                  {isMe ? ' (SEN)' : ''}
                </p>
                <p className="truncate text-[9px] text-[var(--text-lo)]">
                  {sp ? sp.name : 'platform seçilmedi'}
                </p>
                <p
                  className="mt-1 text-[9px] font-bold uppercase tracking-widest"
                  style={{ color: p.ready ? '#4ade80' : 'var(--text-lo)' }}
                >
                  {p.ready ? '✓ hazır' : 'bekliyor'}
                </p>
              </div>
            );
          })}
        </div>

        {sq.pilots.length < 2 && (
          <p className="mt-3 text-center text-[10px] leading-relaxed text-[var(--neon-amber)]">
            <IconTarget size={10} className="mr-1 inline" />
            başlamak için en az 2 pilot gerekli — adresi başka bir sekmede aç
          </p>
        )}
      </div>

      {/* Formation preview */}
      {sq.pilots.length >= 2 && (
        <div className="panel p-4 text-center">
          <p className="label mb-2">birleşme formasyonu</p>
          <p className="text-2xl font-black tracking-[0.2em] text-[var(--neon-violet)] text-glow">
            {formationName(sq.pilots.length)}
          </p>
          <p className="mt-1 text-[10px] tracking-[0.2em] text-[var(--text-lo)]">
            {mergeNames(sq.pilots.map((p) => p.name))}
          </p>
        </div>
      )}

      {/* Chassis picker */}
      <div>
        <p className="label mb-3">platformunu seç</p>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
          {DRONES.map((sp) => {
            const on = myDroneId === sp.id;
            return (
              <button
                key={sp.id}
                onClick={() => {
                  setSpaceDrone(sp.id);
                  sfx.click();
                }}
                className="panel overflow-hidden p-0 transition-all"
                style={{
                  borderColor: on ? sp.color : undefined,
                  boxShadow: on ? `0 0 26px ${alpha(sp.color, 0.27)}` : undefined,
                }}
              >
                <div
                  className="flex h-16 items-center justify-center"
                  style={{ background: `radial-gradient(ellipse at center, ${alpha(sp.color, 0.13)}, #04060c 72%)` }}
                >
                  <svg viewBox="-30 -30 60 60" className="h-12 w-12">
                    <g style={{ filter: `drop-shadow(0 0 6px ${sp.color})` }}>
                      <path d="M0 -24 L16 13 L7 8 L0 18 L-7 8 L-16 13 Z" fill="#0b1220" stroke={sp.color} strokeWidth="2.2" />
                      <ellipse cx="0" cy="-6" rx="4.5" ry="8" fill={sp.color} fillOpacity="0.85" />
                    </g>
                  </svg>
                </div>
                <div className="p-2.5">
                  <p className="truncate text-[10px] font-black uppercase tracking-wider" style={{ color: sp.color }}>
                    {sp.name}
                  </p>
                  <div className="mt-1.5 space-y-0.5">
                    {sp.skills.map((sk) => {
                      const Icon = SKILL_ICONS[sk];
                      return (
                        <div key={sk} className="flex items-center gap-1.5">
                          <span style={{ color: SKILLS[sk].color }}>
                            <Icon size={10} />
                          </span>
                          <span className="truncate text-[8px] text-[var(--text-mid)]">{SKILLS[sk].name}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Ready toggle */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Btn
          tone={ready ? 'green' : 'cyan'}
          size="lg"
          onClick={() => {
            setSpaceReady(!ready);
            sfx.confirm();
          }}
        >
          {ready ? '✓ HAZIRIM' : 'HAZIRIM'}
        </Btn>
        <Btn tone="ghost" onClick={onBack}>
          ← merkez
        </Btn>
      </div>

      <p className="text-center text-[10px] leading-relaxed text-[var(--text-lo)]">
        Hazır olduğun anda kayıt olur. Tüm pilotlar hazır olunca {LAUNCH_SECONDS} saniyelik geri
        sayım kendiliğinden başlar.
      </p>
    </div>
  );
};
