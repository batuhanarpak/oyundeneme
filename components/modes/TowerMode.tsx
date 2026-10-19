'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useGame } from '@/store/useGameStore';
import { Panel, Btn, Meter, Chip } from '@/components/ui/Panel';
import { CommsPanel } from '@/components/ui/CommsPanel';
import {
  Battlefield,
  HOME_HP,
  homeNode,
  outpostNode,
  resolveClashes,
  slotMap,
  nodePos,
  type Burst,
  type Garrison,
  type MapPlayer,
} from '@/components/ui/Battlefield';
import { WORD_TIERS } from '@/config/game';
import { sfx } from '@/lib/sfx';
import { IconSignature, IconBolt, IconTarget, IconBlades } from '@/components/ui/Icons';
import { alpha } from '@/lib/color';
import { TerminalScreen } from '@/components/ui/TerminalScreen';

const SPAWN_MS = 2200;
/** Travel time for a direct hop; longer routes scale up from this. */
const HOP_MS = 3000;
/** Seconds between ultimate charges. */
const ULT_COOLDOWN = 22;
const ULT_DAMAGE = 26;

/** Words required before the slow-motion window opens. */
const SLOWMO_EVERY = 10;
const SLOWMO_SECONDS = 7;
/** Roughly how fast a keep must be falling to trigger the siege duel. */
const SIEGE_HP = 22;

interface Falling {
  id: string;
  word: string;
  tier: 1 | 2 | 3;
  power: number;
  color: string;
  y: number;
  x: number;
  drift: number;
  speed: number;
  rot: number;
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
  const setMode = useGame((s) => s.setMode);
  const postShared = useGame((s) => s.postShared);
  const shared = useGame((s) => s.shared);
  const pushToast = useGame((s) => s.pushToast);
  const sendDamage = useGame((s) => s.sendDamage);
  const drainIncoming = useGame((s) => s.drainIncoming);
  const soldiers = useGame((s) => s.soldiers);
  const sendSoldier = useGame((s) => s.sendSoldier);
  const announceKills = useGame((s) => s.announceKills);
  const startSlowmo = useGame((s) => s.startSlowmo);
  const slowUntil = useGame((s) => s.slowUntil);
  const duel = useGame((s) => s.duel);
  const inviteDuel = useGame((s) => s.inviteDuel);

  const [hp, setHp] = useState(HOME_HP);
  const [score, setScore] = useState(0);
  const [typed, setTyped] = useState('');
  const [falling, setFalling] = useState<Falling[]>([]);
  const [phase, setPhase] = useState<'countdown' | 'playing' | 'over'>('countdown');
  const [countdown, setCountdown] = useState(3);
  const [clock, setClock] = useState(0);
  const [bursts, setBursts] = useState<Burst[]>([]);
  const [ultReadyAt, setUltReadyAt] = useState(0);
  const [nowMs, setNowMs] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const takenRef = useRef<Set<string>>(new Set());
  /* Mirror of `falling` so the simulation loop reads live values without
     re-subscribing on every frame. */
  const fallingRef = useRef<Falling[]>([]);
  /* Readable from inside the simulation interval without re-subscribing. */
  const playersRef = useRef<MapPlayer[]>([]);
  const solvedRef = useRef(0);
  const [solved, setSolved] = useState(0);
  /* Keeps we have already challenged, so a siege fires once per keep. */
  const siegeRef = useRef<Set<string>>(new Set());

  /* ---- garrisons + outposts live in `shared` so everyone agrees ---- */
  const ME_HOME = homeNode(playerId);
  const garrisons: Garrison[] = useMemo(() => {
    const list: Garrison[] = [];
    Object.entries(shared).forEach(([k, v]) => {
      if (!k.startsWith('tower:garrison:')) return;
      const g = v as Garrison;
      if (g && typeof g.count === 'number') list.push(g);
    });
    // Always show our own home, even at zero.
    if (!list.some((g) => g.node === ME_HOME)) {
      list.push({ node: ME_HOME, ownerId: playerId, power: 1, count: 0 });
    }
    return list;
  }, [shared, ME_HOME, playerId]);

