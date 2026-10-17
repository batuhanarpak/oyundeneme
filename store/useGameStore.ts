import { create } from '@/lib/createStore';
import { net, makeId, PLAYER_COLORS, type Peer, type AttackKind } from '@/lib/net';

export type Mode = 'hub' | 'breach' | 'clash' | 'tower' | 'lobby';
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

interface GameState {
  /* identity */
  playerId: string;
  name: string;
  color: string;

  /* navigation */
  mode: Mode;
  role: Role;

  /* lobby */
  peers: Peer[];
  roomCode: string;

  /* realtime */
  chat: ChatLine[];
  attacks: ActiveAttack[];
  /** Damage dealt to us by other players, drained by the active game mode. */
  incoming: { id: string; amount: number; fromName: string; label: string }[];
  toasts: { id: string; text: string; tone: 'info' | 'warn' | 'good' }[];
  connected: boolean;

  /* shared game values — anything a mode wants to sync */
  shared: Record<string, unknown>;

  /* actions */
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
  boot: () => void;
}

const uid = () => Math.random().toString(36).slice(2, 11);

export const useGame = create<GameState>((set, get) => ({
  playerId: '',
  name: '',
  color: PLAYER_COLORS[0],

  mode: 'hub',
  role: 'spectator',

  peers: [],
  roomCode: 'ALPHA-01',

  chat: [],
  attacks: [],
  incoming: [],
  toasts: [],
  connected: false,

  shared: {},

  setName: (name) => set({ name }),

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
    net.send({ t: 'chat', from: playerId, name, color, text: trimmed, at: Date.now() });
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

  boot: () => {
    if (typeof window === 'undefined' || get().playerId) return;

    const playerId = makeId();
    const color = PLAYER_COLORS[Math.floor(Math.random() * PLAYER_COLORS.length)];
    const callsigns = ['VIPER', 'NOMAD', 'ECHO', 'RAVEN', 'CIPHER'];
    const name = `${callsigns[Math.floor(Math.random() * callsigns.length)]}-${playerId.slice(0, 2)}`;

    set({ playerId, name, color, connected: true });

    net.start();
    net.send({ t: 'hello', from: { id: playerId, name, color, role: 'spectator', at: Date.now() } });

    net.on((msg) => {
      const me = get().playerId;

      switch (msg.t) {
        case 'hello': {
          // Register the newcomer, and introduce ourselves back so they see us too.
          set((s) => {
            const others = s.peers.filter((p) => p.id !== msg.from.id);
            return { peers: [...others, { ...msg.from, at: Date.now() }] };
          });
          const self = get();
          net.send({
            t: 'roster',
            from: me,
            players: [{ id: me, name: self.name, color: self.color, role: self.role, at: Date.now() }],
          });
          get().pushToast(`${msg.from.name} bağlandı`, 'good');
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
