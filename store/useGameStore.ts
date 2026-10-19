import { create } from '@/lib/createStore';
import { net, makeId, PLAYER_COLORS, type Peer, type AttackKind, type SoldierWire } from '@/lib/net';
import type { QuestionCategory } from '@/config/questions';

export type Mode = 'hub' | 'breach' | 'clash' | 'tower' | 'space' | 'lobby';
export type Role = 'ghost' | 'oracle' | 'architect' | 'spectator';

export interface ChatLine {
  id: string;
  name: string;
  color: string;
  text: string;
  at: number;
  self?: boolean;
}

export interface ActiveAttack {
  id: string;
  kind: AttackKind;
  fromName: string;
  expiresAt: number;
}

export const NAME_MAX = 16;

interface GameState {
  /* identity */
  playerId: string;
  name: string;
  color: string;
  /** False until the player has picked a name — the join gate is shown. */
  joined: boolean;

  /* navigation */
  mode: Mode;
  role: Role;
  /** Chosen Cerebral Clash category — drives both question set and backdrop. */
  category: QuestionCategory;
  setCategory: (c: QuestionCategory) => void;
  /**
   * How many humans are playing The Breach.
   * 3 = every role is manned. 2 = one role runs on an automated subsystem.
   */
  breachPlayers: 2 | 3;
  /** In 2-player mode, which role the automated subsystem covers. */
  autoRole: Role;
  setBreachSetup: (players: 2 | 3, autoRole: Role) => void;
  /** Void Lance: chosen chassis and ready flag, shared with the briefing room. */
  spaceDrone: string;
  spaceReady: boolean;
  setSpaceDrone: (id: string) => void;
  setSpaceReady: (v: boolean) => void;
  /**
   * Other pilots' drones in the arena, keyed by player id.
   *
   * Void Lance runs one simulation per client, so remote drones are drawn from
   * these snapshots rather than simulated locally.
   */
  wingmen: Record<
    string,
    { name: string; color: string; drone: string; x: number; y: number; angle: number; chassis: number; maxChassis: number; at: number }
  >;
  /**
   * Who owns the shared boss. Every client runs its own arena, so the boss is
   * authoritative on exactly one drone — everyone else mirrors it and reports
   * hits rather than applying them.
   */
  bossHost: string;

  /* lobby */
  peers: Peer[];
  roomCode: string;

  /* realtime */
  chat: ChatLine[];
  attacks: ActiveAttack[];
  /** Damage dealt to us by other players, drained by the active game mode. */
  incoming: { id: string; amount: number; fromName: string; label: string }[];
  /** Every marching unit on the shared battlefield, from all players. */
  soldiers: SoldierWire[];
  /**
   * Global bullet-time. `slowUntil` is a wall-clock deadline so every client
   * agrees on when it ends without an extra "resume" message.
   */
  slowUntil: number;
  /** Active Pong duel, or null. Shared so both players see the same match. */
  duel: {
    id: string;
    node: string;
    host: string;
    guest: string;
    hostName: string;
    guestName: string;
    state: 'pending' | 'playing' | 'done';
    /** Ball + paddles, mirrored enough to stay in sync. */
    hostY: number;
    guestY: number;
    ballX: number;
    ballY: number;
    vx: number;
    vy: number;
    scoreHost: number;
    scoreGuest: number;
    winner?: string;
  } | null;
  startSlowmo: (seconds: number) => void;
  inviteDuel: (targetId: string, targetName: string, node: string) => void;
  acceptDuel: (hostId: string, hostName: string) => void;
  updateDuel: (patch: Partial<NonNullable<GameState['duel']>>) => void;
  endDuel: () => void;
  sendSoldier: (s: Omit<SoldierWire, 'ownerId' | 'ownerName' | 'color'>) => void;
  /** Announces units lost in combat so every client drops them together. */
  announceKills: (ids: string[]) => void;
  /** Removes finished soldiers. Returns the ones that just landed. */
  pruneSoldiers: (mineOnly?: boolean) => SoldierWire[];
  toasts: { id: string; text: string; tone: 'info' | 'warn' | 'good' }[];
  connected: boolean;