  const myGarrison = garrisons.find((g) => g.node === ME_HOME);
  const myCount = myGarrison?.count ?? 0;

  const outpostOwners: Record<number, string> = useMemo(() => {
    const m: Record<number, string> = {};
    Object.entries(shared).forEach(([k, v]) => {
      if (!k.startsWith('tower:outpost:')) return;
      const i = Number(k.slice('tower:outpost:'.length));
      if (typeof v === 'string') m[i] = v;
    });
    return m;
  }, [shared]);

  /* ---- roster ---- */
  const players: MapPlayer[] = useMemo(() => {
    const list: MapPlayer[] = [{ id: playerId, name, color, hp, maxHp: HOME_HP, score }];
    Object.entries(shared).forEach(([k, v]) => {
      if (!k.startsWith('tower:player:')) return;
      const p = v as { id: string; name: string; color: string; hp: number; score: number };
      if (p && p.id !== playerId && typeof p.hp === 'number') {
        list.push({ id: p.id, name: p.name, color: p.color, hp: p.hp, maxHp: HOME_HP, score: p.score });
      }
    });
    return list;
  }, [shared, playerId, name, color, hp, score]);

  useEffect(() => {
    if (!playerId) return;
    postShared(`tower:player:${playerId}`, { id: playerId, name, color, hp, score });
  }, [playerId, name, color, hp, score, postShared]);

  /* The clash resolver needs the current roster, but lives inside an
     interval that must not re-subscribe whenever somebody's HP ticks. */
  useEffect(() => {
    playersRef.current = players;
  }, [players]);

  /* ---- ultimate: charges on a timer, strikes every enemy keep --- */
  useEffect(() => {
    if (ultReadyAt === 0) setUltReadyAt(Date.now() + ULT_COOLDOWN * 1000);
  }, [ultReadyAt]);

  const ultCharge = Math.max(0, Math.min(1, 1 - (ultReadyAt - nowMs) / (ULT_COOLDOWN * 1000)));
  const ultReady = nowMs >= ultReadyAt && ultReadyAt > 0;

  const fireUlt = () => {
    if (!ultReady) return;
    const targets = playersRef.current.filter((p) => p.id !== playerId && p.hp > 0);
    if (targets.length === 0) {
      pushToast('hedef yok', 'warn');
      sfx.deny();
      return;
    }
    targets.forEach((t, i) => {
      window.setTimeout(() => {
        sendDamage(t.id, ULT_DAMAGE, 'ULTİ');
        sfx.alarm();
      }, i * 180);
    });

    /* A flash on every keep for local feedback. */
    const slots = slotMap(playersRef.current);
    targets.forEach((t) => {
      const pos = nodePos(homeNode(t.id), slots);
      if (!pos) return;
      setBursts((b) => [
        ...b.slice(-24),
        { id: `ult-${t.id}-${Date.now()}`, x: pos.x, y: pos.y, color: '#f43f5e', power: 3, at: Date.now() },
      ]);
    });

    setUltReadyAt(Date.now() + ULT_COOLDOWN * 1000);
    sfx.attack();
    pushToast(`ULTİ — ${targets.length} kuleye ${ULT_DAMAGE} hasar`, 'warn');
  };

  /* ---- garrison helpers ---- */
  const writeGarrison = (node: string, ownerId: string, power: number, count: number) => {
    postShared(`tower:garrison:${node}`, { node, ownerId, power, count });
  };

  /* Bank a solved word into the home garrison.
     Reads the freshest state from the store rather than the render closure —
     two words solved in quick succession would otherwise both read the same
     stale count and one of them would be lost. */
  const bank = (w: Falling) => {
    const key = `tower:garrison:${ME_HOME}`;
    const cur = useGame.getState().shared[key] as Garrison | undefined;
    const count = (cur?.count ?? 0) + 1;
    const power = cur?.count ? (cur.power * cur.count + w.power) / count : w.power;
    writeGarrison(ME_HOME, playerId, power, count);
    setScore((s) => s + w.power * 10);
  };

  /* ---- countdown ---- */
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

