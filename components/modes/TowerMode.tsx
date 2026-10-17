'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useGame } from '@/store/useGameStore';
import { Panel, Btn, Meter, Chip } from '@/components/ui/Panel';
import { CommsPanel } from '@/components/ui/CommsPanel';
import { WORD_TIERS } from '@/config/game';
import { sfx } from '@/lib/sfx';
import { IconTower, IconBolt, IconSkull, IconShield, IconSignature } from '@/components/ui/Icons';

const BASE_HP = 100;
const SPAWN_MS = 2300;

interface Falling {
  id: string;
  word: string;
  tier: 1 | 2 | 3;
  power: number;
  color: string;
  y: number;      // 0 → 100, hits 100 at the tower
  speed: number;
}

interface Soldier {
  id: string;
  power: number;
  color: string;
  progress: number; // 0 → 100 toward the enemy tower
  target: string;
}

function pickWord(taken: Set<string>) {
  const tier = WORD_TIERS[Math.floor(Math.random() * WORD_TIERS.length)];
  const pool = tier.words.filter((w) => !taken.has(w));
  const word = pool.length ? pool[Math.floor(Math.random() * pool.length)] : tier.words[0];
  return { word, tier: tier.tier, power: tier.power, color: tier.color };
}

export const TowerMode: React.FC = () => {
  const playerId = useGame((s) => s.playerId);
  const name = useGame((s) => s.name);
  const color = useGame((s) => s.color);
  const peers = useGame((s) => s.peers);
  const setMode = useGame((s) => s.setMode);
  const postShared = useGame((s) => s.postShared);
  const shared = useGame((s) => s.shared);
  const pushToast = useGame((s) => s.pushToast);
  const sendDamage = useGame((s) => s.sendDamage);
  const drainIncoming = useGame((s) => s.drainIncoming);

  const [hp, setHp] = useState(BASE_HP);
  const [score, setScore] = useState(0);
  const [typed, setTyped] = useState('');
  const [falling, setFalling] = useState<Falling[]>([]);
  const [soldiers, setSoldiers] = useState<Soldier[]>([]);
  const [phase, setPhase] = useState<'countdown' | 'playing' | 'over'>('countdown');
  const [countdown, setCountdown] = useState(3);

  const inputRef = useRef<HTMLInputElement>(null);
  const takenRef = useRef<Set<string>>(new Set());
  /* Mirrors of the two moving lists, so the simulation loop can read the
   * current values without re-subscribing on every frame. */
  const fallingRef = useRef<Falling[]>([]);
  const soldierRef = useRef<Soldier[]>([]);
  /* Keep the current target readable from inside the simulation interval. */
  const targetEnemyRef = useRef<{ id: string; name: string } | null>(null);

  /* Publish vitals. */
  useEffect(() => {
    if (!playerId) return;
    postShared(`tower:player:${playerId}`, { id: playerId, name, color, hp, score });
  }, [playerId, name, color, hp, score, postShared]);

  const enemies = useMemo(() => {
    const list: { id: string; name: string; color: string; hp: number; score: number }[] = [];
    Object.entries(shared).forEach(([k, v]) => {
      if (!k.startsWith('tower:player:')) return;
      const p = v as { id: string; name: string; color: string; hp: number; score: number };
      if (p && p.id !== playerId && typeof p.hp === 'number') list.push(p);
    });
    return list;
  }, [shared, playerId]);

  const targetEnemy = enemies[0];

  useEffect(() => {
    targetEnemyRef.current = targetEnemy ? { id: targetEnemy.id, name: targetEnemy.name } : null;
  }, [targetEnemy]);

  /* Countdown. */
  useEffect(() => {
    if (phase !== 'countdown') return;
    if (countdown <= 0) {
      setPhase('playing');
      sfx.power();
      inputRef.current?.focus();
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 800);
    return () => clearTimeout(t);
  }, [countdown, phase]);

  /* Spawn falling words. */
  useEffect(() => {
    if (phase !== 'playing') return;
    const id = setInterval(() => {
      const { word, tier, power, color } = pickWord(takenRef.current);
      takenRef.current.add(word);
      const next = [
        ...fallingRef.current,
        {
          id: Math.random().toString(36).slice(2),
          word,
          tier,
          power,
          color,
          y: -6,
          // Longer words fall slower — that's the difficulty balance.
          speed: 0.32 + tier * 0.06 - word.length * 0.006,
        },
      ];
      fallingRef.current = next;
      setFalling(next);
    }, SPAWN_MS);
    return () => clearInterval(id);
  }, [phase]);

  /* Gravity, tower damage and the marching front.
   *
   * Everything here is computed BEFORE calling setState. Doing damage maths
   * inside a setState updater would run twice under StrictMode and silently
   * double every hit. */
  useEffect(() => {
    if (phase !== 'playing') return;

    const id = setInterval(() => {
      const current = fallingRef.current;

      /* --- gravity --- */
      let dmg = 0;
      const survivors: Falling[] = [];
      for (const w of current) {
        const y = w.y + w.speed;
        if (y >= 100) {
          dmg += w.power * 4;
          takenRef.current.delete(w.word);
        } else {
          survivors.push({ ...w, y });
        }
      }
      if (dmg > 0) {
        setHp((h) => Math.max(0, h - dmg));
        sfx.hit();
      }
      if (survivors.length !== current.length || survivors.some((s, i) => s.y !== current[i]?.y)) {
        fallingRef.current = survivors;
        setFalling(survivors);
      }

      /* --- soldiers --- */
      const marching = soldierRef.current;
      let arrivedDmg = 0;
      const stillMarching: Soldier[] = [];
      for (const s of marching) {
        const progress = s.progress + 2.2 + s.power * 0.5;
        if (progress >= 100) arrivedDmg += s.power * 5;
        else stillMarching.push({ ...s, progress });
      }
      if (arrivedDmg > 0 && targetEnemyRef.current) {
        // Soldiers that reach the line actually strike the enemy tower.
        sendDamage(targetEnemyRef.current.id, arrivedDmg, 'birlik akını');
        pushToast(`${targetEnemyRef.current.name} → ${arrivedDmg} hasar`, 'good');
        sfx.hit();
      }
      soldierRef.current = stillMarching;
      setSoldiers(stillMarching);
    }, 60);

    return () => clearInterval(id);
  }, [phase, pushToast, sendDamage]);

  /* Damage other players' soldiers have dealt to our tower. */
  useEffect(() => {
    const id = setInterval(() => {
      const queued = drainIncoming();
      if (queued.length === 0) return;
      const total = queued.reduce((sum, d) => sum + d.amount, 0);
      setHp((h) => Math.max(0, h - total));
      sfx.hit();
    }, 200);
    return () => clearInterval(id);
  }, [drainIncoming]);

  /* Death. */
  useEffect(() => {
    if (hp <= 0 && phase === 'playing') {
      setPhase('over');
      sfx.fail();
    }
  }, [hp, phase]);

  /* Typing. The input captures keystrokes but we resolve on exact match. */
  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setTyped(v);
    sfx.key();

    const normalized = v.trim().toLowerCase();
    if (!normalized) return;

    // Exact match wins, even if several words start the same way.
    const hit = fallingRef.current.find((w) => w.word.toLowerCase() === normalized);
    if (hit) {
      takenRef.current.delete(hit.word);

      const remaining = fallingRef.current.filter((w) => w.id !== hit.id);
      fallingRef.current = remaining;
      setFalling(remaining);

      const marching = [
        ...soldierRef.current,
        {
          id: Math.random().toString(36).slice(2),
          power: hit.power,
          color: hit.color,
          progress: 0,
          target: targetEnemy?.id ?? '',
        },
      ];
      soldierRef.current = marching;
      setSoldiers(marching);

      setScore((s) => s + hit.power * 10);
      sfx.confirm();
      setTyped('');
    }
  };

  const reset = () => {
    setHp(BASE_HP);
    setScore(0);
    setTyped('');
    setFalling([]);
    setSoldiers([]);
    takenRef.current = new Set();
    fallingRef.current = [];
    soldierRef.current = [];
    setPhase('countdown');
    setCountdown(3);
    sfx.click();
  };

  /* Highlight which part of each word the current input matches. */
  const renderWord = (w: Falling) => {
    const t = typed.trim().toLowerCase();
    const isPrefix = t.length > 0 && w.word.toLowerCase().startsWith(t);
    const matched = isPrefix ? w.word.slice(0, t.length) : '';
    const rest = isPrefix ? w.word.slice(t.length) : w.word;

    return (
      <span className="font-mono text-sm font-black tracking-wider">
        <span style={{ color: 'var(--neon-green)' }}>{matched}</span>
        <span style={{ color: w.color }}>{rest}</span>
      </span>
    );
  };

  if (phase === 'countdown') {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <p className="label mb-3">kule savunması</p>
          <p key={countdown} className="anim-rise text-8xl font-black text-[var(--neon-amber)] text-glow">
            {countdown > 0 ? countdown : 'YAZ'}
          </p>
          <p className="mt-4 max-w-sm text-xs text-[var(--text-mid)]">
            Gökten düşen kelimeleri yaz. Her doğru kelime bir asker doğurur ve rakip kuleye yürür.
            Kelimeler kulene değerse hasar alırsın.
          </p>
          <div className="mt-6 flex justify-center">
            <Btn tone="ghost" onClick={() => setMode('hub')}>
              ← merkez
            </Btn>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'over') {
    return (
      <div className="mx-auto max-w-lg">
        <Panel accent="var(--neon-rose)" bodyClass="p-8">
          <div className="anim-rise text-center">
            <IconSkull size={48} className="mx-auto mb-4 text-[var(--neon-rose)]" />
            <h2 className="text-3xl font-black uppercase tracking-tight text-[var(--neon-rose)]">
              kule düştü
            </h2>
            <p className="mt-3 text-sm text-[var(--text-mid)]">
              Skor: <span className="font-black text-white">{score}</span>
            </p>
            <div className="mt-6 flex justify-center gap-2">
              <Btn tone="amber" onClick={reset}>
                yeniden
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

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-4">
      {/* Battlefield */}
      <div className="space-y-5 lg:col-span-3">
        <Panel
          title="SAVAŞ ALANI"
          subtitle="Kelimeleri yaz — asker gönder"
          accent="var(--neon-amber)"
          right={<Chip color="var(--neon-amber)">{falling.length} HEDEF</Chip>}
          bodyClass="p-0"
        >
          {/* Falling field */}
          <div className="grid-bg relative h-[380px] overflow-hidden">
            {falling.map((w) => (
              <div
                key={w.id}
                className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md border px-3 py-1.5 backdrop-blur-sm"
                style={{
                  top: `${w.y}%`,
                  borderColor: `${w.color}55`,
                  background: `${w.color}12`,
                  boxShadow: `0 0 14px ${w.color}22`,
                }}
              >
                {renderWord(w)}
              </div>
            ))}

            {falling.length === 0 && (
              <p className="absolute inset-0 flex items-center justify-center text-[10px] uppercase tracking-[0.2em] text-[var(--text-lo)]">
                kelime bekleniyor...
              </p>
            )}

            {/* The danger line — where words strike the tower */}
            <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-px bg-[var(--neon-rose)]/50" />
          </div>

          {/* Input */}
          <div className="border-t border-[var(--line)] p-4">
            <div className="flex items-center gap-3">
              <IconSignature size={18} className="shrink-0 text-[var(--neon-amber)]" />
              <input
                ref={inputRef}
                value={typed}
                onChange={onChange}
                autoFocus
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                placeholder="kelimeyi buraya yaz..."
                className="inset-well min-w-0 flex-1 px-4 py-3 font-mono text-lg tracking-widest text-[var(--text-hi)] outline-none placeholder:text-sm placeholder:tracking-normal placeholder:text-[var(--text-lo)] focus:border-[var(--neon-amber)]/50"
              />
            </div>
            <p className="mt-2 text-[9px] uppercase tracking-[0.18em] text-[var(--text-lo)]">
              uzun kelime = güçlü asker · yavaş düşer
            </p>
          </div>
        </Panel>

        {/* Marching soldiers */}
        <Panel title="CEPHE HATTI" subtitle="Kuleye yürüyen birlikler" accent="var(--neon-cyan)" bodyClass="p-5">
          {soldiers.length === 0 ? (
            <p className="py-6 text-center text-[10px] uppercase tracking-[0.2em] text-[var(--text-lo)]">
              birlik yok — kelime yaz
            </p>
          ) : (
            <div className="relative h-16 overflow-hidden rounded-lg bg-black/40">
              {soldiers.map((s) => (
                <div
                  key={s.id}
                  className="absolute top-1/2 -translate-y-1/2 transition-[left] duration-75"
                  style={{ left: `${s.progress}%` }}
                >
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded border"
                    style={{ borderColor: s.color, background: `${s.color}22`, boxShadow: `0 0 12px ${s.color}55` }}
                  >
                    <IconBolt size={14} className="text-white" />
                  </div>
                </div>
              ))}
              <div className="pointer-events-none absolute right-0 top-0 flex h-full items-center pr-2">
                <IconTower size={22} className="text-[var(--neon-rose)]/60" />
              </div>
            </div>
          )}
        </Panel>
      </div>

      {/* Side */}
      <div className="space-y-5">
        <Panel title="KULE DURUMU" accent="var(--neon-amber)" bodyClass="p-4">
          <Meter
            value={hp}
            max={BASE_HP}
            label="KULE SAĞLIĞI"
            height={10}
            color={hp > 50 ? 'var(--neon-green)' : hp > 25 ? 'var(--neon-amber)' : 'var(--neon-rose)'}
          />
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="inset-well p-3 text-center">
              <p className="label">skor</p>
              <p className="stat text-2xl font-black text-white">{score}</p>
            </div>
            <div className="inset-well p-3 text-center">
              <p className="label">birlik</p>
              <p className="stat text-2xl font-black text-[var(--neon-cyan)]">{soldiers.length}</p>
            </div>
          </div>
        </Panel>

        <Panel title="DÜŞMAN KULELERİ" accent="var(--neon-rose)" bodyClass="p-4">
          {enemies.length === 0 ? (
            <p className="py-4 text-center text-[10px] uppercase tracking-[0.2em] text-[var(--text-lo)]">
              rakip yok — yeni sekme aç
            </p>
          ) : (
            <div className="space-y-3">
              {enemies.map((e) => (
                <div key={e.id}>
                  <div className="mb-1 flex justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: e.color }}>
                      {e.name}
                    </span>
                    <span className="stat text-[10px] text-[var(--text-lo)]">{e.score} puan</span>
                  </div>
                  <Meter
                    value={e.hp}
                    max={BASE_HP}
                    height={6}
                    color={e.hp > 50 ? 'var(--neon-green)' : e.hp > 25 ? 'var(--neon-amber)' : 'var(--neon-rose)'}
                  />
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="TAKIM İLETİŞİMİ" accent="var(--neon-cyan)" bodyClass="p-4">
          <CommsPanel compact />
        </Panel>
      </div>
    </div>
  );
};
