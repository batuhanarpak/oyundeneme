'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useGame, bossState, bossHitQueue, bossHostRef } from '@/store/useGameStore';
import { net } from '@/lib/net';
import { sfx } from '@/lib/sfx';
import { SKILL_ICONS } from '@/components/ui/SkillIcons';
import { BriefingRoom, useSquadron, announcePilot, leaveSquadron } from '@/components/ui/BriefingRoom';
import {
  BOSS_MAX_HP,
  BOSS_PHASES,
  BOSS_SHOT_DAMAGE,
  PROJECTILES,
  SHIPS,
  SKILLS,
  type ProjectileKind,
  type SkillId,
} from '@/config/space';

/**
 * Void Lance — the co-op space arena.
 *
 * Canvas game rather than DOM: hundreds of bullets and insects per second
 * would crush a React tree. The simulation runs in one rAF loop and writes to
 * refs; React only re-renders the HUD a few times a second.
 *
 * Multiplayer over BroadcastChannel: each client simulates its own ship and
 * the shared boss, which stays consistent because the spawn and damage events
 * are broadcast and the boss HP is owned by whoever lands the hit.
 */

const W = 1280;
const H = 720;

interface Ship {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  hull: number;
  maxHull: number;
  energy: number;
  alive: boolean;
  color: string;
}

interface Bullet {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  dmg: number;
  life: number;
  bounces: number;
  from: 'player' | 'boss';
  color: string;
  /** Special round type, or null for a plain shot. */
  kind: ProjectileKind | null;
  /** Cluster fragment — won't split again. */
  fragment?: boolean;
}

interface Enemy {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  kind: 'bug' | 'wasp';
  stun: number;
  sleep: number;
  color: string;
}

interface Star {
  x: number;
  y: number;
  z: number;
  size: number;
}