  /* ---- word rain ---- */
  useEffect(() => {
    if (phase !== 'playing') return;
    const id = setInterval(() => {
      const { word, tier, power, color: c } = pickWord(takenRef.current);
      takenRef.current.add(word);
      const next: Falling[] = [
        ...fallingRef.current,
        {
          id: Math.random().toString(36).slice(2),
          word,
          tier,
          power,
          color: c,
          y: -8,
          /* Scattered horizontal placement — words drift down the whole field
             instead of marching in a single column. */
          x: 8 + Math.random() * 84,
          drift: (Math.random() - 0.5) * 0.22,
          speed: 0.3 + tier * 0.06 - word.length * 0.005,
          rot: (Math.random() - 0.5) * 14,
        },
      ];
      fallingRef.current = next;
      setFalling(next);
    }, SPAWN_MS);
    return () => clearInterval(id);
  }, [phase]);

  /* ---- simulation ---- */
  useEffect(() => {
    if (phase !== 'playing') return;
    const id = setInterval(() => {
      /* Bullet time stretches every animation on this screen. */
      const slow = Date.now() < useGame.getState().slowUntil;
      const scale = slow ? 0.28 : 1;

      /* Words hitting our own keep. */
      const current = fallingRef.current;
      let dmg = 0;
      const survivors: Falling[] = [];
      for (const w of current) {
        const y = w.y + w.speed * scale;
        const x = Math.max(6, Math.min(94, w.x + w.drift * scale));
        if (y >= 100) {
          dmg += w.power * 4;
          takenRef.current.delete(w.word);
        } else {
          survivors.push({ ...w, y, x });
        }
      }
      if (dmg > 0) {
        setHp((h) => Math.max(0, h - dmg));
        sfx.hit();
      }
      fallingRef.current = survivors;
      setFalling(survivors);

      /* Arrivals. Only the owner resolves a march, otherwise every client
         would apply the same hit. */
      const landed = useGame.getState().pruneSoldiers();
      landed.forEach((s) => {
        if (s.ownerId !== playerId) return;

        if (s.toNode.startsWith('h:')) {
          /* Raid on a home keep. */
          const target = s.toNode.slice(2);
          if (target !== playerId) sendDamage(target, s.power * 5, 'birlik akını');
        } else {
          /* Reinforce / capture an outpost. */
          const idx = Number(s.toNode.slice(2));
          const key = `tower:garrison:${s.toNode}`;
          const cur = useGame.getState().shared[key] as Garrison | undefined;
          const count = (cur?.count ?? 0) + 1;
          const power = cur?.count ? (cur.power * cur.count + s.power) / count : s.power;
          writeGarrison(s.toNode, playerId, power, count);

          /* Claiming an empty outpost announces the takeover. */
          const prevOwner = useGame.getState().shared[`tower:outpost:${idx}`];
          if (prevOwner !== playerId) {
            postShared(`tower:outpost:${idx}`, playerId);
            if (prevOwner && prevOwner !== playerId) {
              pushToast(`${idx + 1}. karakol ele geçirildi`, 'good');
            }
          }
        }
      });

      /* Unit-versus-unit combat. Deterministic — every client derives the same
         casualties from the same positions, so no message is needed to keep
         the battle itself in sync. Deaths are still broadcast so a unit that
         spawned just before it died can't linger on a client that hadn't
         processed the kill yet. */
      const alive = useGame.getState().soldiers;
      const slots = slotMap(playersRef.current);
      const { dead, bursts: fresh } = resolveClashes(alive, slots, Date.now());

      if (dead.length) {
        announceKills(dead);
        sfx.hit();
      }
      if (fresh.length) {
        setBursts((b) => [...b.slice(-24), ...fresh]);
      }

      const now = Date.now();
      /* Drop expired kill flashes. */
      setBursts((b) => (b.some((x) => now - x.at >= 900) ? b.filter((x) => now - x.at < 900) : b));

      setClock((c) => c + 1);
      setNowMs(now);
    }, 60);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, playerId, sendDamage, pushToast, announceKills]);

