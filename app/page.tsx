'use client';

import React, { useEffect } from 'react';
import { useGame } from '@/store/useGameStore';
import { CityBackground } from '@/components/ui/CityBackground';
import { AttackLayer } from '@/components/ui/AttackLayer';
import { Hub } from '@/components/ui/Hub';
import { JoinGate } from '@/components/ui/JoinGate';
import { PongDuel } from '@/components/ui/PongDuel';
import { BreachMode } from '@/components/modes/BreachMode';
import { ClashMode } from '@/components/modes/ClashMode';
import { TowerMode } from '@/components/modes/TowerMode';
import { SpaceMode } from '@/components/modes/SpaceMode';
import { net } from '@/lib/net';
import { isMuted, setMuted, sfx } from '@/lib/sfx';
import { IconArrowLeft, IconVolume } from '@/components/ui/Icons';

export default function Page() {
  const boot = useGame((s) => s.boot);
  const tick = useGame((s) => s.tick);
  const mode = useGame((s) => s.mode);
  const setMode = useGame((s) => s.setMode);
  const playerId = useGame((s) => s.playerId);
  const name = useGame((s) => s.name);
  const color = useGame((s) => s.color);
  const toasts = useGame((s) => s.toasts);
  const peers = useGame((s) => s.peers);
  const setName = useGame((s) => s.setName);
  const heartbeat = useGame((s) => s.heartbeat);
  const joined = useGame((s) => s.joined);
  const role = useGame((s) => s.role);
  const setRole = useGame((s) => s.setRole);

  const [muted, setMutedState] = React.useState(false);
  /* Clock is client-only: rendering Date on the server guarantees a hydration mismatch. */
  const [clock, setClock] = React.useState('');
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState('');

  useEffect(() => {
    boot();
  }, [boot]);

  useEffect(() => {
    const tickClock = () => setClock(new Date().toLocaleTimeString('tr-TR'));
    tickClock();
    const id = setInterval(tickClock, 1000);
    return () => clearInterval(id);
  }, []);

  /* One clock drives attack expiry and peer timeouts for the whole app. */
  useEffect(() => {
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [tick]);

  /* Presence heartbeat, so peers can time us out if the tab dies. */
  useEffect(() => {
    const id = setInterval(heartbeat, 5000);
    return () => clearInterval(id);
  }, [heartbeat]);

  return (
    <div className="scanlines vignette relative min-h-screen">
      <CityBackground intensity={mode === 'hub' ? 0.6 : 1.4} />

      {/* Nothing else renders until the player has claimed a callsign. */}
      {!joined ? (
        <div className="px-4 py-10">
          <JoinGate />
        </div>
      ) : (
        <>
          <AttackLayer>
            <div className="mx-auto max-w-[1400px] px-4 py-6 md:px-8 md:py-8">
              {/* Command bar */}
              <nav className="mb-7 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  {mode !== 'hub' && (
                    <button
                      onClick={() => {
                        setMode('hub');
                        setRole('spectator');
                        sfx.click();
                      }}
                      className="flex items-center gap-1.5 rounded-lg border border-[var(--line-strong)] px-3 py-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--text-mid)] transition-colors hover:border-[var(--neon-cyan)]/50 hover:text-[var(--neon-cyan)]"
                    >
                      <IconArrowLeft size={13} /> merkez
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setMode('hub');
                      setRole('spectator');
                      sfx.click();
                    }}
                    className="flex items-center gap-2"
                  >
                    <span className="h-2 w-2 rounded-full bg-[var(--neon-cyan)] anim-pulse" />
                    <span className="text-[11px] font-black uppercase tracking-[0.28em] text-white">
                      neon<span className="text-[var(--neon-cyan)]">breach</span>
                    </span>
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  {/* Current callsign — click to rename. */}
                  {editing ? (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        setName(draft);
                        setEditing(false);
                        sfx.confirm();
                      }}
                      className="flex items-center gap-1.5"
                    >
                      <input
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        autoFocus
                        maxLength={16}
                        className="inset-well w-28 px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider outline-none focus:border-[var(--neon-cyan)]/50"
                        style={{ color }}
                      />
                      <button
                        type="submit"
                        className="rounded border border-[var(--neon-green)]/50 px-2 py-1.5 text-[9px] font-bold uppercase text-[var(--neon-green)]"
                      >
                        kaydet
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditing(false)}
                        className="rounded border border-[var(--line-strong)] px-2 py-1.5 text-[9px] uppercase text-[var(--text-lo)]"
                      >
                        iptal
                      </button>
                    </form>
                  ) : (
                    <button
                      onClick={() => {
                        setDraft(name);
                        setEditing(true);
                        sfx.click();
                      }}
                      title="ismini değiştir"
                      className="flex items-center gap-2 rounded-lg border border-[var(--line-strong)] px-3 py-1.5 transition-colors hover:border-[var(--neon-cyan)]/50"
                    >
                      <span
                        className="flex h-5 w-5 items-center justify-center rounded text-[9px] font-black"
                        style={{ background: `${color}22`, color }}
                      >
                        {name.slice(0, 2).toUpperCase()}
                      </span>
                      <span className="text-[10px] font-black uppercase tracking-[0.14em]" style={{ color }}>
                        {name}
                      </span>
                    </button>
                  )}

                  <span className="stat hidden text-[10px] text-[var(--text-lo)] md:block">
                    <span className="text-[var(--neon-green)]">◉</span> {peers.length + 1} operatör
                  </span>
                  <span className="stat hidden text-[10px] text-[var(--text-lo)] lg:block">
                    {clock || '--:--:--'}
                  </span>
                  <button
                    onClick={() => {
                      const next = !muted;
                      setMutedState(next);
                      setMuted(next);
                      if (!next) sfx.click();
                    }}
                    className="rounded-lg border border-[var(--line-strong)] p-2 text-[var(--text-mid)] transition-colors hover:text-[var(--neon-cyan)]"
                    title={muted ? 'sesi aç' : 'sesi kapat'}
                  >
                    <IconVolume size={14} className={muted ? 'opacity-30' : ''} />
                  </button>
                </div>
              </nav>

              {/* Screens */}
              <main key={mode} className="anim-fade">
                {mode === 'hub' && <Hub />}
                {mode === 'breach' && <BreachMode />}
                {mode === 'clash' && <ClashMode />}
                {mode === 'tower' && <TowerMode />}
                {mode === 'space' && <SpaceMode />}
              </main>

              <footer className="mt-10 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--line)] pt-4 text-[9px] uppercase tracking-[0.2em] text-[var(--text-lo)]">
                <span>neon breach · multiverse build 1.0</span>
                <span>sekme başına bir operatör · sunucu gerekmez</span>
              </footer>
            </div>
          </AttackLayer>
        </>
      )}

      {/* A siege duel takes over the screen while it runs. */}
      <PongDuel />

      {/* Toasts — rendered outside the gate so they show while joining too. */}
      <div className="pointer-events-none fixed bottom-5 right-5 z-[9995] flex w-72 flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="anim-slide rounded-lg border px-4 py-2.5 backdrop-blur-xl"
            style={{
              borderColor:
                t.tone === 'good' ? 'var(--neon-green)55' : t.tone === 'warn' ? 'var(--neon-amber)55' : 'var(--line-strong)',
              background:
                t.tone === 'good'
                  ? 'rgba(74,222,128,0.1)'
                  : t.tone === 'warn'
                    ? 'rgba(251,191,36,0.1)'
                    : 'rgba(8,13,24,0.9)',
            }}
          >
            <p className="text-[11px] font-bold text-white">{t.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
