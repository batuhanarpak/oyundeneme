'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useGame } from '@/store/useGameStore';
import type { Role } from '@/store/useGameStore';
import { Panel, Btn, Meter, Chip } from '@/components/ui/Panel';
import { CommsPanel } from '@/components/ui/CommsPanel';
import { BREACH_STAGES, ROLES } from '@/config/game';
import { sfx } from '@/lib/sfx';
import { PORTRAITS } from '@/components/ui/Portraits';
import { FacilityMap, SpectrumAnalyser, CircuitDiagram } from '@/components/ui/Schematics';
import { IconLock, IconUnlock, IconWave, IconGrid, IconUsers, IconChevron } from '@/components/ui/Icons';
import { TerminalScreen } from '@/components/ui/TerminalScreen';
import { alpha } from '@/lib/color';

/* ============================================================
   GHOST — the physical layer. Sees the room, not the data.
   ============================================================ */

const GhostView: React.FC<{ stage: number; onSolve: () => void; solved: boolean }> = ({
  stage,
  onSolve,
  solved,
}) => {
  const s = BREACH_STAGES[stage];
  const [pick, setPick] = useState<number | null>(null);
  const [wrong, setWrong] = useState(false);

  useEffect(() => {
    setPick(null);
    setWrong(false);
  }, [stage]);

  const choose = (i: number) => {
    setPick(i);
    if (i === s.ghost.correct) {
      sfx.success();
      onSolve();
    } else {
      sfx.deny();
      setWrong(true);
      setTimeout(() => setWrong(false), 700);
    }
  };

  return (
    <div className="space-y-4">
      <Panel title="FİZİKSEL KATMAN" subtitle="Tesis yerleşimi — canlı" accent="var(--neon-amber)">
        <FacilityMap
          playerCell={20 + stage * 3}
          targetCell={34}
          accent="var(--neon-amber)"
        />
        <div className="mt-3 flex flex-wrap gap-2">
          <Chip color="var(--neon-amber)">SEN</Chip>
          <Chip color="var(--neon-green)">HEDEF</Chip>
          <Chip>ENGEL</Chip>
        </div>
      </Panel>

      <Panel
        title={`KARAR NOKTASI ${stage + 1}`}
        subtitle="Oracle'ın çözdüğü kodu uygula"
        accent="var(--neon-amber)"
        right={solved ? <Chip color="var(--neon-green)">GEÇİLDİ</Chip> : <Chip color="var(--neon-amber)">BEKLEMEDE</Chip>}
      >
        <p className="mb-4 text-sm leading-relaxed text-[var(--text-mid)]">{s.ghost.prompt}</p>
        <div className={`grid grid-cols-1 gap-2 sm:grid-cols-2 ${wrong ? 'anim-shake' : ''}`}>
          {s.ghost.options.map((o, i) => (
            <button
              key={o}
              disabled={solved}
              onClick={() => choose(i)}
              className="rounded-lg border px-4 py-3 text-left text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-40"
              style={{
                borderColor:
                  pick === i
                    ? i === s.ghost.correct
                      ? 'var(--neon-green)'
                      : 'var(--neon-rose)'
                    : 'var(--line-strong)',
                background:
                  pick === i && i === s.ghost.correct ? 'rgba(74,222,128,0.12)' : 'rgba(255,255,255,0.02)',
                color: pick === i && i === s.ghost.correct ? 'var(--neon-green)' : 'var(--text-mid)',
              }}
            >
              {o}
            </button>
          ))}
        </div>
        {wrong && (
          <p className="mt-3 text-center text-[11px] font-bold uppercase tracking-widest text-[var(--neon-rose)]">
            yanlış kapı — Oracle'a tekrar sor
          </p>
        )}
      </Panel>
    </div>
  );
};

/* ============================================================
   ORACLE — the cognitive layer. Sees the cipher, not the room.
   ============================================================ */