  /* ---- incoming damage ---- */
  useEffect(() => {
    const id = setInterval(() => {
      const queued = drainIncoming();
      if (queued.length === 0) return;
      const total = queued.reduce((sum, d) => sum + d.amount, 0);
      setHp((h) => Math.max(0, h - total));
      sfx.hit();
      queued.slice(0, 2).forEach((q) => pushToast(`${q.fromName} → ${q.amount} hasar`, 'warn'));
    }, 200);
    return () => clearInterval(id);
  }, [drainIncoming, pushToast]);

  useEffect(() => {
    if (hp <= 0 && phase === 'playing') {
      setPhase('over');
      sfx.fail();
    }
  }, [hp, phase]);

  /* ---- siege duel trigger ----
     When an enemy keep has nearly fallen, we offer the defender a last stand:
     a Pong match. Winning saves the keep; losing hands us 10 troops and the
     keep's grip on its outposts. Fires once per keep. */
  useEffect(() => {
    if (phase !== 'playing' || duel) return;
    const target = players.find(
      (p) => p.id !== playerId && p.hp > 0 && p.hp <= SIEGE_HP && !siegeRef.current.has(p.id)
    );
    if (!target) return;

    siegeRef.current.add(target.id);

    /* Our own outposts are what we'd wager, so pick one we actually hold. */
    const mine = Object.entries(outpostOwners).find(([, o]) => o === playerId);
    const node = mine ? outpostNode(Number(mine[0])) : homeNode(playerId);

    const t = setTimeout(() => inviteDuel(target.id, target.name, node), 900);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [players, phase, duel, playerId, outpostOwners, inviteDuel]);

  /* ---- mission travel time: roughly proportional to distance ---- */
  const travelFor = (from: string, to: string) => {
    const hops = from === to ? 1 : 2;
    return HOP_MS * hops;
  };

  const dispatch = (from: string, to: string, power: number) => {
    sendSoldier({
      id: Math.random().toString(36).slice(2),
      power,
      fromNode: from,
      toNode: to,
      spawnedAt: Date.now(),
      duration: travelFor(from, to),
    });
  };

  /* ---- drag a marching unit onto a new node ---- */
  const retarget = (soldierId: string, toNode: string) => {
    const s = soldiers.find((x) => x.id === soldierId);
    if (!s || toNode === s.toNode) return;
    const now = Date.now();
    const remaining = Math.max(700, s.duration - (now - s.spawnedAt));
    useGame.setState({ soldiers: soldiers.filter((x) => x.id !== soldierId) });
    sendSoldier({ ...s, toNode, spawnedAt: now, duration: Math.max(remaining, travelFor(s.fromNode, toNode)) });
    sfx.click();
    pushToast('birlik yönlendirildi', 'good');
  };

  /* ---- gradual departure ----
     A stack leaves one unit at a time instead of vanishing all at once, so the
     garrison visibly drains and the column strung out along the road reads as
     a real march. */
  const departureRef = useRef<{ from: string; to: string; power: number } | null>(null);
  const [departing, setDeparting] = useState(0);

  useEffect(() => {
    if (departing <= 0 || !departureRef.current) return;
    const d = departureRef.current;

    const t = setTimeout(() => {
      dispatch(d.from, d.to, d.power);

      const key = `tower:garrison:${d.from}`;
      const g = useGame.getState().shared[key] as Garrison | undefined;
      if (g) writeGarrison(d.from, g.ownerId, g.power, Math.max(0, g.count - 1));

      setDeparting((n) => {
        if (n - 1 <= 0) departureRef.current = null;
        return n - 1;
      });
    }, 190);

    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [departing]);

  /* ---- drag a garrison stack: capture, reinforce, or attack ---- */
  const transfer = (fromNode: string, toNode: string, count: number) => {
    /* Read fresh — the render closure's `garrisons` may be a tick behind. */
    const g = useGame.getState().shared[`tower:garrison:${fromNode}`] as Garrison | undefined;
    if (!g || g.count <= 0 || count <= 0) return;

    departureRef.current = { from: fromNode, to: toNode, power: g.power };
    setDeparting(Math.min(g.count, 12));

    if (toNode.startsWith('o:')) {
      const idx = Number(toNode.slice(2));
      const prev = useGame.getState().shared[`tower:outpost:${idx}`];
      postShared(`tower:outpost:${idx}`, playerId);
      pushToast(
        prev && prev !== playerId ? `${idx + 1}. karakol ele geçirildi` : `${idx + 1}. karakola sevkiyat`,
        'good'
      );
    } else {
      pushToast('saldırı gönderildi', 'good');
    }
    sfx.confirm();
  };

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setTyped(v);
    sfx.key();

    const normalized = v.trim().toLowerCase();
    if (!normalized) return;

    const hit = fallingRef.current.find((w) => w.word.toLowerCase() === normalized);
    if (hit) {
      takenRef.current.delete(hit.word);
      const remaining = fallingRef.current.filter((w) => w.id !== hit.id);
      fallingRef.current = remaining;
      setFalling(remaining);

      bank(hit);

      /* Every tenth solved word opens a slow-motion window — a breathing
         space to reposition your garrisons and launch an assault. */
      const nextTotal = solvedRef.current + 1;
      solvedRef.current = nextTotal;
      setSolved(nextTotal);
      if (nextTotal % SLOWMO_EVERY === 0) {
        startSlowmo(SLOWMO_SECONDS);
      }

      sfx.confirm();
      setTyped('');
    }
  };

  const reset = () => {
    setHp(HOME_HP);
    setScore(0);
    setTyped('');
    setFalling([]);
    takenRef.current = new Set();
    fallingRef.current = [];
    useGame.setState({ soldiers: [] });
    setPhase('countdown');
    setCountdown(3);
    sfx.click();
  };

  const renderWord = (w: Falling) => {
    const t = typed.trim().toLowerCase();
    const isPrefix = t.length > 0 && w.word.toLowerCase().startsWith(t);
    return (
      <span className="font-mono text-sm font-black tracking-wider">
        <span style={{ color: 'var(--neon-green)' }}>{isPrefix ? w.word.slice(0, t.length) : ''}</span>
        <span style={{ color: w.color }}>{isPrefix ? w.word.slice(t.length) : w.word}</span>
      </span>
    );
  };

  /* Derived readouts. Hoisted above the `over` branch because the end screen
     reports them too. */
  const myOutposts = Object.entries(outpostOwners).filter(([, o]) => o === playerId).length;
  const homeGarrisonCount = myCount;
  const slow = nowMs < slowUntil;
  const toNextSlow = SLOWMO_EVERY - (solved % SLOWMO_EVERY);

  /* ---------------- countdown ---------------- */
  if (phase === 'countdown') {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <p className="label mb-3">kule savunması</p>
          <p key={countdown} className="anim-rise text-8xl font-black text-[var(--neon-amber)] text-glow">
            {countdown > 0 ? countdown : 'YAZ'}
          </p>
          <div className="mx-auto mt-5 max-w-md space-y-2 text-left">
            {[
              'Kelimeyi yaz → birlik ana kulende birikir.',
              'Garnizonu sürükle → boş karakola bırak, ele geçir.',
              'Karakoldan sürükle → düşman kulesine saldırı gönder.',
              'Yürüyen birliği basılı tut → rotasını değiştir.',
            ].map((t, i) => (
              <p key={t} className="flex gap-2.5 text-[11px] leading-relaxed text-[var(--text-mid)]">
                <span className="stat flex h-5 w-5 shrink-0 items-center justify-center rounded border border-[var(--neon-amber)]/40 text-[9px] font-black text-[var(--neon-amber)]">
                  {i + 1}
                </span>
                {t}
              </p>
            ))}
          </div>
          <p className="mt-4 text-[10px] uppercase tracking-[0.2em] text-[var(--text-lo)]">
            {players.length > 1 ? `${players.length} operatör sahada` : 'rakip bekleniyor — yeni sekme aç'}
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

  /* ---------------- defeat ---------------- */
  if (phase === 'over') {
    return (
      <TerminalScreen
        title="kule düştü"
        subtitle="Ağ savunması çöktü. Sana ait tüm karakollar tarafsız bölgeye döndü."
        outcome="loss"
        stats={[
          { label: 'skor', value: score },
          { label: 'karakol', value: myOutposts, color: 'var(--neon-green)' },
          { label: 'birlik', value: homeGarrisonCount, color: 'var(--neon-amber)' },
        ]}
        ranking={players.map((p) => ({
          id: p.id,
          name: p.name,
          score: p.score,
          color: p.color,
          you: p.id === playerId,
        }))}
        onRetry={reset}
        retryLabel="yeniden"
        onExit={() => setMode('hub')}
      />
    );
  }

  /* ---------------- playing ---------------- */
  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-4">
      {/* Bullet-time wash over the whole screen */}
      {slow && (
        <div
          className="pointer-events-none fixed inset-0 z-[50]"
          style={{
            background:
              'radial-gradient(ellipse at center, transparent 30%, rgba(34,211,238,0.14) 100%)',
            backdropFilter: 'saturate(160%)',
          }}
        />
      )}

      <div className="space-y-5 lg:col-span-3">
        <Panel
          title="ORTAK SAVAŞ HARİTASI"
          subtitle="Garnizonu sürükle · karakol kur · saldırı gönder"
          accent="var(--neon-cyan)"
          right={
            <div className="flex gap-1.5">
              {slow && <Chip color="var(--neon-cyan)">AĞIR ÇEKİM</Chip>}
              <Chip color="var(--neon-cyan)">{soldiers.length} YOLDA</Chip>
              <Chip color="var(--neon-green)">{myOutposts} KARAKOL</Chip>
            </div>
          }
          bodyClass="p-3"
        >
          <Battlefield
            players={players}
            soldiers={soldiers}
            garrisons={garrisons}
            outpostOwners={outpostOwners}
            bursts={bursts}
            meId={playerId}
            onRetarget={retarget}
            onTransfer={transfer}
            clock={clock}
          />

          {/* Legend */}
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 px-1 text-[9px] uppercase tracking-[0.14em] text-[var(--text-lo)]">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[var(--neon-amber)]" /> ana kule
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rotate-45 bg-[#64748b]" /> boş karakol
            </span>
            <span className="flex items-center gap-1.5">
              <IconBolt size={10} /> yürüyen birlik
            </span>
            <span className="flex items-center gap-1.5">
              <IconTarget size={10} /> sürükle-bırak hedef
            </span>
          </div>
        </Panel>

        {/* Word rain */}
        <Panel
          title="KELİME AKIŞI"
          subtitle="Doğru yaz — garnizona birlik ekle"
          accent="var(--neon-amber)"
          right={<Chip color="var(--neon-amber)">{falling.length} HEDEF</Chip>}
          bodyClass="p-0"
        >
          <div className="grid-bg relative h-[280px] overflow-hidden">
            {falling.map((w) => (
              <div
                key={w.id}
                className="absolute whitespace-nowrap rounded-md border px-3 py-1.5 backdrop-blur-sm transition-transform"
                style={{
                  top: `${w.y}%`,
                  left: `${w.x}%`,
                  transform: `translate(-50%, -50%) rotate(${w.rot}deg)`,
                  borderColor: alpha(w.color, 0.33),
                  background: alpha(w.color, 0.07),
                  boxShadow: `0 0 14px ${alpha(w.color, 0.13)}`,
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
            <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-px bg-[var(--neon-rose)]/50" />
          </div>

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
              her {SLOWMO_EVERY} kelimede ağır çekim · sıradaki: {toNextSlow}
            </p>
          </div>
        </Panel>
      </div>

      {/* Side */}
      <div className="space-y-5">
        <Panel title="ULTİ" subtitle={`Her ${ULT_COOLDOWN} saniyede bir`} accent="var(--neon-rose)" bodyClass="p-4">
          <button
            onClick={fireUlt}
            disabled={!ultReady}
            className="w-full overflow-hidden rounded-xl border-2 p-4 transition-all disabled:cursor-not-allowed"
            style={{
              borderColor: ultReady ? '#f43f5e' : 'rgba(244,63,94,0.28)',
              background: ultReady ? 'rgba(244,63,94,0.16)' : 'rgba(255,255,255,0.02)',
              boxShadow: ultReady ? '0 0 30px rgba(244,63,94,0.45)' : 'none',
            }}
          >
            <div className="flex items-center justify-center gap-2">
              <IconBolt size={20} className={ultReady ? 'text-[#f43f5e]' : 'text-[var(--text-lo)]'} />
              <span
                className={`text-sm font-black uppercase tracking-[0.2em] ${ultReady ? 'anim-pulse text-[#f43f5e]' : 'text-[var(--text-lo)]'}`}
              >
                {ultReady ? 'HAZIR — ATEŞLE' : 'ŞARJ OLUYOR'}
              </span>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full transition-[width] duration-200"
                style={{
                  width: `${ultCharge * 100}%`,
                  background: ultReady ? '#f43f5e' : 'var(--neon-rose)',
                  boxShadow: ultReady ? '0 0 12px #f43f5e' : 'none',
                }}
              />
            </div>
            {!ultReady && (
              <p className="stat mt-2 text-center text-[10px] text-[var(--text-lo)]">
                {Math.ceil((ultReadyAt - nowMs) / 1000)} sn
              </p>
            )}
            {ultReady && (
              <p className="mt-2 text-center text-[9px] uppercase tracking-[0.16em] text-[var(--text-mid)]">
                tüm düşman kulelerine {ULT_DAMAGE} hasar
              </p>
            )}
          </button>
        </Panel>

        <Panel title="ANA KULE" accent="var(--neon-amber)" bodyClass="p-4">
          <Meter
            value={hp}
            max={HOME_HP}
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
              <p className="label">garnizon</p>
              <p className="stat text-2xl font-black text-[var(--neon-amber)]">{homeGarrisonCount}</p>
            </div>
          </div>

          {homeGarrisonCount === 0 ? (
            <p className="mt-3 text-center text-[10px] uppercase tracking-[0.16em] text-[var(--text-lo)]">
              kelime yaz, birlik biriksin
            </p>
          ) : (
            <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-[10px] uppercase tracking-[0.16em] text-[var(--neon-green)]">
              <IconBlades size={12} /> {homeGarrisonCount} birlik hazır — sürükleyip gönder
            </p>
          )}
        </Panel>

        <Panel title="KARAKOLLAR" subtitle="Ele geçirdiklerin" accent="var(--neon-green)" bodyClass="p-4">
          {myOutposts === 0 ? (
            <p className="py-2 text-[10px] leading-relaxed text-[var(--text-lo)]">
              Henüz karakolun yok. Garnizonu boş karakola sürükle.
            </p>
          ) : (
            <div className="space-y-2">
              {Object.entries(outpostOwners)
                .filter(([, o]) => o === playerId)
                .map(([i]) => (
                  <div key={i} className="flex items-center justify-between rounded border border-[var(--neon-green)]/30 px-3 py-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--neon-green)]">
                      {Number(i) + 1}. KARAKOL
                    </span>
                    <span className="stat text-[11px] font-black text-white">
                      {garrisons.find((g) => g.node === outpostNode(Number(i)))?.count ?? 0} birlik
                    </span>
                  </div>
                ))}
            </div>
          )}
        </Panel>

        <Panel title="SAVAŞ ALANI" accent="var(--neon-cyan)" bodyClass="p-4">
          <div className="space-y-2.5">
            {players.map((p) => (
              <div key={p.id} className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: p.color, boxShadow: `0 0 8px ${p.color}` }} />
                <span className="flex-1 truncate text-[10px] font-bold uppercase tracking-wider" style={{ color: p.color }}>
                  {p.name}
                  {p.id === playerId && <span className="ml-1 text-[8px] text-[var(--text-lo)]">SEN</span>}
                </span>
                <span className="stat text-[10px] font-black text-white">{Math.max(0, Math.round(p.hp))}</span>
              </div>
            ))}
            {players.length === 1 && (
              <p className="pt-1 text-[10px] leading-relaxed text-[var(--text-lo)]">
                Tek başınasın. Rakip için adresi başka bir sekmede aç.
              </p>
            )}
          </div>
        </Panel>

        <Panel title="TAKIM İLETİŞİMİ" accent="var(--neon-cyan)" bodyClass="p-4">
          <CommsPanel compact />
        </Panel>
      </div>
    </div>
  );
};