  /* shared game values — anything a mode wants to sync */
  shared: Record<string, unknown>;

  /* actions */
  join: (name: string, color: string) => void;
  setName: (name: string) => void;
  setMode: (mode: Mode) => void;
  setRole: (role: Role) => void;
  setRoom: (code: string) => void;
  sendChat: (text: string) => void;
  sendAttack: (kind: AttackKind, to: string) => void;
  sendDamage: (to: string, amount: number, label: string) => void;
  /** Consume and clear the queued incoming damage. */
  drainIncoming: () => { id: string; amount: number; fromName: string; label: string }[];
  pushToast: (text: string, tone?: 'info' | 'warn' | 'good') => void;
  postShared: (key: string, value: unknown) => void;
  tick: () => void;
  heartbeat: () => void;
  boot: () => void;
}

const uid = () => Math.random().toString(36).slice(2, 11);

/* ============================================================
   Shared boss channel
   ============================================================
   Void Lance gives every client its own arena, so the boss would normally be
   simulated once per tab and each player would be fighting a private copy.
   These module-level cells let the boss live in one place: whichever client
   holds `bossHost` simulates it and broadcasts; everyone else mirrors and
   reports damage instead of applying it.
   ============================================================ */

export const bossState = { hp: 0, x: 0, y: 0, dir: 1 };
export const bossHitQueue: number[] = [];
export const bossHostRef = { value: '' };

/**
 * Per-tab identity storage.
 *
 * sessionStorage — NOT localStorage — is deliberate: localStorage is shared by
 * every tab on the origin, so three tabs would all read back the same name.
 * sessionStorage is scoped per tab, which is exactly one-player-per-tab.
 */
const KEY = 'nb:identity';

function loadIdentity(): { playerId: string; name: string; color: string } | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { playerId?: string; name?: string; color?: string };
    if (!parsed.playerId) return null;
    return {
      playerId: parsed.playerId,
      name: parsed.name ?? '',
      color: parsed.color ?? PLAYER_COLORS[0],
    };
  } catch {
    return null;
  }
}

function saveIdentity(playerId: string, name: string, color: string) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ playerId, name, color }));
  } catch {
    /* private mode may refuse writes — identity simply won't survive reload */
  }
}

export function sanitizeName(raw: string) {
  return raw.replace(/\s+/g, ' ').trim().slice(0, NAME_MAX);
}