export const SpaceMode: React.FC = () => {
  const setMode = useGame((s) => s.setMode);
  const playerId = useGame((s) => s.playerId);
  const name = useGame((s) => s.name);
  const pushToast = useGame((s) => s.pushToast);
  const peers = useGame((s) => s.peers);
  const shared = useGame((s) => s.shared);
  const postShared = useGame((s) => s.postShared);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [picked, setPicked] = useState(false);
  const shipId = useGame((s) => s.spaceShip);
  const ship = useMemo(() => SHIPS.find((s) => s.id === shipId) ?? SHIPS[0], [shipId]);
  const squadron = useSquadron();

  /* ---- mutable simulation state (kept out of React) ---- */
  const sim = useRef({
    ship: { x: W / 2, y: H / 2, vx: 0, vy: 0, angle: 0, hull: 100, maxHull: 100, energy: 0, alive: true, color: '#22d3ee' } as Ship,
    bullets: [] as Bullet[],
    enemies: [] as Enemy[],
    stars: [] as Star[],
    keys: {} as Record<string, boolean>,
    firing: false,
    lastShot: 0,
    lastSpawn: 0,
    lastBossAttack: 0,
    bossHp: BOSS_MAX_HP,
    bossPhase: 0,
    bossX: W / 2,
    bossY: 120,
    bossDir: 1,
    slowUntil: 0,
    stunUntil: 0,
    sleepUntil: 0,
    /** Which special round is loaded, or null for standard shots. */
    roundUntil: 0,
    round: null as ProjectileKind | null,
    /* Ship buffs */
    overdriveUntil: 0,
    shieldUntil: 0,
    fortifyUntil: 0,
    cloakUntil: 0,
    ricochetUntil: 0,
    nextId: 1,
    score: 0,
    wave: 1,
    /* Impact particles. Kept in the sim ref: a plain local array would be
       rebuilt on every render and the rAF loop would read a stale copy. */
    bursts: [] as { x: number; y: number; r: number; color: string; at: number; life: number }[],
  });

  const [hud, setHud] = useState({
    hull: 100,
    energy: 0,
    score: 0,
    bossHp: BOSS_MAX_HP,
    phase: 0,
    enemies: 0,
    alive: true,
  });
  /* Which skills are currently burning, so the HUD can light them up. */
  const [activeUntil, setActiveUntil] = useState<Partial<Record<SkillId, number>>>({});

  /* ============================================================
     Setup
     ============================================================ */
  useEffect(() => {
    if (!picked) return;
    const s = sim.current;
    s.ship = {
      x: W / 2,
      y: H * 0.68,
      vx: 0,
      vy: 0,
      angle: -90,
      hull: ship.hull,
      maxHull: ship.hull,
      energy: 40,
      alive: true,
      color: ship.color,
    };
    s.stars = Array.from({ length: 320 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      z: Math.random(),
      size: Math.random() * 1.9 + 0.4,
    }));
    s.bullets = [];
    s.enemies = [];
    s.bossHp = BOSS_MAX_HP;
    s.bossPhase = 0;
    s.score = 0;
  }, [picked, ship]);

  /* ---- input ---- */
  useEffect(() => {
    if (!picked) return;
    const s = sim.current;

    const down = (e: KeyboardEvent) => {
      s.keys[e.key.toLowerCase()] = true;
      if (['w', 'a', 's', 'd', ' '].includes(e.key.toLowerCase())) e.preventDefault();
      if (e.key.toLowerCase() === 'q') castSkill(ship.skills[0]);
      if (e.key.toLowerCase() === 'e') castSkill(ship.skills[1]);
      if (e.key.toLowerCase() === 'r') castSkill(ship.skills[2]);
      if (e.key.toLowerCase() === 'f') castSkill(ship.skills[3]);
      if (e.key.toLowerCase() === 'c') castSkill(ship.skills[4]);
    };
    const up = (e: KeyboardEvent) => {
      s.keys[e.key.toLowerCase()] = false;
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [picked, ship]);

  /* ---- skills ---- */
  const castSkill = (id: SkillId) => {
    const s = sim.current;
    const def = SKILLS[id];
    if (!def || s.ship.energy < def.cost || !s.ship.alive) {
      sfx.deny();
      return;
    }
    s.ship.energy -= def.cost;
    const until = Date.now() + def.duration * 1000;
    setActiveUntil((a) => ({ ...a, [id]: until }));

    /* Special rounds replace the cannon for their duration. */
    if (def.projectile) {
      s.round = def.projectile;
      s.roundUntil = until;
      sfx.attack();
      pushToast(`${def.name} yüklendi`, 'good');
      return;
    }

    switch (id) {
      case 'stun':
        s.stunUntil = until;
        sfx.alarm();
        break;
      case 'sleep':
        s.sleepUntil = until;
        sfx.power();
        break;
      case 'slow':
        s.slowUntil = until;
        sfx.click();
        break;
      case 'overdrive':
        s.overdriveUntil = until;
        sfx.confirm();
        break;
      case 'shield':
        s.shieldUntil = until;
        sfx.success();
        break;
      case 'fortify':
        s.fortifyUntil = until;
        sfx.click();
        break;
      case 'cloak':
        s.cloakUntil = until;
        sfx.power();
        break;
      case 'heal':
        s.ship.hull = Math.min(s.ship.maxHull, s.ship.hull + 45);
        sfx.success();
        break;
      case 'blink':
        /* Jump to the crosshair, keeping momentum dead so it reads as a port. */
        s.ship.x = Math.max(30, Math.min(W - 30, mouse.current.x));
        s.ship.y = Math.max(30, Math.min(H - 30, mouse.current.y));
        s.ship.vx = 0;
        s.ship.vy = 0;
        spawnBurst(s.ship.x, s.ship.y, '#facc15', 34);
        sfx.power();
        break;
    }
    pushToast(`${def.name} aktif`, 'good');
  };

  /* ============================================================
     Main loop
     ============================================================ */
  useEffect(() => {
    if (!picked) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    let last = performance.now();
    let hudTick = 0;
    let lastShipSync = 0;
    let lastBossSync = 0;

    const loop = (now: number) => {
      /* `me` is captured from the render closure; the id never changes. */
      const me = playerId;
      const dt = Math.min(48, now - last) / 16.67;
      last = now;
      const s = sim.current;
      const t = Date.now();

      /* ---------------- ship ---------------- */
      const acc = ship.speed * 0.22;
      if (s.keys['w']) s.ship.vy -= acc * dt;
      if (s.keys['s']) s.ship.vy += acc * dt;
      if (s.keys['a']) s.ship.vx -= acc * dt;
      if (s.keys['d']) s.ship.vx += acc * dt;

      s.ship.vx *= 1 - 0.11 * dt;
      s.ship.vy *= 1 - 0.11 * dt;
      s.ship.vx = Math.max(-ship.speed, Math.min(ship.speed, s.ship.vx));
      s.ship.vy = Math.max(-ship.speed, Math.min(ship.speed, s.ship.vy));
      s.ship.x = Math.max(30, Math.min(W - 30, s.ship.x + s.ship.vx * dt));
      s.ship.y = Math.max(30, Math.min(H - 30, s.ship.y + s.ship.vy * dt));

      /* Nose always tracks the crosshair. This used to be derived from
         velocity, which meant the ship aimed wherever it drifted — the cursor
         was ignored while moving and only took over once you stopped. */
      s.ship.angle =
        (Math.atan2(mouse.current.y - s.ship.y, mouse.current.x - s.ship.x) * 180) / Math.PI;

      /* ---------------- firing ---------------- */
      const overdriven = t < s.overdriveUntil;
      const rate = overdriven ? ship.fireRate * 0.5 : ship.fireRate;
      if (s.firing && now - s.lastShot > rate && s.ship.alive) {
        s.lastShot = now;
        const rad = (s.ship.angle * Math.PI) / 180;
        const loaded = t < s.roundUntil ? s.round : null;
        const pd = loaded ? PROJECTILES[loaded] : null;

        const spd = ship.bulletSpeed * (pd?.speedMul ?? 1);
        s.bullets.push({
          id: s.nextId++,
          x: s.ship.x + Math.cos(rad) * 22,
          y: s.ship.y + Math.sin(rad) * 22,
          vx: Math.cos(rad) * spd,
          vy: Math.sin(rad) * spd,
          dmg: ship.damage * (pd?.damageMul ?? 1),
          life: 90,
          bounces: 0,
          from: 'player',
          color: loaded ? SKILLS[loaded === 'fireball' ? 'fireball' : loaded === 'iceball' ? 'iceball' : loaded === 'energyball' ? 'energyball' : 'cluster'].color : ship.color,
          kind: loaded,
        });
        sfx.key();
      }

      /* ---------------- bullets ---------------- */
      const nextBullets: Bullet[] = [];
      for (const b of s.bullets) {
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        b.life -= dt;

        /* Walls: ricochet bullets bounce, others die. */
        let hitWall = false;
        if (b.x < 0 || b.x > W) {
          hitWall = true;
          if (b.bounces > 0) {
            b.vx *= -1;
            b.x = Math.max(0, Math.min(W, b.x));
            b.bounces--;
          }
        }
        if (b.y < 0 || b.y > H) {
          hitWall = true;
          if (b.bounces > 0) {
            b.vy *= -1;
            b.y = Math.max(0, Math.min(H, b.y));
            b.bounces--;
          }
        }
        if (hitWall && b.bounces <= 0) continue;
        if (b.life <= 0) continue;

        if (b.from === 'player') {
          const pd = b.kind ? PROJECTILES[b.kind] : null;
          const hitR = 20 + (pd?.radius ?? 0);

          /* vs enemies */
          for (const e of s.enemies) {
            if (e.hp <= 0) continue;
            if (Math.hypot(e.x - b.x, e.y - b.y) < hitR) {
              e.hp -= b.dmg;
              /* Ice rounds lock the target in place for a moment. */
              if (pd?.freezes) e.stun = Math.max(e.stun, 2.2);
              spawnBurst(b.x, b.y, b.color, pd ? pd.radius * 2.4 : 22);

              /* Cluster shells break into three on first impact. */
              if (pd?.splits && !b.fragment) {
                const base = Math.atan2(b.vy, b.vx);
                for (const off of [-0.5, 0, 0.5]) {
                  const a = base + off;
                  s.bullets.push({
                    id: s.nextId++,
                    x: b.x,
                    y: b.y,
                    vx: Math.cos(a) * 7,
                    vy: Math.sin(a) * 7,
                    dmg: b.dmg * 0.4,
                    life: 60,
                    bounces: 0,
                    from: 'player',
                    color: b.color,
                    kind: null,
                    fragment: true,
                  });
                }
              }
              /* Energy orbs pass through; everything else stops here. */
              if (!pd?.pierce) b.life = -1;
              break;
            }
          }
          /* vs boss — only the owner applies the damage; everyone else
             reports it so a single health pool is shared. */
          if (b.life > 0 && s.bossHp > 0 && Math.hypot(s.bossX - b.x, s.bossY - b.y) < 72 + (pd?.radius ?? 0)) {
            if (bossHostRef.value === me) {
              s.bossHp = Math.max(0, s.bossHp - b.dmg);
            } else {
              net.send({ t: 'space:bossHit', from: me, dmg: b.dmg });
            }
            spawnBurst(b.x, b.y, '#f43f5e', pd ? pd.radius * 2.4 : 22);
            if (!pd?.pierce) b.life = -1;
          }
        } else {
          /* boss projectile vs our ship — shields absorb it entirely */
          if (s.ship.alive && Math.hypot(s.ship.x - b.x, s.ship.y - b.y) < 20) {
            const shielded = t < s.shieldUntil;
            const armored = t < s.fortifyUntil;
            if (!shielded) {
              s.ship.hull -= BOSS_SHOT_DAMAGE * (armored ? 0.5 : 1);
              sfx.hit();
            }
            spawnBurst(b.x, b.y, shielded ? '#22d3ee' : '#f43f5e');
            b.life = -1;
          }
        }

        if (b.life > 0) nextBullets.push(b);
      }
      s.bullets = nextBullets;

      /* ---------------- enemy spawning ---------------- */
      const phase = BOSS_PHASES[s.bossPhase];
      const frozen = t < s.stunUntil || t < s.sleepUntil;
      if (s.bossHp > 0 && now - s.lastSpawn > phase.spawnEvery) {
        s.lastSpawn = now;
        const cap = 5 + s.bossPhase * 4;
        const kind: Enemy['kind'] = Math.random() < 0.3 ? 'wasp' : 'bug';
        s.enemies.push({
          id: s.nextId++,
          x: 80 + Math.random() * (W - 160),
          y: -30,
          vx: (Math.random() - 0.5) * 1.6,
          vy: kind === 'wasp' ? 2.6 : 1.5,
          hp: kind === 'wasp' ? 26 : 14,
          kind,
          stun: 0,
          sleep: 0,
          color: kind === 'wasp' ? '#fbbf24' : '#f43f5e',
        });
        if (s.enemies.length > cap) s.enemies.splice(0, s.enemies.length - cap);
      }

      /* ---------------- enemies ---------------- */
      const speedScale = t < s.slowUntil ? 0.45 : 1;
      for (const e of s.enemies) {
        if (frozen) continue;
        e.x += e.vx * dt * speedScale;
        e.y += e.vy * dt * speedScale;
        if (e.x < 24 || e.x > W - 24) e.vx *= -1;

        /* Reaching our ship damages it. */
        if (s.ship.alive && Math.hypot(e.x - s.ship.x, e.y - s.ship.y) < 26) {
          s.ship.hull -= 6;
          e.hp = 0;
          spawnBurst(e.x, e.y, e.color);
          sfx.hit();
        }
      }
      s.enemies = s.enemies.filter((e) => e.hp > 0 && e.y < H + 40);

      /* ---------------- boss ----------------
         Only the elected host simulates the boss and broadcasts it; everyone
         else mirrors the last report. That's what makes it ONE boss: damage
         from every pilot lands on the same health pool.
         The host is elected in the briefing room and is the same on every
         client, so this must be a strict comparison — never a fallback. */
      const amBossHost = bossHostRef.value !== '' && bossHostRef.value === me;

      if (!amBossHost && bossState.hp > 0) {
        /* Mirror the host's state. */
        s.bossHp = bossState.hp;
        s.bossX = bossState.x;
        s.bossY = bossState.y;
        s.bossDir = bossState.dir;
      }

      if (s.bossHp > 0) {
        s.bossPhase = s.bossHp / BOSS_MAX_HP > 0.66 ? 0 : s.bossHp / BOSS_MAX_HP > 0.33 ? 1 : 2;

        if (amBossHost) {
          /* Wounded bosses move faster — the fight escalates. */
          const bs = (0.9 + s.bossPhase * 0.7) * speedScale;
          if (!frozen) {
            s.bossX += s.bossDir * bs * dt;
            if (s.bossX < 140 || s.bossX > W - 140) s.bossDir *= -1;
          }

          /* Damage reported by other pilots. */
          while (bossHitQueue.length) {
            s.bossHp = Math.max(0, s.bossHp - (bossHitQueue.shift() as number));
          }

          bossState.hp = s.bossHp;
          bossState.x = s.bossX;
          bossState.y = s.bossY;
          bossState.dir = s.bossDir;

          /* ~12 reports/sec is enough for smooth motion. */
          if (now - lastBossSync > 80) {
            lastBossSync = now;
            net.send({ t: 'space:boss', from: me, hp: s.bossHp, x: s.bossX, y: s.bossY, dir: s.bossDir });
          }
        }

        /* Anyone may fire at it; a cloaked pilot can't be targeted back. */
        const ap = BOSS_PHASES[s.bossPhase].attackEvery;
        const targetable = t >= s.cloakUntil;
        if (amBossHost && !frozen && targetable && now - s.lastBossAttack > ap) {
          s.lastBossAttack = now;
          /* Aim at the nearest pilot — that may be a wingman, not us. */
          let tx = s.ship.x;
          let ty = s.ship.y;
          let bestD = Infinity;
          Object.values(useGame.getState().wingmen).forEach((w) => {
            if (Date.now() - w.at > 3000) return;
            const d = Math.hypot(w.x - s.bossX, w.y - s.bossY);
            if (d < bestD) {
              bestD = d;
              tx = w.x;
              ty = w.y;
            }
          });

          const aim = Math.atan2(ty - s.bossY, tx - s.bossX);
          const spread = s.bossPhase >= 1 ? 3 : 1;
          for (let i = 0; i < spread; i++) {
            const a = aim + (i - (spread - 1) / 2) * 0.26;
            s.bullets.push({
              id: s.nextId++,
              x: s.bossX,
              y: s.bossY + 40,
              vx: Math.cos(a) * 4.4,
              vy: Math.sin(a) * 4.4,
              dmg: BOSS_SHOT_DAMAGE,
              life: 200,
              bounces: 0,
              kind: null,
              from: 'boss',
              color: '#f43f5e',
            });
          }
          sfx.alarm();
        }
      } else if (amBossHost) {
        /* Boss down: brief pause, then the next one warps in. */
        s.bossHp = BOSS_MAX_HP;
        s.score += 1000;
        s.wave++;
        s.enemies = [];
        bossState.hp = s.bossHp;
        sfx.success();
        pushToast(`BOSS DEVRİLDİ — Dalga ${s.wave}`, 'good');
      }

      /* ---------------- energy from hits ---------------- */
      /* Earned passively so skills stay reachable during long fights. */
      if (s.ship.alive) s.ship.energy = Math.min(100, s.ship.energy + 0.06 * dt);

      /* ---------------- death / respawn ---------------- */
      if (s.ship.hull <= 0 && s.ship.alive) {
        s.ship.alive = false;
        sfx.fail();
        spawnBurst(s.ship.x, s.ship.y, '#f43f5e', 40);
      }
      if (!s.ship.alive) {
        s.ship.hull += 0.35 * dt; // slow repair
        if (s.ship.hull >= s.ship.maxHull * 0.5) {
          s.ship.alive = true;
          s.ship.hull = s.ship.maxHull * 0.5;
          pushToast('Gövde onarıldı — savaşa dön', 'good');
        }
      }

      /* ============================================================
         Render
         ============================================================ */
      ctx.fillStyle = '#02040a';
      ctx.fillRect(0, 0, W, H);

      /* Starfield: parallax streaks that lengthen with speed. */
      for (const st of s.stars) {
        st.y += (0.4 + st.z * 2.4) * dt;
        if (st.y > H) {
          st.y = -4;
          st.x = Math.random() * W;
        }
        const dx = s.ship.vx * st.z * 1.5;
        ctx.strokeStyle = `rgba(${180 + st.z * 70}, ${210 + st.z * 40}, 255, ${0.25 + st.z * 0.6})`;
        ctx.lineWidth = st.size;
        ctx.beginPath();
        ctx.moveTo(st.x, st.y);
        ctx.lineTo(st.x - dx * 3, st.y - (2 + st.z * 9));
        ctx.stroke();
      }

      /* Nebula wash */
      const neb = ctx.createRadialGradient(W * 0.3, H * 0.2, 0, W * 0.3, H * 0.2, W * 0.7);
      neb.addColorStop(0, 'rgba(56,189,248,0.09)');
      neb.addColorStop(1, 'transparent');
      ctx.fillStyle = neb;
      ctx.fillRect(0, 0, W, H);

      /* Grid horizon for depth */
      ctx.strokeStyle = 'rgba(56,189,248,0.07)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 9; i++) {
        const y = (i / 9) * H;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
      }

      /* Boss */
      if (s.bossHp > 0) {
        const p = BOSS_PHASES[s.bossPhase];
        ctx.save();
        ctx.translate(s.bossX, s.bossY);
        const pulse = 1 + Math.sin(now / 240) * 0.04;
        ctx.scale(pulse, pulse);

        /* Hive body */
        ctx.fillStyle = '#160812';
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
          const r = i % 2 === 0 ? 68 : 46;
          const x = Math.cos(a) * r;
          const y = Math.sin(a) * r * 0.8;
          i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        /* Glowing core — brightens as it weakens */
        const weak = 1 - s.bossHp / BOSS_MAX_HP;
        const core = ctx.createRadialGradient(0, 0, 0, 0, 0, 46);
        core.addColorStop(0, p.color);
        core.addColorStop(1, 'transparent');
        ctx.globalAlpha = 0.5 + weak * 0.5;
        ctx.fillStyle = core;
        ctx.beginPath();
        ctx.arc(0, 0, 46, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        /* Eyes */
        ctx.fillStyle = '#fff';
        for (const ex of [-22, 22]) {
          ctx.beginPath();
          ctx.arc(ex, -10, 5 + weak * 2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      /* Enemies */
      for (const e of s.enemies) {
        const frozenNow = t < s.stunUntil || t < s.sleepUntil || e.stun > 0;
        if (e.stun > 0) e.stun -= dt / 60;
        ctx.save();
        ctx.translate(e.x, e.y);
        ctx.fillStyle = frozenNow ? '#64748b' : e.color;
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;

        if (e.kind === 'wasp') {
          ctx.beginPath();
          ctx.moveTo(0, -14);
          ctx.lineTo(11, 0);
          ctx.lineTo(0, 14);
          ctx.lineTo(-11, 0);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          /* Wings */
          ctx.globalAlpha = 0.5;
          ctx.beginPath();
          ctx.ellipse(-10, -4, 8, 4, -0.4, 0, Math.PI * 2);
          ctx.ellipse(10, -4, 8, 4, 0.4, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        } else {
          ctx.beginPath();
          ctx.ellipse(0, 0, 12, 9, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          /* Legs */
          for (const lx of [-7, 0, 7]) {
            ctx.beginPath();
            ctx.moveTo(lx, 8);
            ctx.lineTo(lx * 1.5, 16);
            ctx.stroke();
          }
        }

        /* Ice-locked enemies get a crystalline shell. */
        if (e.stun > 0) {
          ctx.strokeStyle = '#67e8f9';
          ctx.lineWidth = 1.8;
          ctx.fillStyle = 'rgba(103,232,249,0.18)';
          ctx.beginPath();
          ctx.moveTo(17, 0);
          ctx.lineTo(0, -17);
          ctx.lineTo(-17, 0);
          ctx.lineTo(0, 17);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }
        ctx.restore();

        /* Small HP pip */
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(e.x - 13, e.y - 20, 26, 3);
        ctx.fillStyle = e.color;
        ctx.fillRect(e.x - 13, e.y - 20, 26 * Math.max(0, e.hp / (e.kind === 'wasp' ? 26 : 14)), 3);
      }

      /* Bullets — each round type gets its own silhouette. */
      for (const b of s.bullets) {
        const ang = Math.atan2(b.vy, b.vx);
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(ang);

        if (b.from === 'boss') {
          ctx.shadowBlur = 10;
          ctx.shadowColor = '#f43f5e';
          ctx.fillStyle = '#f43f5e';
          ctx.fillRect(-4.5, -2.4, 9, 4.8);
          ctx.restore();
          continue;
        }

        switch (b.kind) {
          case 'fireball': {
            /* Molten core with a trailing flame. */
            ctx.shadowBlur = 22;
            ctx.shadowColor = '#f97316';
            const g = ctx.createRadialGradient(0, 0, 1, 0, 0, 15);
            g.addColorStop(0, '#fff7ed');
            g.addColorStop(0.4, '#fb923c');
            g.addColorStop(1, 'rgba(249,115,22,0)');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(0, 0, 15, 0, Math.PI * 2);
            ctx.fill();
            /* Flame tail, flickering. */
            ctx.globalAlpha = 0.75;
            ctx.fillStyle = '#f97316';
            const t1 = 14 + Math.sin(now / 60) * 5;
            ctx.beginPath();
            ctx.moveTo(-6, -6);
            ctx.lineTo(-t1, 0);
            ctx.lineTo(-6, 6);
            ctx.closePath();
            ctx.fill();
            ctx.globalAlpha = 1;
            break;
          }
          case 'iceball': {
            /* Faceted crystal, shards spinning around it. */
            ctx.shadowBlur = 16;
            ctx.shadowColor = '#67e8f9';
            ctx.fillStyle = 'rgba(103,232,249,0.35)';
            ctx.beginPath();
            ctx.arc(0, 0, 11, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#e0f7ff';
            ctx.beginPath();
            ctx.moveTo(9, 0);
            ctx.lineTo(0, -7);
            ctx.lineTo(-9, 0);
            ctx.lineTo(0, 7);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = '#67e8f9';
            ctx.lineWidth = 1.4;
            ctx.stroke();
            /* Orbiting shards */
            for (let i = 0; i < 3; i++) {
              const a = now / 180 + (i / 3) * Math.PI * 2;
              ctx.fillStyle = 'rgba(224,247,255,0.8)';
              ctx.beginPath();
              ctx.arc(Math.cos(a) * 13, Math.sin(a) * 13, 2.2, 0, Math.PI * 2);
              ctx.fill();
            }
            break;
          }
          case 'energyball': {
            /* Ringed orb that pierces. */
            ctx.shadowBlur = 20;
            ctx.shadowColor = '#c084fc';
            const g = ctx.createRadialGradient(0, 0, 1, 0, 0, 14);
            g.addColorStop(0, '#ffffff');
            g.addColorStop(0.45, '#c084fc');
            g.addColorStop(1, 'rgba(192,132,252,0)');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(0, 0, 14, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = 'rgba(232,213,255,0.85)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.ellipse(0, 0, 11, 4.5, now / 220, 0, Math.PI * 2);
            ctx.stroke();
            break;
          }
          case 'cluster': {
            /* Armed shell — segments visible. */
            ctx.shadowBlur = 14;
            ctx.shadowColor = '#fb7185';
            ctx.fillStyle = '#0b1220';
            ctx.strokeStyle = '#fb7185';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, 9, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(-9, 0);
            ctx.lineTo(9, 0);
            ctx.moveTo(0, -9);
            ctx.lineTo(0, 9);
            ctx.stroke();
            ctx.fillStyle = b.fragment ? '#fbbf24' : '#fb7185';
            ctx.beginPath();
            ctx.arc(0, 0, 3.4, 0, Math.PI * 2);
            ctx.fill();
            break;
          }
          default: {
            /* Standard shot. */
            ctx.shadowBlur = 8;
            ctx.shadowColor = ship.color;
            ctx.fillStyle = ship.color;
            ctx.fillRect(-4, -2.4, 8, 4.8);
            break;
          }
        }
        ctx.restore();
      }

      /* Our ship. Cloak makes it a ghost — visible to us, not to the boss. */
      if (s.ship.alive) {
        const cloaked = t < s.cloakUntil;
        ctx.save();
        ctx.globalAlpha = cloaked ? 0.28 : 1;
        ctx.translate(s.ship.x, s.ship.y);
        ctx.rotate(((s.ship.angle + 90) * Math.PI) / 180);
        ctx.scale(ship.scale, ship.scale);

        /* Engine flare */
        const flare = 12 + Math.random() * 10;
        const fg = ctx.createLinearGradient(0, 16, 0, 16 + flare);
        fg.addColorStop(0, ship.color);
        fg.addColorStop(1, 'transparent');
        ctx.fillStyle = fg;
        ctx.beginPath();
        ctx.moveTo(-7, 16);
        ctx.lineTo(7, 16);
        ctx.lineTo(0, 16 + flare);
        ctx.closePath();
        ctx.fill();

        /* Hull */
        ctx.fillStyle = '#0b1220';
        ctx.strokeStyle = ship.color;
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.moveTo(0, -24);
        ctx.lineTo(16, 12);
        ctx.lineTo(7, 8);
        ctx.lineTo(0, 18);
        ctx.lineTo(-7, 8);
        ctx.lineTo(-16, 12);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        /* Cockpit */
        ctx.fillStyle = ship.color;
        ctx.globalAlpha = 0.85;
        ctx.beginPath();
        ctx.ellipse(0, -6, 5, 9, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.restore();
      }

      /* Ship bursts */
      for (const b of s.bursts) {
        const age = (now - b.at) / b.life;
        if (age >= 1) continue;
        ctx.save();
        ctx.globalAlpha = 1 - age;
        ctx.strokeStyle = b.color;
        ctx.lineWidth = 2.5 * (1 - age);
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r * (0.3 + age), 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
      s.bursts = s.bursts.filter((b) => now - b.at < b.life);

      /* ---------------- visual feedback ---------------- */
      /* Time warp: a cyan wash and slowed star streaks. */
      if (t < s.slowUntil) {
        ctx.fillStyle = 'rgba(56,189,248,0.10)';
        ctx.fillRect(0, 0, W, H);
      }
      /* Shockwave: expanding rings from the ship. */
      if (t < s.stunUntil) {
        const age = 1 - (s.stunUntil - t) / 3000;
        ctx.strokeStyle = `rgba(251,191,36,${0.6 * (1 - age)})`;
        ctx.lineWidth = 4;
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.arc(s.ship.x, s.ship.y, 40 + age * 420 + i * 90, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      /* Sleep: purple haze with drifting motes. */
      if (t < s.sleepUntil) {
        ctx.fillStyle = 'rgba(167,139,250,0.09)';
        ctx.fillRect(0, 0, W, H);
        for (let i = 0; i < 26; i++) {
          const px = (i * 137 + (now / 30) * (1 + (i % 3))) % W;
          const py = (i * 91 + Math.sin(now / 700 + i) * 40 + H / 2) % H;
          ctx.fillStyle = `rgba(200,180,255,${0.25 + 0.2 * Math.sin(now / 400 + i)})`;
          ctx.beginPath();
          ctx.arc(px, py, 2.4, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      /* Plasma round: warm wash while a special is loaded. */
      if (t < s.roundUntil && s.round) {
        const rk = s.round;
        const tint =
          rk === 'fireball' ? 'rgba(249,115,22,0.13)' : rk === 'iceball' ? 'rgba(103,232,249,0.10)' : rk === 'energyball' ? 'rgba(192,132,252,0.12)' : 'rgba(251,113,133,0.11)';
        const g = ctx.createRadialGradient(s.ship.x, s.ship.y, 40, s.ship.x, s.ship.y, 460);
        g.addColorStop(0, tint);
        g.addColorStop(1, 'transparent');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
      }
      /* Shield: a hex bubble around the ship. */
      if (t < s.shieldUntil) {
        ctx.save();
        ctx.strokeStyle = 'rgba(34,211,238,0.75)';
        ctx.lineWidth = 2.2;
        ctx.shadowBlur = 18;
        ctx.shadowColor = '#22d3ee';
        const R = 40;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2 + now / 900;
          const px = s.ship.x + Math.cos(a) * R;
          const py = s.ship.y + Math.sin(a) * R;
          i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.stroke();
        ctx.globalAlpha = 0.14 + Math.sin(now / 200) * 0.06;
        ctx.fillStyle = '#22d3ee';
        ctx.fill();
        ctx.restore();
      }
      /* Fortify: grey plating arcs. */
      if (t < s.fortifyUntil) {
        ctx.save();
        ctx.strokeStyle = 'rgba(148,163,184,0.8)';
        ctx.lineWidth = 3;
        for (const off of [0, Math.PI * 0.66, Math.PI * 1.33]) {
          ctx.beginPath();
          ctx.arc(s.ship.x, s.ship.y, 34, off + now / 1400, off + now / 1400 + 0.7);
          ctx.stroke();
        }
        ctx.restore();
      }
      /* Cloak: the hull goes translucent with a shimmer outline. */
      /* (applied where the ship is drawn — see shipAlpha below) */
      /* Overdrive: exhaust sparks. */
      if (t < s.overdriveUntil && s.ship.alive) {
        for (let i = 0; i < 5; i++) {
          const a = Math.random() * Math.PI * 2;
          const d = 20 + Math.random() * 26;
          ctx.fillStyle = 'rgba(251,146,60,0.8)';
          ctx.beginPath();
          ctx.arc(s.ship.x + Math.cos(a) * d, s.ship.y + Math.sin(a) * d, 2.4, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      /* Ricochet: green tracers along the arena edge. */
      if (t < s.ricochetUntil) {
        ctx.strokeStyle = 'rgba(74,222,128,0.45)';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([14, 10]);
        ctx.strokeRect(2, 2, W - 4, H - 4);
        ctx.setLineDash([]);
      }

      /* Wingmen — other pilots, drawn from their latest position report. */
      const wingmen = useGame.getState().wingmen;
      Object.entries(wingmen).forEach(([id, w]) => {
        if (Date.now() - w.at > 3000) return;
        const wShip = SHIPS.find((x) => x.id === w.ship) ?? SHIPS[0];
        ctx.save();
        ctx.translate(w.x, w.y);
        ctx.rotate(((w.angle + 90) * Math.PI) / 180);
        ctx.scale(wShip.scale, wShip.scale);

        /* Their engine flare. */
        const wf = 9 + Math.random() * 7;
        const wg = ctx.createLinearGradient(0, 16, 0, 16 + wf);
        wg.addColorStop(0, w.color);
        wg.addColorStop(1, 'transparent');
        ctx.fillStyle = wg;
        ctx.beginPath();
        ctx.moveTo(-7, 16);
        ctx.lineTo(7, 16);
        ctx.lineTo(0, 16 + wf);
        ctx.closePath();
        ctx.fill();

        /* Their hull, drawn a touch dimmer than our own. */
        ctx.globalAlpha = 0.9;
        ctx.fillStyle = '#0b1220';
        ctx.strokeStyle = w.color;
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(0, -24);
        ctx.lineTo(16, 12);
        ctx.lineTo(7, 8);
        ctx.lineTo(0, 18);
        ctx.lineTo(-7, 8);
        ctx.lineTo(-16, 12);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = w.color;
        ctx.globalAlpha = 0.8;
        ctx.beginPath();
        ctx.ellipse(0, -6, 5, 9, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        /* Callsign + hull readout beneath them. */
        ctx.save();
        ctx.font = 'bold 11px monospace';
        ctx.fillStyle = w.color;
        ctx.textAlign = 'center';
        ctx.fillText(w.name || id.slice(0, 5), w.x, w.y + 38);
        ctx.font = '9px monospace';
        ctx.fillStyle = 'rgba(148,163,184,0.9)';
        ctx.fillText(`${Math.round(w.hull)} HP`, w.x, w.y + 50);
        ctx.restore();

        /* Health pip. */
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.fillRect(w.x - 18, w.y + 54, 36, 3);
        ctx.fillStyle = w.hull / w.maxHull > 0.5 ? '#4ade80' : w.hull / w.maxHull > 0.25 ? '#fbbf24' : '#f43f5e';
        ctx.fillRect(w.x - 18, w.y + 54, 36 * Math.max(0, Math.min(1, w.hull / w.maxHull)), 3);
      });

      /* Status banner along the top edge, in reading order. */
      const active: { id: SkillId; until: number }[] = (
        [
          { id: 'stun' as SkillId, until: s.stunUntil },
          { id: 'sleep' as SkillId, until: s.sleepUntil },
          { id: 'slow' as SkillId, until: s.slowUntil },
          { id: 'overdrive' as SkillId, until: s.overdriveUntil },
          { id: 'shield' as SkillId, until: s.shieldUntil },
          { id: 'fortify' as SkillId, until: s.fortifyUntil },
          { id: 'cloak' as SkillId, until: s.cloakUntil },
        ]
      ).filter((a) => t < a.until);

      /* The loaded round shows first — it's the most important state. */
      if (t < s.roundUntil && s.round) {
        active.unshift({ id: s.round as unknown as SkillId, until: s.roundUntil });
      }

      active.slice(0, 5).forEach((a, i) => {
        const def = SKILLS[a.id];
        if (!def) return;
        const x = 340 + i * 168;
        const remain = Math.max(0, (a.until - t) / 1000);

        ctx.fillStyle = 'rgba(4,6,12,0.82)';
        ctx.fillRect(x, 12, 156, 32);
        ctx.strokeStyle = def.color;
        ctx.lineWidth = 1.6;
        ctx.strokeRect(x, 12, 156, 32);

        ctx.fillStyle = def.color;
        ctx.font = 'bold 12px monospace';
        ctx.fillText(def.name, x + 9, 26);

        /* Remaining-time bar, sized from the skill's own duration. */
        const frac = Math.max(0, Math.min(1, (a.until - t) / (def.duration * 1000)));
        ctx.globalAlpha = 0.85;
        ctx.fillRect(x + 9, 31, 138 * frac, 4);
        ctx.globalAlpha = 1;

        ctx.fillStyle = '#94a3b8';
        ctx.font = '10px monospace';
        ctx.fillText(`${remain.toFixed(1)}s`, x + 128, 26);
      });

      /* Crosshair */
      ctx.strokeStyle = ship.color;
      ctx.lineWidth = 1.4;
      ctx.globalAlpha = 0.75;
      ctx.beginPath();
      ctx.arc(mouse.current.x, mouse.current.y, 13, 0, Math.PI * 2);
      ctx.moveTo(mouse.current.x - 20, mouse.current.y);
      ctx.lineTo(mouse.current.x - 6, mouse.current.y);
      ctx.moveTo(mouse.current.x + 6, mouse.current.y);
      ctx.lineTo(mouse.current.x + 20, mouse.current.y);
      ctx.moveTo(mouse.current.x, mouse.current.y - 20);
      ctx.lineTo(mouse.current.x, mouse.current.y - 6);
      ctx.moveTo(mouse.current.x, mouse.current.y + 6);
      ctx.lineTo(mouse.current.x, mouse.current.y + 20);
      ctx.stroke();
      ctx.globalAlpha = 1;

      /* ---------------- broadcast our position ----------------
         ~15/sec: fast enough that wingmen glide rather than teleport, cheap
         enough not to flood the channel. */
      if (now - lastShipSync > 65) {
        lastShipSync = now;
        net.send({
          t: 'space:ship',
          from: me,
          name,
          color: ship.color,
          ship: ship.id,
          x: s.ship.x,
          y: s.ship.y,
          angle: s.ship.angle,
          hull: Math.max(0, s.ship.hull),
          maxHull: s.ship.maxHull,
        });
      }

      /* HUD sync, ~6/sec. */
      hudTick += dt;
      if (hudTick > 10) {
        hudTick = 0;
        setHud({
          hull: Math.max(0, s.ship.hull),
          energy: s.ship.energy,
          score: s.score,
          bossHp: s.bossHp,
          phase: s.bossPhase,
          enemies: s.enemies.length,
          alive: s.ship.alive,
        });
      }

      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [picked, ship]);

  /* ---- burst particles ---- */
  const spawnBurst = (x: number, y: number, color: string, r = 22) => {
    const s = sim.current;
    s.bursts.push({ x, y, r, color, at: performance.now(), life: 420 });
    /* Cap the list so a long fight can't grow it without bound. */
    if (s.bursts.length > 60) s.bursts.splice(0, s.bursts.length - 60);
  };

  /* Broadcast our hull so peers see the right silhouette. */
  useEffect(() => {
    if (!picked) return;
    announcePilot(shipId, useGame.getState().spaceReady);
  }, [picked, shipId]);

  /* Leaving the arena takes us out of the briefing room too. */
  useEffect(() => {
    if (!picked) return;
    return () => leaveSquadron();
  }, [picked]);

  /* ---- mouse ---- */
  const mouse = useRef({ x: W / 2, y: H / 2 });
  /* Only records the cursor; the loop aims the ship each frame. */
  const onMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const c = canvasRef.current;
    if (!c) return;
    const r = c.getBoundingClientRect();
    mouse.current = {
      x: ((e.clientX - r.left) / r.width) * W,
      y: ((e.clientY - r.top) / r.height) * H,
    };
  };

  /* ============================================================
     Screens
     ============================================================ */
  /* Briefing room — hull pick, ready-up, auto-launch countdown. */
  if (!picked) {
    return <BriefingRoom onLaunch={() => setPicked(true)} onBack={() => setMode('hub')} />;
  }


  /* ============================================================
     Arena
     ============================================================ */
  const bossPct = hud.bossHp / BOSS_MAX_HP;

  return (
    <div className="space-y-3">
      {/* Boss bar */}
      <div className="panel p-3">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full anim-pulse" style={{ background: BOSS_PHASES[hud.phase].color }} />
            <span className="text-[11px] font-black uppercase tracking-[0.24em]" style={{ color: BOSS_PHASES[hud.phase].color }}>
              {BOSS_PHASES[hud.phase].name}
            </span>
          </div>
          <span className="stat text-[10px] text-[var(--text-lo)]">
            FAZ {hud.phase + 1}/3 · {Math.ceil(hud.bossHp)} HP
          </span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-white/8">
          <div
            className="h-full rounded-full transition-[width] duration-200"
            style={{
              width: `${bossPct * 100}%`,
              background: `linear-gradient(90deg, ${BOSS_PHASES[hud.phase].color}, #f43f5e)`,
              boxShadow: `0 0 16px ${BOSS_PHASES[hud.phase].color}`,
            }}
          />
        </div>
      </div>

      {/* Arena */}
      <div className="panel relative overflow-hidden p-0">
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          className="block w-full cursor-crosshair"
          style={{ aspectRatio: `${W} / ${H}` }}
          onMouseMove={onMouseMove}
          onMouseDown={() => {
            sim.current.firing = true;
          }}
          onMouseUp={() => {
            sim.current.firing = false;
          }}
          onMouseLeave={() => {
            sim.current.firing = false;
          }}
        />

        {/* Overlay HUD */}
        <div className="pointer-events-none absolute left-4 top-4 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: ship.color }}>
              {name || 'OPERATÖR'}
            </span>
            <span className="text-[9px] text-[var(--text-lo)]">{ship.name}</span>
          </div>
          <div className="w-44">
            <div className="mb-0.5 flex justify-between text-[8px] uppercase tracking-widest text-[var(--text-lo)]">
              <span>gövde</span>
              <span className="stat">{Math.ceil(hud.hull)}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-black/60">
              <div
                className="h-full rounded-full transition-[width]"
                style={{
                  width: `${(hud.hull / ship.hull) * 100}%`,
                  background: hud.hull / ship.hull > 0.5 ? '#4ade80' : hud.hull / ship.hull > 0.25 ? '#fbbf24' : '#f43f5e',
                }}
              />
            </div>
          </div>
          <div className="w-44">
            <div className="mb-0.5 flex justify-between text-[8px] uppercase tracking-widest text-[var(--text-lo)]">
              <span>enerji</span>
              <span className="stat">{Math.floor(hud.energy)}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-black/60">
              <div className="h-full rounded-full" style={{ width: `${hud.energy}%`, background: '#38bdf8', boxShadow: '0 0 10px #38bdf8' }} />
            </div>
          </div>
        </div>

        <div className="pointer-events-none absolute right-4 top-4 text-right">
          <p className="stat text-2xl font-black text-white">{hud.score}</p>
          <p className="text-[9px] uppercase tracking-widest text-[var(--text-lo)]">
            {hud.enemies} düşman
          </p>
        </div>

        {!hud.alive && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/60">
            <div className="text-center">
              <p className="text-3xl font-black uppercase tracking-widest text-[var(--neon-rose)]">
                GÖVDE ÇÖKTÜ
              </p>
              <p className="mt-2 text-xs text-[var(--text-mid)]">onarım başlatıldı...</p>
            </div>
          </div>
        )}

        <div className="pointer-events-none absolute bottom-3 left-4 text-[9px] uppercase tracking-widest text-[var(--text-lo)]">
          WASD hareket · sol tık ateş · Q E R F C yetenek
        </div>
      </div>

      {/* Skill bar — compact LoL-style slots: key, icon, cost. */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
        <div className="panel p-3 lg:col-span-3">
          <div className="flex items-center gap-2">
            {ship.skills.map((sk, i) => {
              const def = SKILLS[sk];
              const Icon = SKILL_ICONS[sk];
              const affordable = hud.energy >= def.cost;
              const active = activeUntil[sk] ?? 0;
              const on = Date.now() < active;
              return (
                <button
                  key={sk}
                  onClick={() => castSkill(sk)}
                  disabled={!affordable}
                  title={`${def.name} — ${def.desc}`}
                  className="group relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border-2 transition-all duration-150 disabled:cursor-not-allowed"
                  style={{
                    borderColor: on ? '#fff' : affordable ? def.color : 'rgba(148,163,184,0.3)',
                    background: on
                      ? `linear-gradient(160deg, ${def.color}44, rgba(4,6,12,0.9))`
                      : 'linear-gradient(160deg, rgba(255,255,255,0.05), rgba(4,6,12,0.9))',
                    boxShadow: on
                      ? `0 0 20px ${def.color}, inset 0 0 14px ${def.color}66`
                      : affordable
                        ? `inset 0 0 10px ${def.color}22`
                        : 'none',
                    opacity: affordable ? 1 : 0.45,
                  }}
                >
                  <span
                    className="absolute inset-0 flex items-center justify-center"
                    style={{ color: on ? '#fff' : def.color }}
                  >
                    <Icon size={26} />
                  </span>

                  {/* Cooldown / energy veil rising from the bottom */}
                  {!affordable && (
                    <span
                      className="pointer-events-none absolute inset-x-0 bottom-0 bg-black/70"
                      style={{ height: `${100 - Math.min(100, (hud.energy / def.cost) * 100)}%` }}
                    />
                  )}

                  {/* Keybind, top-left like a MOBA slot */}
                  <span className="absolute left-0.5 top-0.5 rounded bg-black/75 px-1 text-[9px] font-black leading-tight text-white">
                    {['Q', 'E', 'R', 'F', 'C'][i]}
                  </span>

                  {/* Cost, bottom-right */}
                  <span className="stat absolute bottom-0.5 right-1 text-[9px] font-black text-white/85">
                    {def.cost}
                  </span>

                  {/* Active ring */}
                  {on && <span className="pointer-events-none absolute inset-0 rounded-md border-2 border-white/70 anim-pulse" />}
                </button>
              );
            })}

            <div className="ml-2 hidden flex-1 text-[10px] leading-relaxed text-[var(--text-lo)] sm:block">
              {ship.skills.map((sk) => (
                <span key={sk} className="mr-3 inline-block whitespace-nowrap">
                  <span style={{ color: SKILLS[sk].color }}>{SKILLS[sk].name}</span>
                  <span className="text-[var(--text-lo)]"> — {SKILLS[sk].desc}</span>
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="panel p-3">
          <p className="label mb-2">filo</p>
          <div className="space-y-1.5">
            <p className="text-center text-[11px] font-black uppercase tracking-wider text-[var(--neon-violet)]">
              {squadron.formation}
            </p>
            {squadron.pilots.map((p) => (
              <div key={p.id} className="flex items-center gap-2">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ background: p.color, boxShadow: `0 0 6px ${p.color}` }}
                />
                <span className="flex-1 truncate text-[10px] font-bold" style={{ color: p.color }}>
                  {p.name}
                </span>
                <span
                  className="text-[9px] font-bold uppercase tracking-wider"
                  style={{ color: p.ready ? '#4ade80' : 'var(--text-lo)' }}
                >
                  {p.ready ? '✓' : '…'}
                </span>
              </div>
            ))}
            <p className="pt-1 text-[9px] leading-relaxed text-[var(--text-lo)]">
              {squadron.pilots.length} pilot sahnede
            </p>
          </div>
        </div>
      </div>

      <div className="flex justify-center">
        <button
          onClick={() => {
            setPicked(false);
            setMode('hub');
            sfx.click();
          }}
          className="rounded-lg border border-[var(--line-strong)] px-4 py-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--text-mid)] hover:text-white"
        >
          ← merkez
        </button>
      </div>
    </div>
  );
};
