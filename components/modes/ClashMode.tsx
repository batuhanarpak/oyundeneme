'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useGame } from '@/store/useGameStore';
import { Panel, Btn, Meter, Chip } from '@/components/ui/Panel';
import { CommsPanel } from '@/components/ui/CommsPanel';
import { CATEGORIES, QUESTIONS_BY_CATEGORY, type Question } from '@/config/questions';
import { sfx } from '@/lib/sfx';
import type { QuestionCategory } from '@/config/questions';
import { IconBrain, IconBolt, IconSkull, IconChevron } from '@/components/ui/Icons';

const MAX_HP = 100;
const TIME_PER_Q = 16;
const LETTERS = ['A', 'B', 'C', 'D'];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

interface Fighter {
  id: string;
  name: string;
  color: string;
  hp: number;
  score: number;
  streak: number;
}

export const ClashMode: React.FC = () => {
  const playerId = useGame((s) => s.playerId);
  const name = useGame((s) => s.name);
  const color = useGame((s) => s.color);
  const setMode = useGame((s) => s.setMode);
  const postShared = useGame((s) => s.postShared);
  const shared = useGame((s) => s.shared);
  const sendAttack = useGame((s) => s.sendAttack);
  const sendDamage = useGame((s) => s.sendDamage);
  const drainIncoming = useGame((s) => s.drainIncoming);
  const pushToast = useGame((s) => s.pushToast);
  const category = useGame((s) => s.category);
  const setCategory = useGame((s) => s.setCategory);

  /* Category picker first — nothing starts until a theme is chosen. */
  const [picked, setPicked] = useState(false);

  const deck: Question[] = useMemo(() => {
    const pool = QUESTIONS_BY_CATEGORY[category] ?? [];
    return shuffle(pool);
  }, [category]);

  const [qi, setQi] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TIME_PER_Q);
  const [locked, setLocked] = useState<number | null>(null);

  const [hp, setHp] = useState(MAX_HP);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [phase, setPhase] = useState<'countdown' | 'playing' | 'over'>('countdown');
  const [countdown, setCountdown] = useState(3);
  const [feed, setFeed] = useState<{ id: string; text: string; tone: string }[]>([]);

  const q = deck.length ? deck[qi % deck.length] : null;
  const cat = CATEGORIES.find((c) => c.id === category);

  /* Publish vitals so every roster stays live. */
  useEffect(() => {
    if (!playerId || !picked) return;
    postShared(`clash:fighter:${playerId}`, { id: playerId, name, color, hp, score, streak });
  }, [playerId, name, color, hp, score, streak, postShared, picked]);

  const fighters: Fighter[] = useMemo(() => {
    const list: Fighter[] = [];
    Object.entries(shared).forEach(([k, v]) => {
      if (!k.startsWith('clash:fighter:')) return;
      const f = v as Fighter;
      if (f && typeof f.hp === 'number') list.push(f);
    });
    return list.sort((a, b) => b.score - a.score);
  }, [shared]);

  const opponents = fighters.filter((f) => f.id !== playerId);

  /* Apply damage other players have dealt us. */
  useEffect(() => {
    if (!picked) return;
    const id = setInterval(() => {
      const queued = drainIncoming();
      if (queued.length === 0) return;
      const total = queued.reduce((sum, d) => sum + d.amount, 0);
      setHp((h) => Math.max(0, h - total));
      sfx.hit();
      setFeed((f) => [
        { id: Math.random().toString(36), text: `−${total} kalkan (${queued[0].label})`, tone: 'bad' },
        ...f.slice(0, 5),
      ]);
    }, 200);
    return () => clearInterval(id);
  }, [drainIncoming, picked]);

  useEffect(() => {
    if (phase !== 'countdown' || !picked) return;
    if (countdown <= 0) {
      setPhase('playing');
      sfx.power();
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 800);
    return () => clearTimeout(t);
  }, [countdown, phase, picked]);

  useEffect(() => {
    if (phase !== 'playing' || locked !== null) return;
    if (timeLeft <= 0) {
      sfx.fail();
      setHp((h) => Math.max(0, h - 6));
      setStreak(0);
      setLocked(-1);
      setTimeout(() => {
        setQi((v) => v + 1);
        setLocked(null);
        setTimeLeft(TIME_PER_Q);
      }, 1100);
      return;
    }
    const t = setTimeout(() => setTimeLeft((v) => v - 1), 1000);
    return () => clearTimeout(t);
  }, [timeLeft, phase, locked]);

  useEffect(() => {
    if (hp <= 0 && phase === 'playing') {
      setPhase('over');
      sfx.fail();
    }
  }, [hp, phase]);

  const answer = (idx: number) => {
    if (!q || locked !== null || phase !== 'playing') return;
    setLocked(idx);

    const right = idx === q.correct;
    const speedBonus = timeLeft > TIME_PER_Q * 0.6;

    if (right) {
      const dmg = (10 + Math.min(streak, 4) * 3) * (speedBonus ? 2 : 1);
      setScore((s) => s + dmg);
      setStreak(streak + 1);
      sfx.success();

      const target = opponents[0];
      setFeed((f) => [
        { id: Math.random().toString(36), text: `+${dmg} hasar${speedBonus ? ' (KRİTİK)' : ''}`, tone: 'good' },
        ...f.slice(0, 5),
      ]);

      if (target) {
        sendAttack(speedBonus ? 'burst' : 'glitch', target.id);
        sendDamage(target.id, dmg, speedBonus ? 'kritik vuruş' : 'doğru cevap');
        pushToast(`${target.name} → ${dmg} hasar`, 'good');
      }
    } else {
      setStreak(0);
      setHp((h) => Math.max(0, h - 5));
      sfx.deny();
      setFeed((f) => [
        { id: Math.random().toString(36), text: '-5 kalkan (yanlış)', tone: 'bad' },
        ...f.slice(0, 5),
      ]);
    }

    setTimeout(() => {
      setQi((v) => v + 1);
      setLocked(null);
      setTimeLeft(TIME_PER_Q);
    }, right ? 700 : 1300);
  };

  const reset = () => {
    setHp(MAX_HP);
    setScore(0);
    setStreak(0);
    setQi(0);
    setTimeLeft(TIME_PER_Q);
    setLocked(null);
    setPhase('countdown');
    setCountdown(3);
    sfx.click();
  };

  /* ---------------- category picker ---------------- */
  if (!picked) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="text-center">
          <p className="label">cerebral clash</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-white">KATEGORİ SEÇ</h1>
          <p className="mx-auto mt-3 max-w-lg text-xs leading-relaxed text-[var(--text-mid)]">
            Sorular seçtiğin kategoriye göre gelir ve savaş alanının atmosferi ona göre değişir.
          </p>
        </div>

        <div className="stagger grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CATEGORIES.map((c) => {
            const count = (QUESTIONS_BY_CATEGORY[c.id] ?? []).length;
            return (
              <button
                key={c.id}
                onClick={() => {
                  setCategory(c.id);
                  setPicked(true);
                  sfx.confirm();
                }}
                className="panel group relative overflow-hidden p-0 text-left transition-all duration-300 hover:-translate-y-1"
                style={{ borderColor: undefined }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = c.accent;
                  e.currentTarget.style.boxShadow = `0 0 34px ${c.accent}33`;
                  sfx.hover();
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '';
                  e.currentTarget.style.boxShadow = '';
                }}
              >
                {/* Miniature of the arena backdrop */}
                <div className="relative h-24" style={{ background: c.backdrop }}>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                  <span
                    className="absolute bottom-2 left-4 text-[10px] font-black uppercase tracking-[0.24em]"
                    style={{ color: c.accent }}
                  >
                    {c.name}
                  </span>
                </div>
                <div className="flex items-center justify-between p-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-white">{c.blurb}</p>
                    <p className="mt-0.5 text-[10px] text-[var(--text-lo)]">{count} soru</p>
                  </div>
                  <span className="transition-transform group-hover:translate-x-1" style={{ color: c.accent }}>
                    <IconChevron size={16} />
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex justify-center">
          <Btn tone="ghost" onClick={() => setMode('hub')}>
            ← merkez
          </Btn>
        </div>
      </div>
    );
  }

  /* ---------------- countdown ---------------- */
  if (phase === 'countdown') {
    return (
      <div className="relative flex min-h-[60vh] items-center justify-center overflow-hidden rounded-2xl">
        <div className="absolute inset-0 -z-10 rounded-2xl" style={{ background: cat?.backdrop }} />
        <div className="text-center">
          <Chip color={cat?.accent}>{cat?.name}</Chip>
          <p key={countdown} className="anim-rise mt-4 text-8xl font-black text-white text-glow">
            {countdown > 0 ? countdown : 'SİLAHLI'}
          </p>
          <p className="mt-4 text-xs text-[var(--text-mid)]">
            {opponents.length > 0
              ? `${opponents.length + 1} operatör bağlı`
              : 'rakip bekleniyor — yeni sekme açarak katıl'}
          </p>
          <div className="mt-6 flex justify-center gap-2">
            <Btn tone="ghost" onClick={() => setPicked(false)}>
              kategori değiştir
            </Btn>
            <Btn tone="ghost" onClick={() => setMode('hub')}>
              merkez
            </Btn>
          </div>
        </div>
      </div>
    );
  }

  /* ---------------- game over ---------------- */
  if (phase === 'over') {
    return (
      <div className="mx-auto max-w-lg">
        <Panel accent="var(--neon-rose)" bodyClass="p-8">
          <div className="anim-rise text-center">
            <IconSkull size={48} className="mx-auto mb-4 text-[var(--neon-rose)]" />
            <h2 className="text-3xl font-black uppercase tracking-tight text-[var(--neon-rose)]">
              kalkan çöktü
            </h2>
            <p className="mt-3 text-sm text-[var(--text-mid)]">
              Toplam skor: <span className="font-black text-white">{score}</span>
            </p>

            <div className="mt-6 space-y-2">
              {fighters.map((f, i) => (
                <div
                  key={f.id}
                  className="flex items-center justify-between rounded-lg border border-[var(--line)] px-4 py-2"
                  style={{ borderColor: f.id === playerId ? `${f.color}66` : undefined }}
                >
                  <span className="flex items-center gap-2 text-xs font-bold" style={{ color: f.color }}>
                    <span className="stat text-[var(--text-lo)]">#{i + 1}</span>
                    {f.name} {f.id === playerId && <span className="text-[9px]">(SEN)</span>}
                  </span>
                  <span className="stat text-sm font-black text-white">{f.score}</span>
                </div>
              ))}
            </div>

            <div className="mt-6 flex justify-center gap-2">
              <Btn tone="rose" onClick={reset}>
                yeniden
              </Btn>
              <Btn tone="ghost" onClick={() => setPicked(false)}>
                kategori
              </Btn>
              <Btn tone="ghost" onClick={() => setMode('hub')}>
                merkez
              </Btn>
            </div>
          </div>
        </Panel>
      </div>
    );
  }

  /* ---------------- playing ---------------- */
  const urgent = timeLeft <= 5;

  return (
    <div className="relative overflow-hidden rounded-2xl">
      {/* Themed arena backdrop */}
      <div className="pointer-events-none absolute inset-0 rounded-2xl opacity-80" style={{ background: cat?.backdrop }} />
      <div className="pointer-events-none absolute inset-0 grid-bg rounded-2xl opacity-40" />

      <div className="relative grid grid-cols-1 gap-5 p-1 lg:grid-cols-4">
        <div className="space-y-5 lg:col-span-3">
          {/* Roster */}
          <Panel title="SAVAŞ ALANI" subtitle={cat?.name} accent={cat?.accent} bodyClass="p-4">
            <div className="space-y-3">
              {[{ id: playerId, name, color, hp, score, streak }, ...opponents].map((f) => (
                <div key={f.id} className="flex items-center gap-3">
                  <span
                    className="w-24 shrink-0 truncate text-[10px] font-black uppercase tracking-wider"
                    style={{ color: f.color }}
                  >
                    {f.name}
                    {f.id === playerId && <span className="ml-1 text-[8px] text-[var(--text-lo)]">SEN</span>}
                  </span>
                  <div className="flex-1">
                    <Meter
                      value={f.hp}
                      max={MAX_HP}
                      height={8}
                      color={f.hp > 50 ? 'var(--neon-green)' : f.hp > 25 ? 'var(--neon-amber)' : 'var(--neon-rose)'}
                    />
                  </div>
                  <span className="stat w-12 shrink-0 text-right text-xs font-black text-white">{f.score}</span>
                  {f.streak > 1 && <Chip color="var(--neon-amber)">{f.streak}x</Chip>}
                </div>
              ))}
            </div>
          </Panel>

          {/* Question */}
          <Panel
            accent={cat?.accent ?? 'var(--neon-rose)'}
            title={`SORU ${qi + 1}`}
            subtitle={`Kalan süre: ${timeLeft}s`}
            right={
              <div className="flex items-center gap-2">
                {streak > 1 && <Chip color="var(--neon-amber)">{streak} SERİ</Chip>}
                <span className={`stat text-lg font-black ${urgent ? 'anim-pulse text-[var(--neon-rose)]' : 'text-white'}`}>
                  {timeLeft}
                </span>
              </div>
            }
            bodyClass="p-6"
          >
            <div className="mb-5 h-1 overflow-hidden rounded-full bg-white/5">
              <div
                className="h-full transition-[width] duration-1000 ease-linear"
                style={{
                  width: `${(timeLeft / TIME_PER_Q) * 100}%`,
                  background: urgent ? 'var(--neon-rose)' : cat?.accent ?? 'var(--neon-cyan)',
                }}
              />
            </div>

            <h2 className="mb-6 text-xl font-bold leading-snug text-white">{q?.q}</h2>

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {q?.a.map((a, i) => {
                const isPicked = locked === i;
                const isCorrect = i === q.correct;
                const reveal = locked !== null;

                let border = 'var(--line-strong)';
                let bg = 'rgba(255,255,255,0.02)';
                let fg = 'var(--text-mid)';
                if (reveal && isCorrect) {
                  border = 'var(--neon-green)';
                  bg = 'rgba(74,222,128,0.14)';
                  fg = 'var(--neon-green)';
                } else if (reveal && isPicked) {
                  border = 'var(--neon-rose)';
                  bg = 'rgba(244,63,94,0.14)';
                  fg = 'var(--neon-rose)';
                }

                return (
                  <button
                    key={a}
                    onClick={() => answer(i)}
                    disabled={reveal}
                    className="flex items-center gap-3 rounded-lg border px-4 py-3.5 text-left transition-all duration-200 disabled:cursor-default"
                    style={{ borderColor: border, background: bg }}
                  >
                    <span
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded border text-[11px] font-black"
                      style={{ borderColor: border, color: fg }}
                    >
                      {LETTERS[i]}
                    </span>
                    <span className="text-sm font-medium" style={{ color: fg }}>
                      {a}
                    </span>
                  </button>
                );
              })}
            </div>

            <p className="mt-4 text-center text-[10px] uppercase tracking-[0.18em] text-[var(--text-lo)]">
              hızlı cevap = 2 kat hasar · seri = daha çok hasar
            </p>
          </Panel>

          {feed.length > 0 && (
            <Panel title="HASAR KAYDI" accent="var(--neon-amber)" bodyClass="p-4">
              <div className="space-y-1.5">
                {feed.map((f) => (
                  <p
                    key={f.id}
                    className="anim-slide stat text-[11px] font-bold"
                    style={{ color: f.tone === 'good' ? 'var(--neon-green)' : 'var(--neon-rose)' }}
                  >
                    ▸ {f.text}
                  </p>
                ))}
              </div>
            </Panel>
          )}
        </div>

        {/* Side */}
        <div className="space-y-5">
          <Panel title="SENİN DURUMUN" accent={cat?.accent} bodyClass="p-4">
            <div className="space-y-4">
              <Meter
                value={hp}
                max={MAX_HP}
                label="KALKAN"
                height={9}
                color={hp > 50 ? 'var(--neon-green)' : hp > 25 ? 'var(--neon-amber)' : 'var(--neon-rose)'}
              />
              <div className="grid grid-cols-2 gap-3">
                <div className="inset-well p-3 text-center">
                  <p className="label">skor</p>
                  <p className="stat text-2xl font-black text-white">{score}</p>
                </div>
                <div className="inset-well p-3 text-center">
                  <p className="label">seri</p>
                  <p className="stat text-2xl font-black text-[var(--neon-amber)]">{streak}</p>
                </div>
              </div>
            </div>
          </Panel>

          <Panel title="SALDIRI" subtitle="Rakibe müdahale" accent="var(--neon-rose)" bodyClass="p-4">
            <div className="space-y-2">
              {opponents.length === 0 && (
                <p className="py-2 text-center text-[10px] uppercase tracking-widest text-[var(--text-lo)]">
                  rakip yok
                </p>
              )}
              {opponents.map((o) => (
                <div key={o.id} className="flex items-center gap-2">
                  <span className="flex-1 truncate text-[10px] font-bold" style={{ color: o.color }}>
                    {o.name}
                  </span>
                  <button
                    onClick={() => {
                      sendAttack('blur', o.id);
                      sfx.attack();
                    }}
                    className="rounded border border-[var(--neon-rose)]/40 px-2 py-1 text-[9px] font-bold uppercase text-[var(--neon-rose)] hover:bg-[var(--neon-rose)]/12"
                  >
                    bulanık
                  </button>
                  <button
                    onClick={() => {
                      sendAttack('flip', o.id);
                      sfx.attack();
                    }}
                    className="rounded border border-[var(--neon-rose)]/40 px-2 py-1 text-[9px] font-bold uppercase text-[var(--neon-rose)] hover:bg-[var(--neon-rose)]/12"
                  >
                    ters
                  </button>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="TAKIM İLETİŞİMİ" accent="var(--neon-cyan)" bodyClass="p-4">
            <CommsPanel compact />
          </Panel>
        </div>
      </div>
    </div>
  );
};