export const useGame = create<GameState>((set, get) => ({
  playerId: '',
  name: '',
  color: PLAYER_COLORS[0],
  joined: false,

  mode: 'hub',
  role: 'spectator',
  category: 'lol',
  setCategory: (category) => set({ category }),

  breachPlayers: 3,
  autoRole: 'architect',
  setBreachSetup: (breachPlayers, autoRole) => set({ breachPlayers, autoRole }),

  spaceDrone: 'interceptor',
  spaceReady: false,
  setSpaceDrone: (spaceDrone) => set({ spaceDrone }),
  setSpaceReady: (spaceReady) => set({ spaceReady }),
  wingmen: {},
  bossHost: '',

  peers: [],
  roomCode: 'ALPHA-01',

  chat: [],
  attacks: [],
  incoming: [],
  soldiers: [],
  slowUntil: 0,
  duel: null,
  toasts: [],
  connected: false,

  shared: {},

  join: (rawName, color) => {
    const name = sanitizeName(rawName) || `OPERATÖR-${makeId().slice(0, 3)}`;
    const { playerId } = get();
    set({ name, color, joined: true });
    saveIdentity(playerId, name, color);
    net.send({ t: 'hello', from: { id: playerId, name, color, role: 'spectator', at: Date.now() } });
  },

  /* Renaming mid-session: tell the others so their rosters update live. */
  setName: (rawName) => {
    const name = sanitizeName(rawName);
    if (!name) return;
    const { playerId, color } = get();
    set({ name });
    saveIdentity(playerId, name, color);
    net.send({ t: 'rename', from: playerId, name, color });
  },

  setMode: (mode) => set({ mode }),

  setRole: (role) => set({ role }),

  setRoom: (roomCode) => set({ roomCode }),

  pushToast: (text, tone = 'info') => {
    const id = uid();
    set((s) => ({ toasts: [...s.toasts, { id, text, tone }] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, 3600);
  },

  sendChat: (text) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const { playerId, name, color } = get();
    const at = Date.now();
    net.send({ t: 'chat', from: playerId, name, color, text: trimmed, at });

    /* BroadcastChannel does not echo back to the sender, so a message we send
     * would otherwise reach everyone except us. Append it locally. */
    set((s) => ({
      chat: [...s.chat.slice(-120), { id: uid(), name, color, text: trimmed, at, self: true }],
    }));
  },

  sendAttack: (kind, to) => {
    const { playerId, name } = get();
    net.send({ t: 'attack', from: playerId, name, kind, to, at: Date.now() });
  },

  sendDamage: (to, amount, label) => {
    const { playerId, name } = get();
    net.send({ t: 'damage', from: playerId, name, to, amount, label });
  },

  drainIncoming: () => {
    const queued = get().incoming;
    if (queued.length) set({ incoming: [] });
    return queued;
  },

  startSlowmo: (seconds) => {
    const endsAt = Date.now() + seconds * 1000;
    const me = get().playerId;
    net.send({ t: 'slowmo', from: me, endsAt });
    /* Take the later deadline so overlapping triggers don't shorten it. */
    set((s) => ({ slowUntil: Math.max(s.slowUntil, endsAt) }));
    get().pushToast('AĞIR ÇEKİM — klavyeyi bırak, saldır', 'warn');
  },

  inviteDuel: (targetId, targetName, node) => {
    const { playerId, name } = get();
    const duel = {
      id: `duel-${Date.now().toString(36)}`,
      node,
      host: playerId,
      guest: targetId,
      hostName: name,
      guestName: targetName,
      state: 'pending' as const,
      hostY: 50,
      guestY: 50,
      ballX: 50,
      ballY: 50,
      vx: 0,
      vy: 0,
      scoreHost: 0,
      scoreGuest: 0,
    };
    net.send({ t: 'pong:invite', from: playerId, name, target: targetId, node });
    set({ duel });
    get().pushToast(`${targetName} düelloya çağrıldı`, 'warn');
  },

  acceptDuel: (hostId, hostName) => {
    const { playerId, name } = get();
    net.send({ t: 'pong:accept', from: playerId, name, host: hostId });
    set((s) => (s.duel ? { duel: { ...s.duel, state: 'playing' } } : {}));
    get().pushToast(`${hostName} ile düello başladı`, 'good');
  },

  updateDuel: (patch) => {
    const { duel } = get();
    if (!duel) return;
    set({ duel: { ...duel, ...patch } });
  },

  endDuel: () => set({ duel: null }),

  sendSoldier: (s) => {
    const { playerId, name, color } = get();
    const wire: SoldierWire = { ...s, ownerId: playerId, ownerName: name, color };
    net.send({ t: 'soldier', from: playerId, soldier: wire });
    set((st) => ({ soldiers: [...st.soldiers.slice(-90), wire] }));
  },

  announceKills: (ids) => {
    if (!ids.length) return;
    const me = get().playerId;
    net.send({ t: 'kill', from: me, ids });
    /* Apply locally too — BroadcastChannel does not echo to the sender. */
    const gone = new Set(ids);
    set((s) => ({ soldiers: s.soldiers.filter((x) => !gone.has(x.id)) }));
  },

  /**
   * Drop finished units and report which ones just landed.
   *
   * Only the OWNER may call this in a damaging way: every client holds the
   * same soldier list, so if everyone pruned, an arriving unit would be
   * removed by all clients and its owner could miss the tick that applies
   * the hit. Callers other than the owner should pass `mineOnly`.
   */
  pruneSoldiers: (mineOnly = true) => {
    const now = Date.now();
    const me = get().playerId;
    const all = get().soldiers;

    const isDone = (s: SoldierWire) => now >= s.spawnedAt + s.duration;
    const arrived = all.filter((s) => isDone(s) && (!mineOnly || s.ownerId === me));

    if (arrived.length) {
      const remove = new Set(arrived.map((s) => s.id));
      set({ soldiers: all.filter((s) => !remove.has(s.id)) });
    }
    return arrived;
  },

  postShared: (key, value) => {
    const me = get().playerId;
    net.send({ t: 'sync', from: me, key, value });
    set((s) => ({ shared: { ...s.shared, [key]: value } }));
  },

  /* Prunes expired attacks + drops stale peers. Driven by one interval in the shell. */
  tick: () => {
    const now = Date.now();
    const { attacks, peers } = get();
    const liveAttacks = attacks.filter((a) => a.expiresAt > now);
    const livePeers = peers.filter((p) => now - p.at < 12_000);
    if (liveAttacks.length !== attacks.length || livePeers.length !== peers.length) {
      set({ attacks: liveAttacks, peers: livePeers });
    }
  },

  /* Presence ping. Uses `hello`, but the handler only announces a peer the
   * first time it is seen — otherwise this would toast every 5 seconds. */
  heartbeat: () => {
    const { playerId, name, color, role, joined } = get();
    if (!joined || !playerId) return;
    net.send({ t: 'hello', from: { id: playerId, name, color, role, at: Date.now() } });
  },

  boot: () => {
    if (typeof window === 'undefined' || get().playerId) return;

    /* Reuse this tab's earlier identity, otherwise mint a fresh one. */
    const stored = loadIdentity();
    const playerId = stored?.playerId ?? makeId();
    const color = stored?.color ?? PLAYER_COLORS[Math.floor(Math.random() * PLAYER_COLORS.length)];
    const name = stored?.name ?? '';

    set({ playerId, color, name, joined: Boolean(name), connected: true });
    net.start();

    net.on((msg) => {
      const me = get().playerId;

      switch (msg.t) {
        /* The relay's greeting: here's who was already in the room. */
        case 'welcome': {
          if (msg.members?.length) {
            set((s) => {
              const merged = [...s.peers];
              msg.members.forEach((p) => {
                if (p.id === me) return;
                const i = merged.findIndex((x) => x.id === p.id);
                if (i >= 0) merged[i] = { ...p, at: Date.now() };
                else merged.push({ ...p, at: Date.now() });
              });
              return { peers: merged };
            });
          }
          break;
        }

        case 'hello': {
          const alreadyKnown = get().peers.some((p) => p.id === msg.from.id);

          set((s) => {
            const others = s.peers.filter((p) => p.id !== msg.from.id);
            return { peers: [...others, { ...msg.from, at: Date.now() }] };
          });

          /* Answer so the newcomer learns about us too. */
          const self = get();
          net.send({
            t: 'roster',
            from: me,
            players: [{ id: me, name: self.name, color: self.color, role: self.role, at: Date.now() }],
          });

          /* Only announce a genuine first contact. */
          if (!alreadyKnown && msg.from.id !== me) {
            get().pushToast(`${msg.from.name} bağlandı`, 'good');
          }
          break;
        }

        case 'roster': {
          set((s) => {
            const merged = [...s.peers];
            msg.players.forEach((p) => {
              const i = merged.findIndex((x) => x.id === p.id);
              if (i >= 0) merged[i] = { ...p, at: Date.now() };
              else merged.push({ ...p, at: Date.now() });
            });
            return { peers: merged.filter((p) => p.id !== me) };
          });
          break;
        }

        case 'rename': {
          set((s) => ({
            peers: s.peers.map((p) =>
              p.id === msg.from ? { ...p, name: msg.name, color: msg.color } : p
            ),
          }));
          break;
        }

        case 'bye': {
          set((s) => ({ peers: s.peers.filter((p) => p.id !== msg.from) }));
          break;
        }

        case 'chat': {
          set((s) => ({
            chat: [
              ...s.chat.slice(-120),
              { id: uid(), name: msg.name, color: msg.color, text: msg.text, at: msg.at },
            ],
          }));
          break;
        }

        case 'attack': {
          if (msg.to !== me && msg.to !== 'all') break;
          const id = uid();
          set((s) => ({
            attacks: [
              ...s.attacks,
              { id, kind: msg.kind, fromName: msg.name, expiresAt: Date.now() + 3000 },
            ],
          }));
          break;
        }

        case 'damage': {
          if (msg.to !== me && msg.to !== 'all') break;
          set((s) => ({
            incoming: [
              ...s.incoming,
              { id: uid(), amount: msg.amount, fromName: msg.name, label: msg.label },
            ],
          }));
          break;
        }

        case 'soldier': {
          set((s) => ({ soldiers: [...s.soldiers.slice(-80), msg.soldier] }));
          break;
        }

        case 'kill': {
          const gone = new Set(msg.ids);
          set((s) => ({ soldiers: s.soldiers.filter((x) => !gone.has(x.id)) }));
          break;
        }

        case 'slowmo': {
          set((s) => ({ slowUntil: Math.max(s.slowUntil, msg.endsAt) }));
          get().pushToast('AĞIR ÇEKİM BAŞLADI', 'warn');
          break;
        }

        case 'pong:invite': {
          if (msg.target !== me) break;
          /* Incoming challenge — park it as a pending duel we can accept. */
          set({
            duel: {
              id: `duel-${msg.from}`,
              node: msg.node,
              host: msg.from,
              guest: me,
              hostName: msg.name,
              guestName: get().name,
              state: 'pending',
              hostY: 50,
              guestY: 50,
              ballX: 50,
              ballY: 50,
              vx: 0,
              vy: 0,
              scoreHost: 0,
              scoreGuest: 0,
            },
          });
          get().pushToast(`${msg.name} seni düelloya çağırdı`, 'warn');
          break;
        }

        case 'pong:accept': {
          const d = get().duel;
          if (!d || d.host !== me) break;
          set({ duel: { ...d, state: 'playing', guestName: msg.name } });
          get().pushToast(`${msg.name} kabul etti — düello!`, 'good');
          break;
        }

        case 'pong:state': {
          const d = get().duel;
          if (!d || d.state !== 'playing') break;
          if (msg.from === d.host) {
            /* The host owns the ball simulation; guests mirror it. */
            set({ duel: { ...d, hostY: msg.y, ballX: msg.vx, ballY: msg.vy } });
          } else {
            set({ duel: { ...d, guestY: msg.y } });
          }
          break;
        }

        case 'pong:result': {
          const d = get().duel;
          if (!d) break;
          set({ duel: { ...d, state: 'done', winner: msg.winner } });
          break;
        }

        case 'space:launch': {
          /* The elected host adopts the boss; everyone else mirrors it. The
             election is deterministic (lowest id), so no negotiation needed. */
          bossHostRef.value = msg.host;
          set({ bossHost: msg.host });
          break;
        }

        case 'space:drone': {
          if (msg.from === me) break;
          set((s) => ({
            wingmen: {
              ...s.wingmen,
              [msg.from]: {
                name: msg.name,
                color: msg.color,
                drone: msg.drone,
                x: msg.x,
                y: msg.y,
                angle: msg.angle,
                chassis: msg.chassis,
                maxChassis: msg.maxChassis,
                at: Date.now(),
              },
            },
          }));
          break;
        }

        case 'space:boss': {
          /* A position report from whoever currently owns the boss. */
          set({ bossHost: msg.from });
          bossHostRef.value = msg.from;
          bossState.hp = msg.hp;
          bossState.x = msg.x;
          bossState.y = msg.y;
          bossState.dir = msg.dir;
          break;
        }

        case 'space:bossHit': {
          /* Someone else landed a hit; only the owner applies damage. */
          if (bossHostRef.value === me) {
            bossHitQueue.push(msg.dmg);
          }
          break;
        }

        case 'sync': {
          set((s) => ({ shared: { ...s.shared, [msg.key]: msg.value } }));
          break;
        }
      }
    });

    const bye = () => net.send({ t: 'bye', from: playerId });
    window.addEventListener('beforeunload', bye);
  },
}));
