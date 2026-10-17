'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useGame } from '@/store/useGameStore';
import type { Role } from '@/store/useGameStore';
import { Panel, Btn, Meter, Chip } from '@/components/ui/Panel';
import { CommsPanel } from '@/components/ui/CommsPanel';
import { BREACH_STAGES, ROLES } from '@/config/game';
import { sfx } from '@/lib/sfx';
import {
  IconGhost, IconEye, IconGrid, IconLock, IconUnlock, IconBolt, IconWave, IconShield,
} from '@/components/ui/Icons';

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

  // Corridor grid — a small maze the ghost reads.
  const cells = useMemo(() => Array.from({ length: 48 }, (_, i) => i), []);

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
        <div className="grid-bg inset-well relative grid grid-cols-8 gap-1 p-3">
          {cells.map((c) => {
            const isWall = c % 7 === 3 || c % 11 === 5;
            const isPlayer = c === 20 + stage * 3;
            const isTarget = c === 34;
            return (
              <div
                key={c}
                className="aspect-square rounded-[3px] transition-colors"
                style={{
                  background: isPlayer
                    ? 'var(--neon-amber)'
                    : isTarget
                      ? 'rgba(74,222,128,0.55)'
                      : isWall
                        ? 'rgba(148,197,255,0.16)'
                        : 'rgba(255,255,255,0.03)',
                  boxShadow: isPlayer ? '0 0 12px var(--neon-amber)' : 'none',
                }}
              />
            );
          })}
          <div className="pointer-events-none absolute inset-0 rounded-[10px] border border-[var(--neon-amber)]/20" />
        </div>
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

  // Live waveform so the panel feels like it's reading something real.
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setPhase((p) => p + 0.35), 60);
    return () => clearInterval(id);
  }, []);

  const wave = useMemo(
    () => Array.from({ length: 64 }, (_, i) => 50 + Math.sin(i * 0.4 + phase) * 34 * Math.sin(i * 0.09)),
    [phase]
  );

  return (
    <div className="space-y-4">
      <Panel title="SİNYAL ANALİZİ" subtitle="Taşıyıcı dalga formu" accent="var(--neon-violet)">
        <div className="inset-well flex h-24 items-end gap-[2px] p-3">
          {wave.map((h, i) => (
            <div
              key={i}
              className="flex-1 rounded-sm"
              style={{
                height: `${Math.abs(h)}%`,
                background: i % 8 === 0 ? 'var(--neon-violet)' : 'rgba(167,139,250,0.35)',
              }}
            />
          ))}
        </div>
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
  const over = load > 5;

  return (
    <div className="space-y-4">
      <Panel title="ENERJİ ŞEBEKESİ" subtitle="Hat yükü izleme" accent="var(--neon-green)">
        <Meter
          value={load}
          max={8}
          color={over ? 'var(--neon-rose)' : 'var(--neon-green)'}
          height={10}
          label="TOPLAM YÜK"
        />
        <div className="mt-4 grid grid-cols-5 gap-2">
          {s.architect.grid.map((g, i) => {
            const on = open.includes(i);
            return (
              <button
                key={i}
                onClick={() => toggle(i)}
                disabled={solved}
                className="rounded-lg border p-3 transition-all disabled:opacity-60"
                style={{
                  borderColor: on ? 'var(--neon-green)' : 'var(--line-strong)',
                  background: on ? 'rgba(74,222,128,0.14)' : 'rgba(255,255,255,0.02)',
                  boxShadow: on ? '0 0 16px rgba(74,222,128,0.3)' : 'none',
                }}
              >
                <p className="stat text-center text-lg font-black" style={{ color: on ? 'var(--neon-green)' : 'var(--text-lo)' }}>
                  {g}
                </p>
                <p className="mt-0.5 text-center text-[8px] uppercase tracking-widest text-[var(--text-lo)]">
                  HAT {i + 1}
                </p>
              </button>
            );
          })}
        </div>
      </Panel>

      <Panel
        title="GÜVENLİK DUVARI"
        subtitle="Devre şeması"
        accent="var(--neon-green)"
        right={solved ? <Chip color="var(--neon-green)">AÇIK</Chip> : <Chip color="var(--neon-rose)">KİLİTLİ</Chip>}
      >
        <p className="mb-3 text-xs text-[var(--text-lo)]">{s.architect.prompt}</p>
        <div className="flex items-center justify-center gap-4 py-4">
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
   Shell
   ============================================================ */

export const BreachMode: React.FC = () => {
  const role = useGame((s) => s.role);
  const setRole = useGame((s) => s.setRole);
  const setMode = useGame((s) => s.setMode);
  const postShared = useGame((s) => s.postShared);
  const shared = useGame((s) => s.shared);

  const [stage, setStage] = useState(0);

  const stageKey = `breach:stage${stage}`;
  const oracleDone = Boolean(shared[`${stageKey}:oracle`]);
  const archDone = Boolean(shared[`${stageKey}:architect`]);
  const ghostDone = Boolean(shared[`${stageKey}:ghost`]);

  /* The layer opens only when the layer that feeds it has finished. */
  const gateOpen = oracleDone && archDone;

  const complete = (layer: 'oracle' | 'architect' | 'ghost') => postShared(`${stageKey}:${layer}`, true);

  const allDone = oracleDone && archDone && ghostDone;
  const [advanced, setAdvanced] = useState(false);

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

  if (!role || role === 'spectator') {
    return (
      <RoleSelect
        onPick={(r) => {
          setRole(r);
          sfx.confirm();
        }}
        onBack={() => setMode('hub')}
      />
    );
  }

  return (
    <div className="space-y-5">
      {/* Mission header */}
      <Panel
        accent="var(--neon-cyan)"
        title="OPERASYON: BREACH"
        subtitle={`Aşama ${stage + 1} / ${BREACH_STAGES.length}`}
        right={
          <button
            onClick={() => {
              setRole('spectator');
              sfx.click();
            }}
            className="text-[9px] uppercase tracking-widest text-[var(--text-lo)] hover:text-white"
          >
            rol değiştir
          </button>
        }
        bodyClass="p-4"
      >
        <div className="flex flex-wrap items-center gap-3">
          <Meter value={stage + (allDone ? 1 : 0)} max={BREACH_STAGES.length} label="İLERLEME" height={5} />
          <div className="flex gap-2">
            <Chip color={oracleDone ? 'var(--neon-green)' : 'var(--neon-violet)'}>
              ORACLE {oracleDone ? '✓' : '…'}
            </Chip>
            <Chip color={archDone ? 'var(--neon-green)' : 'var(--neon-green)'}>
              ARCHITECT {archDone ? '✓' : '…'}
            </Chip>
            <Chip color={ghostDone ? 'var(--neon-green)' : 'var(--neon-amber)'}>
              GHOST {ghostDone ? '✓' : '…'}
            </Chip>
          </div>
        </div>
      </Panel>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          {/* Gating: the Ghost can't act until the other two have fed it intel. */}
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
                  <Chip color={archDone ? 'var(--neon-green)' : 'var(--neon-green)'}>
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

          {allDone && (
            <Panel accent="var(--neon-green)" bodyClass="p-6">
              <div className="anim-rise text-center">
                <IconShield size={36} className="mx-auto mb-2 text-[var(--neon-green)]" />
                <p className="text-sm font-black uppercase tracking-[0.24em] text-[var(--neon-green)]">
                  katman aşıldı
                </p>
                <p className="mt-1 text-xs text-[var(--text-mid)]">
                  {stage < BREACH_STAGES.length - 1
                    ? 'Sonraki katmana geçiliyor...'
                    : 'Çekirdek erişimi sağlandı. Operasyon tamamlandı.'}
                </p>
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
              const r = {
                ghost: { n: 'THE GHOST', c: 'var(--neon-amber)', i: IconGhost, d: 'Odada ne olduğunu görürsün. Veriyi göremezsin.' },
                oracle: { n: 'THE ORACLE', c: 'var(--neon-violet)', i: IconEye, d: 'Şifreyi görürsün. Odayı göremezsin.' },
                architect: { n: 'THE ARCHITECT', c: 'var(--neon-green)', i: IconGrid, d: 'Devreleri görürsün. Şifreyi göremezsin.' },
              }[role as 'ghost' | 'oracle' | 'architect'];
              if (!r) return null;
              const Icon = r.i;
              return (
                <div className="flex gap-3">
                  <Icon size={28} className="shrink-0" />
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.2em]" style={{ color: r.c }}>
                      {r.n}
                    </p>
                    <p className="mt-1 text-[11px] leading-relaxed text-[var(--text-mid)]">{r.d}</p>
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

/* ============================================================
   Role select
   ============================================================ */

const ICONS = { ghost: IconGhost, oracle: IconEye, architect: IconGrid } as const;

export const RoleSelect: React.FC<{ onPick: (r: Role) => void; onBack: () => void }> = ({
  onPick,
  onBack,
}) => {
  const [hover, setHover] = useState<string | null>(null);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="text-center">
        <p className="label">kimlik seçimi</p>
        <h1 className="mt-1 text-3xl font-black tracking-tight text-white">OPERATÖRÜNÜ SEÇ</h1>
        <p className="mx-auto mt-3 max-w-lg text-xs leading-relaxed text-[var(--text-mid)]">
          Her operatör sistemin yalnızca bir katmanını görür. Hiçbiri tek başına yeterli değildir —
          ancak iletişim kurarsanız içeri girebilirsiniz.
        </p>
      </div>

      <div className="stagger grid grid-cols-1 gap-4 md:grid-cols-3">
        {ROLES.map((r) => {
          const Icon = ICONS[r.id as keyof typeof ICONS];
          const on = hover === r.id;
          return (
            <button
              key={r.id}
              onMouseEnter={() => setHover(r.id)}
              onMouseLeave={() => setHover(null)}
              onClick={() => onPick(r.id)}
              className="panel group relative p-5 text-left transition-all duration-300"
              style={{
                borderColor: on ? r.color : undefined,
                boxShadow: on ? `0 0 36px ${r.color}33` : undefined,
                transform: on ? 'translateY(-4px)' : undefined,
              }}
            >
              <div
                className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl border transition-all"
                style={{
                  borderColor: `${r.color}55`,
                  background: `${r.color}12`,
                  color: r.color,
                }}
              >
                <Icon size={26} />
              </div>

              <h3 className="text-sm font-black uppercase tracking-[0.18em]" style={{ color: r.color }}>
                {r.name}
              </h3>
              <p className="mt-0.5 text-[9px] uppercase tracking-[0.2em] text-[var(--text-lo)]">
                {r.codename}
              </p>
              <p className="mt-3 text-[11px] leading-relaxed text-[var(--text-mid)]">{r.desc}</p>

              <div className="mt-4 space-y-1.5 border-t border-[var(--line)] pt-3">
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
            </button>
          );
        })}
      </div>

      <div className="flex justify-center">
        <Btn tone="ghost" onClick={onBack}>
          ← merkeze dön
        </Btn>
      </div>
    </div>
  );
};