const OracleView: React.FC<{ stage: number; onSolve: () => void; solved: boolean }> = ({
  stage,
  onSolve,
  solved,
}) => {
  const s = BREACH_STAGES[stage];
  const [val, setVal] = useState('');

  useEffect(() => {
    setVal('');
  }, [stage]);

  const check = () => {
    if (val.trim().toUpperCase() === s.oracle.answer) {
      sfx.success();
      onSolve();
    } else {
      sfx.deny();
    }
  };

  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setPhase((p) => p + 0.35), 60);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="space-y-4">
      <Panel title="SİNYAL ANALİZİ" subtitle="Taşıyıcı dalga formu" accent="var(--neon-violet)">
        <SpectrumAnalyser phase={phase} accent="var(--neon-violet)" />
      </Panel>

      <Panel
        title={`ŞİFRE ÇÖZME — KATMAN ${stage + 1}`}
        subtitle="Çözdüğün kelimeyi Ghost'a söyle"
        accent="var(--neon-violet)"
        right={solved ? <Chip color="var(--neon-green)">ÇÖZÜLDÜ</Chip> : <Chip color="var(--neon-violet)">AKTİF</Chip>}
      >
        <p className="mb-3 text-xs text-[var(--text-lo)]">{s.oracle.prompt}</p>
        <div className="inset-well mb-4 overflow-x-auto p-4">
          <code className="whitespace-nowrap font-mono text-base tracking-wider text-[var(--neon-violet)]">
            {s.oracle.cipher}
          </code>
        </div>

        {solved ? (
          <div className="rounded-lg border border-[var(--neon-green)]/40 bg-[rgba(74,222,128,0.1)] p-4 text-center">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--neon-green)]">
              çözüldü — ghost'a ilet
            </p>
            <p className="mt-1 font-mono text-2xl font-black text-white">{s.oracle.answer}</p>
          </div>
        ) : (
          <div className="flex gap-2">
            <input
              value={val}
              onChange={(e) => setVal(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && check()}
              placeholder="ÇÖZÜLEN KELİME"
              className="inset-well min-w-0 flex-1 px-4 py-3 font-mono text-sm uppercase tracking-widest text-[var(--text-hi)] outline-none focus:border-[var(--neon-violet)]/50"
            />
            <Btn tone="violet" onClick={check} disabled={!val.trim()}>
              ÇÖZ
            </Btn>
          </div>
        )}
      </Panel>
    </div>
  );
};

/* ============================================================
   ARCHITECT — the infrastructure layer. Sees the grid, not the data.
   ============================================================ */

