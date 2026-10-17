/**
 * Zero-config realtime bus.
 *
 * Uses BroadcastChannel so multiple tabs/windows on the same origin sync
 * instantly — no server, no API keys, no env vars. Each tab is one player,
 * which is exactly what you need to test a 3-player game.
 *
 * Falls back to the `storage` event for browsers without BroadcastChannel.
 */

export type NetMessage =
  | { t: 'hello'; from: Peer; }
  | { t: 'bye'; from: string; }
  | { t: 'roster'; from: string; players: Peer[]; }
  | { t: 'chat'; from: string; name: string; color: string; text: string; at: number; }
  | { t: 'attack'; from: string; name: string; kind: AttackKind; to: string; at: number; }
  | { t: 'damage'; from: string; name: string; to: string; amount: number; label: string; }
  | { t: 'sync'; from: string; key: string; value: unknown; }
  | { t: 'state'; from: string; patch: Record<string, unknown>; };

export type AttackKind = 'glitch' | 'blur' | 'flip' | 'freeze' | 'burst';

export interface Peer {
  id: string;
  name: string;
  color: string;
  role: string;
  at: number;
}

const CHANNEL = 'neon-breach';

type Handler = (msg: NetMessage) => void;

class Net {
  private channel: BroadcastChannel | null = null;
  private handlers = new Set<Handler>();
  private started = false;

  start() {
    if (this.started || typeof window === 'undefined') return;
    this.started = true;

    if ('BroadcastChannel' in window) {
      this.channel = new BroadcastChannel(CHANNEL);
      this.channel.onmessage = (e) => this.dispatch(e.data as NetMessage);
    }

    // Fallback / redundancy for cross-window delivery.
    window.addEventListener('storage', (e) => {
      if (e.key !== CHANNEL || !e.newValue) return;
      try {
        this.dispatch(JSON.parse(e.newValue) as NetMessage);
      } catch {
        /* ignore malformed payloads */
      }
    });
  }

  private dispatch(msg: NetMessage) {
    if (!msg || typeof msg !== 'object' || typeof msg.t !== 'string') return;
    this.handlers.forEach((h) => h(msg));
  }

  send(msg: NetMessage) {
    if (typeof window === 'undefined') return;

    if (this.channel) {
      this.channel.postMessage(msg);
    } else {
      try {
        // BroadcastChannel absent: hand off through localStorage.
        localStorage.setItem(CHANNEL, JSON.stringify({ ...msg, __nonce: Math.random() }));
        localStorage.removeItem(CHANNEL);
      } catch {
        /* storage may be unavailable in private mode */
      }
    }
  }

  on(handler: Handler) {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }
}

export const net = new Net();

export function makeId() {
  return Math.random().toString(36).slice(2, 10).toUpperCase();
}

export const PLAYER_COLORS = [
  '#22d3ee', // cyan
  '#f43f5e', // rose
  '#a78bfa', // violet
  '#4ade80', // green
  '#fbbf24', // amber
];

export const CALLSIGNS = [
  'VIPER', 'NOMAD', 'ECHO', 'RAVEN', 'CIPHER',
  'ONYX', 'ZERO', 'KILO', 'NOVA', 'DELTA',
];