const ArchitectView: React.FC<{ stage: number; onSolve: () => void; solved: boolean }> = ({
  stage,
  onSolve,
  solved,
}) => {
  const s = BREACH_STAGES[stage];
  const [open, setOpen] = useState<number[]>([]);

  useEffect(() => {
    setOpen([]);
  }, [stage]);

  const toggle = (i: number) => {
    if (solved) return;
    sfx.click();
    const next = open.includes(i) ? open.filter((x) => x !== i) : [...open, i];
    setOpen(next);

    const target = [...s.architect.solution].sort().join(',');
    if ([...next].sort().join(',') === target) {
      sfx.success();
      onSolve();
    }
  };

  const load = open.reduce((sum, i) => sum + s.architect.grid[i], 0);
  const over = load > s.architect.limit;

  return (
    <div className="space-y-4">
      <Panel title="ENERJİ ŞEBEKESİ" subtitle="Hat yükü izleme" accent="var(--neon-green)">
        <CircuitDiagram open={open} solution={s.architect.solution} accent="var(--neon-green)" />
        <div className="mt-4">
          <Meter
            value={load}
            max={s.architect.limit}
            color={over ? 'var(--neon-rose)' : 'var(--neon-green)'}
            height={10}
            label={`HAT YÜKÜ — SINIR ${s.architect.limit}`}
          />
        </div>
      </Panel>

      <Panel
        title="GÜVENLİK DUVARI"
        subtitle="Devre şeması"
        accent="var(--neon-green)"
        right={solved ? <Chip color="var(--neon-green)">AÇIK</Chip> : <Chip color="var(--neon-rose)">KİLİTLİ</Chip>}
      >
        <p className="mb-3 text-xs text-[var(--text-lo)]">{s.architect.prompt}</p>
        {/* Five columns are the puzzle, so they stay; the cells just tighten
            up on a phone rather than overflowing. */}
        <div className="mb-4 grid grid-cols-5 gap-1.5 sm:gap-2">
          {s.architect.grid.map((g, i) => {
            const on = open.includes(i);
            return (
              <button
                key={i}
                onClick={() => toggle(i)}
                disabled={solved}
                className="rounded-lg border p-2 transition-all disabled:opacity-60 sm:p-3"
                style={{
                  borderColor: on ? 'var(--neon-green)' : 'var(--line-strong)',
                  background: on ? 'rgba(74,222,128,0.14)' : 'rgba(255,255,255,0.02)',
                  boxShadow: on ? '0 0 16px rgba(74,222,128,0.3)' : 'none',
                }}
              >
                <p
                  className="stat text-center text-lg font-black"
                  style={{ color: on ? 'var(--neon-green)' : 'var(--text-lo)' }}
                >
                  {g}
                </p>
                <p className="mt-0.5 text-center text-[8px] uppercase tracking-widest text-[var(--text-lo)]">
                  HAT {i + 1}
                </p>
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-center gap-4 py-2">
          <div
            className="flex h-20 w-20 items-center justify-center rounded-xl border-2 transition-all"
            style={{
              borderColor: solved ? 'var(--neon-green)' : 'var(--neon-rose)',
              background: solved ? 'rgba(74,222,128,0.1)' : 'rgba(244,63,94,0.08)',
              boxShadow: solved ? '0 0 28px rgba(74,222,128,0.35)' : '0 0 28px rgba(244,63,94,0.25)',
            }}
          >
            {solved ? (
              <IconUnlock size={34} className="text-[var(--neon-green)]" />
            ) : (
              <IconLock size={34} className="text-[var(--neon-rose)]" />
            )}
          </div>
        </div>
        <p className="text-center text-[10px] uppercase tracking-[0.2em] text-[var(--text-lo)]">
          {solved ? 'geçiş açık — ghost ilerleyebilir' : 'doğru hat kombinasyonunu bul'}
        </p>
      </Panel>
    </div>
  );
};

/* ============================================================
   Role picker — with portraits
   ============================================================ */

const RoleCards: React.FC<{
  onPick: (r: Role) => void;
  taken?: Role[];
  exclude?: Role[];
}> = ({ onPick, taken = [], exclude = [] }) => {
  const [hover, setHover] = useState<string | null>(null);
  const available = ROLES.filter((r) => !exclude.includes(r.id));

  return (
    <div className="stagger grid grid-cols-1 gap-4 md:grid-cols-3">
      {available.map((r) => {
        const Portrait = PORTRAITS[r.id as keyof typeof PORTRAITS];
        const isTaken = taken.includes(r.id);
        const on = hover === r.id;

        return (
          <button
            key={r.id}
            disabled={isTaken}
            onMouseEnter={() => {
              setHover(r.id);
              sfx.hover();
            }}
            onMouseLeave={() => setHover(null)}
            onClick={() => onPick(r.id)}
            className="panel group relative overflow-hidden p-0 text-left transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-40"
            style={{
              borderColor: on && !isTaken ? r.color : undefined,
              boxShadow: on && !isTaken ? `0 0 36px ${alpha(r.color, 0.2)}` : undefined,
              transform: on && !isTaken ? 'translateY(-4px)' : undefined,
            }}
          >
            {/* Portrait strip */}
            <div className="relative">
              <Portrait size={undefined} className="!h-40 !w-full !rounded-none !border-0" live={on} />
              <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#070b12] to-transparent" />
              <span
                className="absolute right-3 top-3 rounded px-2 py-0.5 text-[9px] font-black uppercase tracking-widest"
                style={{ background: `${alpha(r.color, 0.13)}`, color: r.color, border: `1px solid ${alpha(r.color, 0.33)}` }}
              >
                {isTaken ? 'DOLU' : r.codename}
              </span>
            </div>

            <div className="p-4">
              <h3 className="text-sm font-black uppercase tracking-[0.18em]" style={{ color: r.color }}>
                {r.name}
              </h3>
              <p className="mt-2 text-[11px] leading-relaxed text-[var(--text-mid)]">{r.desc}</p>

              <div className="mt-3 space-y-1 border-t border-[var(--line)] pt-3">
                {r.canSee.map((c) => (
                  <p key={c} className="flex items-center gap-2 text-[10px] text-[var(--text-mid)]">
                    <span style={{ color: r.color }}>▸</span> {c}
                  </p>
                ))}
                {r.cannotSee.map((c) => (
                  <p key={c} className="flex items-center gap-2 text-[10px] text-[var(--text-lo)] line-through">
                    <span>✕</span> {c}
                  </p>
                ))}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
};

/* ============================================================
   Shell
   ============================================================ */

export const BreachMode: React.FC = () => {
  const role = useGame((s) => s.role);
  const setRole = useGame((s) => s.setRole);
  const setMode = useGame((s) => s.setMode);
  const postShared = useGame((s) => s.postShared);
  const shared = useGame((s) => s.shared);
  const breachPlayers = useGame((s) => s.breachPlayers);
  const autoRole = useGame((s) => s.autoRole);
  const setBreachSetup = useGame((s) => s.setBreachSetup);

  const [stage, setStage] = useState(0);
  const [configuring, setConfiguring] = useState(true);
  /* Elapsed seconds once the run starts; the end screen reports it. */
  const [elapsed, setElapsed] = useState(0);
  /* Bumped when a run restarts. Completion flags are keyed on it, so a fresh
     operation never inherits the last one's solved layers — `shared` outlives
     the component. */
  const [runId, setRunId] = useState(1);

  const stageKey = `breach:run${runId}:stage${stage}`;
  const oracleDone = Boolean(shared[`${stageKey}:oracle`]);
  const archDone = Boolean(shared[`${stageKey}:architect`]);
  const ghostDone = Boolean(shared[`${stageKey}:ghost`]);

  /* The Ghost is gated on the other two layers. In 2-player mode the
     automated subsystem solves its own layer, so the gate still opens. */
  const gateOpen = oracleDone && archDone;
  const complete = (layer: 'oracle' | 'architect' | 'ghost') => postShared(`${stageKey}:${layer}`, true);

  const allDone = oracleDone && archDone && ghostDone;
  /* The last stage is the only one that ends the operation. */
  const isFinalStage = stage === BREACH_STAGES.length - 1;
  const won = allDone && isFinalStage && !configuring;
  const [advanced, setAdvanced] = useState(false);

  /* Run clock. Stops once the operation is complete. */
  useEffect(() => {
    if (configuring || won) return;
    const id = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(id);
  }, [configuring, won]);

  /* ---- automated subsystem (2-player mode) ----
     Stands in for the missing third operator: waits a few seconds, then
     reports its layer complete so the Ghost gate can still open. */
  useEffect(() => {
    if (breachPlayers !== 2 || configuring) return;
    if (role === autoRole) return;

    const key = `${stageKey}:${autoRole}`;
    if (shared[key]) return;

    const t = setTimeout(() => {
      postShared(key, true);
    }, 6000 + stage * 2000);

    return () => clearTimeout(t);
  }, [breachPlayers, autoRole, role, stageKey, shared, postShared, stage, configuring]);

  useEffect(() => {
    if (allDone && !advanced) {
      setAdvanced(true);
      const t = setTimeout(() => {
        if (stage < BREACH_STAGES.length - 1) {
          setStage((v) => v + 1);
          sfx.power();
        }
      }, 1800);
      return () => clearTimeout(t);
    }
    if (!allDone) setAdvanced(false);
  }, [allDone, advanced, stage]);

  /* ---- completion ----
     Every layer on the final stage is solved: the operation is over, so the
     mode hands off to the shared end screen rather than sitting on a banner. */
  if (won) {
    return (
      <TerminalScreen
        title="çekirdek erişimi sağlandı"
        subtitle={`${BREACH_STAGES.length} katmanın tamamı aşıldı ve operasyon kaydı kapatıldı.`}
        outcome="win"
        stats={[
          { label: 'katman', value: BREACH_STAGES.length, color: 'var(--neon-green)' },
          { label: 'süre', value: `${elapsed}s` },
          { label: 'operatör', value: breachPlayers },
        ]}
        onRetry={() => {
          setStage(0);
          setElapsed(0);
          setAdvanced(false);
          setRunId((r) => r + 1);
          sfx.click();
        }}
        retryLabel="yeni operasyon"
        onExit={() => {
          setStage(0);
          setElapsed(0);
          setRunId((r) => r + 1);
          setConfiguring(true);
          setMode('hub');
        }}
      />
    );
  }

  /* ---------------- setup ---------------- */
  if (configuring) {
    const humanRoles: Role[] =
      breachPlayers === 3
        ? (['ghost', 'oracle', 'architect'] as Role[])
        : (['ghost', 'oracle', 'architect'] as Role[]).filter((r) => r !== autoRole);

    return (
      <div className="mx-auto max-w-4xl space-y-7">
        <div className="text-center">
          <p className="label">the breach</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-white">EKİP KURULUMU</h1>
          <p className="mx-auto mt-3 max-w-lg text-xs leading-relaxed text-[var(--text-mid)]">
            Kaç operatör sahada olacak? Eksik kalan katmanı otomatik alt sistem üstlenir.
          </p>
        </div>

        {/* Player count */}
        <div className="grid grid-cols-2 gap-4">
          {([3, 2] as const).map((n) => {
            const on = breachPlayers === n;
            return (
              <button
                key={n}
                onClick={() => {
                  /* Keep the same auto-role unless it would collide with the
                     player's own role once the roster shrinks. */
                  setBreachSetup(n, autoRole);
                  sfx.click();
                }}
                className="panel flex items-center gap-4 p-5 text-left transition-all"
                style={{
                  borderColor: on ? 'var(--neon-cyan)' : undefined,
                  boxShadow: on ? '0 0 30px rgba(34,211,238,0.25)' : undefined,
                }}
              >
                <span
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border text-lg font-black"
                  style={{
                    borderColor: on ? 'var(--neon-cyan)' : 'var(--line-strong)',
                    color: on ? 'var(--neon-cyan)' : 'var(--text-lo)',
                    background: on ? 'rgba(34,211,238,0.12)' : 'transparent',
                  }}
                >
                  {n}
                </span>
                <div>
                  <p className="text-sm font-black uppercase tracking-wider text-white">
                    {n} OPERATÖR
                  </p>
                  <p className="mt-0.5 text-[10px] leading-relaxed text-[var(--text-mid)]">
                    {n === 3
                      ? 'Tüm katmanlar insan tarafından yönetilir. Tam koordinasyon gerekir.'
                      : 'Bir katmanı alt sistem üstlenir. Daha hızlı ama daha az kontrollü.'}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Which role the subsystem covers */}
        {breachPlayers === 2 && (
          <div className="anim-rise">
            <p className="label mb-3">otomatik alt sistem hangi katmanı üstlensin?</p>
            <div className="grid grid-cols-3 gap-3">
              {ROLES.map((r) => {
                const on = autoRole === r.id;
                const Portrait = PORTRAITS[r.id as keyof typeof PORTRAITS];
                return (
                  <button
                    key={r.id}
                    onClick={() => {
                      setBreachSetup(2, r.id);
                      if (role === r.id) setRole('spectator');
                      sfx.click();
                    }}
                    className="panel overflow-hidden p-0 transition-all"
                    style={{
                      borderColor: on ? r.color : undefined,
                      boxShadow: on ? `0 0 26px ${alpha(r.color, 0.2)}` : undefined,
                    }}
                  >
                    <Portrait size={undefined} className="!h-20 !w-full !rounded-none !border-0" live={false} />
                    <p
                      className="px-3 py-2 text-center text-[10px] font-black uppercase tracking-widest"
                      style={{ color: r.color }}
                    >
                      {r.name}
                    </p>
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-center text-[10px] text-[var(--text-lo)]">
              Alt sistem seçilen katmanı birkaç saniye içinde kendi çözer.
            </p>
          </div>
        )}

        {/* Role pick */}
        <div>
          <p className="label mb-3">hangi katmanı sen yöneteceksin?</p>
          <RoleCards
            onPick={(r) => {
              setRole(r);
              setConfiguring(false);
              sfx.confirm();
            }}
            exclude={breachPlayers === 2 ? [autoRole] : []}
          />
        </div>

        <div className="flex justify-center gap-2">
          <Btn tone="ghost" onClick={() => setMode('hub')}>
            ← merkez
          </Btn>
        </div>
      </div>
    );
  }

  /* ---------------- mission ---------------- */
  return (
    <div className="space-y-5">
      <Panel
        accent="var(--neon-cyan)"
        title="OPERASYON: BREACH"
        subtitle={`Aşama ${stage + 1} / ${BREACH_STAGES.length} · ${breachPlayers} operatör`}
        right={
          <button
            onClick={() => {
              setRole('spectator');
              setConfiguring(true);
              sfx.click();
            }}
            className="text-[9px] uppercase tracking-widest text-[var(--text-lo)] hover:text-white"
          >
            kurulumu değiştir
          </button>
        }
        bodyClass="p-4"
      >
        <div className="flex flex-wrap items-center gap-3">
          <Meter value={stage + (allDone ? 1 : 0)} max={BREACH_STAGES.length} label="İLERLEME" height={5} />
          <div className="flex flex-wrap gap-2">
            {ROLES.map((r) => {
              const done = r.id === 'oracle' ? oracleDone : r.id === 'architect' ? archDone : ghostDone;
              const automated = breachPlayers === 2 && autoRole === r.id;
              return (
                <Chip key={r.id} color={done ? 'var(--neon-green)' : r.color}>
                  {r.name.replace('THE ', '')} {done ? '✓' : automated ? '⟳ OTO' : '…'}
                </Chip>
              );
            })}
          </div>
        </div>
      </Panel>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          {role === 'ghost' && !gateOpen && (
            <Panel title="BAĞLANTI BEKLENİYOR" accent="var(--neon-amber)" bodyClass="p-8">
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="anim-pulse">
                  <IconWave size={42} className="text-[var(--neon-amber)]" />
                </div>
                <div>
                  <p className="text-sm font-bold uppercase tracking-[0.2em] text-[var(--neon-amber)]">
                    veri akışı yok
                  </p>
                  <p className="mt-2 max-w-sm text-xs leading-relaxed text-[var(--text-mid)]">
                    Oracle şifreyi çözmeli ve Architect geçişi açmalı. İkisi de hazır olduğunda kapı
                    açılır.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Chip color={oracleDone ? 'var(--neon-green)' : 'var(--neon-violet)'}>
                    ORACLE {oracleDone ? 'HAZIR' : 'ÇALIŞIYOR'}
                  </Chip>
                  <Chip color={archDone ? 'var(--neon-green)' : 'var(--neon-rose)'}>
                    GEÇİŞ {archDone ? 'AÇIK' : 'KAPALI'}
                  </Chip>
                </div>
              </div>
            </Panel>
          )}

          {role === 'ghost' && gateOpen && (
            <GhostView stage={stage} onSolve={() => complete('ghost')} solved={ghostDone} />
          )}
          {role === 'oracle' && (
            <OracleView stage={stage} onSolve={() => complete('oracle')} solved={oracleDone} />
          )}
          {role === 'architect' && (
            <ArchitectView stage={stage} onSolve={() => complete('architect')} solved={archDone} />
          )}

          {role === 'spectator' && (
            <Panel title="GÖZLEMCİ" accent="var(--neon-cyan)" bodyClass="p-8">
              <div className="flex flex-col items-center gap-3 text-center">
                <IconUsers size={38} className="text-[var(--neon-cyan)]" />
                <p className="text-sm font-bold uppercase tracking-[0.2em] text-[var(--neon-cyan)]">
                  katman seçilmedi
                </p>
                <Btn
                  tone="cyan"
                  onClick={() => {
                    setConfiguring(true);
                    sfx.click();
                  }}
                >
                  katman seç <IconChevron size={12} />
                </Btn>
              </div>
            </Panel>
          )}

          {allDone && (
            <Panel accent="var(--neon-green)" bodyClass="p-6">
              <div className="anim-rise text-center">
                <IconGrid size={36} className="mx-auto mb-2 text-[var(--neon-green)]" />
                <p className="text-sm font-black uppercase tracking-[0.24em] text-[var(--neon-green)]">
                  katman aşıldı
                </p>
                <p className="mt-1 text-xs text-[var(--text-mid)]">Sonraki katmana geçiliyor...</p>
              </div>
            </Panel>
          )}
        </div>

        <div className="space-y-5">
          <Panel title="TAKIM İLETİŞİMİ" subtitle="Şifreli kanal" accent="var(--neon-cyan)" bodyClass="p-4">
            <CommsPanel />
          </Panel>

          <Panel title="ROL BİLGİSİ" accent="var(--neon-cyan)" bodyClass="p-4">
            {(() => {
              const r = ROLES.find((x) => x.id === role);
              if (!r) return null;
              const Portrait = PORTRAITS[role as keyof typeof PORTRAITS];
              if (!Portrait) return null;
              return (
                <div className="space-y-3">
                  <Portrait size={undefined} className="!h-32 !w-full" live={false} />
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.2em]" style={{ color: r.color }}>
                      {r.name}
                    </p>
                    <p className="mt-1 text-[11px] leading-relaxed text-[var(--text-mid)]">{r.desc}</p>
                  </div>
                </div>
              );
            })()}
          </Panel>
        </div>
      </div>
    </div>
  );
};
