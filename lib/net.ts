/**
 * Zero-config realtime bus.
 *
 * Three transports, chosen automatically:
 *
 *   1. PARTYKIT (default when a host is configured) — a real WebSocket relay,
 *      so players on different machines can share a room. This is what makes
 *      "send the link to a friend" work.
 *   2. BroadcastChannel — same-browser tabs. Used when no PartyKit host is set,
 *      which keeps local development instant and offline-friendly.
 *   3. localStorage `storage` events — last-resort fallback for browsers
 *      without BroadcastChannel.
 *
 * The public surface (`net.send`, `net.on`, `net.start`) is identical across
 * all three, so no game code has to know which one is live.
 */

export type NetMessage =
  | { t: 'hello'; from: Peer; }
  | { t: 'bye'; from: string; }
  | { t: 'roster'; from: string; players: Peer[]; }
  | { t: 'rename'; from: string; name: string; color: string; }
  | { t: 'chat'; from: string; name: string; color: string; text: string; at: number; }
  | { t: 'attack'; from: string; name: string; kind: AttackKind; to: string; at: number; }
  | { t: 'damage'; from: string; name: string; to: string; amount: number; label: string; node?: string; }
  | { t: 'soldier'; from: string; soldier: SoldierWire; }
  | { t: 'kill'; from: string; ids: string[]; }
  | { t: 'slowmo'; from: string; endsAt: number; }
  | { t: 'pong:invite'; from: string; name: string; target: string; node: string; }
  | { t: 'pong:accept'; from: string; name: string; host: string; }
  | { t: 'pong:state'; from: string; y: number; vx: number; vy: number; }
  | { t: 'pong:result'; from: string; winner: string; loser: string; }
  | { t: 'space:join'; from: string; name: string; ship: string; color: string; ready: boolean; }
  | { t: 'space:leave'; from: string; }
  | { t: 'space:launch'; from: string; at: number; host: string; }
  | { t: 'space:ship'; from: string; name: string; color: string; ship: string; x: number; y: number; angle: number; hull: number; maxHull: number; }
  | { t: 'space:boss'; from: string; hp: number; x: number; y: number; dir: number; }
  | { t: 'space:bossHit'; from: string; dmg: number; }
  | { t: 'sync'; from: string; key: string; value: unknown; }
  | { t: 'state'; from: string; patch: Record<string, unknown>; }
  /* Sent by the relay itself, not by a peer. */
  | { t: 'welcome'; members: Peer[]; };

/**
 * A marching unit, as it travels between clients.
 *
 * Only the spawn is transmitted. Every client then derives the soldier's
 * position from `spawnedAt` + `duration`, so a marching army costs one small
 * message per unit instead of a position stream.
 */
export interface SoldierWire {
  id: string;
  ownerId: string;
  ownerName: string;
  color: string;
  power: number;
  fromNode: string;
  toNode: string;
  spawnedAt: number;
  duration: number;
}

export type AttackKind = 'glitch' | 'blur' | 'flip' | 'freeze' | 'burst';

export interface Peer {
  id: string;
  name: string;
  color: string;
  role: string;
  at: number;
}

const CHANNEL = 'neon-breach';
const ROOM = 'alpha';
const HOST_KEY = 'nb:party-host';

/**
 * Where the relay lives, resolved once per page load.
 *
 * Order matters: a `?party=` query param wins, so a shared link works for
 * someone who has never opened the game before — they click and they're in.
 * We then remember it locally so a plain reload keeps working. `NEXT_PUBLIC_
 * PARTYKIT_HOST` remains as a build-time default for deployments that set it.
 */
function resolveHost(): string {
  if (typeof window === 'undefined') {
    return (process.env.NEXT_PUBLIC_PARTYKIT_HOST ?? '').trim();
  }
  try {
    const fromUrl = new URL(window.location.href).searchParams.get('party');
    if (fromUrl) {
      localStorage.setItem(HOST_KEY, fromUrl);
      return fromUrl.trim();
    }
    const saved = localStorage.getItem(HOST_KEY);
    if (saved) return saved.trim();
  } catch {
    /* a blocked localStorage just means we fall through to the env default */
  }
  return (process.env.NEXT_PUBLIC_PARTYKIT_HOST ?? '').trim();
}

let PARTY_HOST = resolveHost();

/** Points the client at a relay and remembers it for next time. */
export function setPartyHost(host: string) {
  PARTY_HOST = host.trim();
  try {
    localStorage.setItem(HOST_KEY, PARTY_HOST);
  } catch {
    /* non-fatal: the session still works, it just won't be remembered */
  }
}

export function getPartyHost() {
  return PARTY_HOST;
}

/** A link that drops whoever opens it straight into the same room. */
export function shareUrl() {
  if (typeof window === 'undefined' || !PARTY_HOST) return '';
  const u = new URL(window.location.href);
  u.searchParams.set('party', PARTY_HOST);
  return u.toString();
}

type Handler = (msg: NetMessage) => void;

class Net {
  private channel: BroadcastChannel | null = null;
  private ws: WebSocket | null = null;
  private handlers = new Set<Handler>();
  private started = false;
  private retry = 0;
  private outbox: string[] = [];
  /**
   * Message ids we've already handled.
   *
   * Every message travels down two paths at once — the local BroadcastChannel
   * and the WebSocket relay — so a tab on the same machine as the sender sees
   * it twice. Deduping here keeps the game code from having to care.
   */
  private seen = new Set<string>();
  private seenOrder: string[] = [];

  /** True when we're relaying through a real server rather than local tabs. */
  get online() {
    return PARTY_HOST.length > 0;
  }

  start() {
    if (this.started || typeof window === 'undefined') return;
    this.started = true;

    if (this.online) {
      this.connectSocket();
    }

    /* Always keep the local channel alive too: it costs nothing, and it means
       two tabs on this machine stay in sync even if the socket is down. */
    if ('BroadcastChannel' in window) {
      this.channel = new BroadcastChannel(CHANNEL);
      this.channel.onmessage = (e) => this.dispatch(e.data as NetMessage);
    }

    window.addEventListener('storage', (e) => {
      if (e.key !== CHANNEL || !e.newValue) return;
      try {
        this.dispatch(JSON.parse(e.newValue) as NetMessage);
      } catch {
        /* ignore malformed payloads */
      }
    });
  }

  /* ------------------------------------------------------------
     WebSocket transport
     ------------------------------------------------------------ */

  private connectSocket() {
    if (typeof window === 'undefined') return;
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const secure = window.location.protocol === 'https:';
    const url = `${secure ? 'wss' : 'ws'}://${PARTY_HOST}/parties/main/${ROOM}`;

    let socket: WebSocket;
    try {
      socket = new WebSocket(url);
    } catch {
      this.scheduleReconnect();
      return;
    }
    this.ws = socket;

    socket.onopen = () => {
      this.retry = 0;
      /* Flush anything queued while the socket was coming up. */
      this.outbox.forEach((raw) => socket.send(raw));
      this.outbox = [];
    };

    socket.onmessage = (e) => {
      try {
        this.dispatch(JSON.parse(e.data as string) as NetMessage);
      } catch {
        /* ignore malformed payloads */
      }
    };

    socket.onclose = () => {
      this.ws = null;
      this.scheduleReconnect();
    };

    socket.onerror = () => {
      /* `onclose` follows and handles the retry. */
    };
  }

  private scheduleReconnect() {
    if (typeof window === 'undefined') return;
    /* Back off gently so a flaky network doesn't hammer the relay. */
    this.retry = Math.min(this.retry + 1, 6);
    const delay = 400 * 2 ** (this.retry - 1);
    window.setTimeout(() => this.connectSocket(), delay);
  }

  /* ------------------------------------------------------------
     Public surface
     ------------------------------------------------------------ */

  private dispatch(msg: NetMessage) {
    if (!msg || typeof msg !== 'object' || typeof msg.t !== 'string') return;

    /* Same message can arrive over both transports; handle it once. */
    const id = (msg as { __id?: string }).__id;
    if (id) {
      if (this.seen.has(id)) return;
      this.seen.add(id);
      this.seenOrder.push(id);
      /* Bounded so a long session can't grow the set without limit. */
      if (this.seenOrder.length > 600) {
        const drop = this.seenOrder.splice(0, 200);
        drop.forEach((d) => this.seen.delete(d));
      }
    }

    this.handlers.forEach((h) => h(msg));
  }

  send(msg: NetMessage) {
    if (typeof window === 'undefined') return;

    /* One id per logical message, shared by both transports. */
    const __id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const stamped = { ...msg, __id };
    const raw = JSON.stringify(stamped);

    /* Local tabs. */
    if (this.channel) {
      this.channel.postMessage(stamped);
    } else {
      try {
        localStorage.setItem(CHANNEL, raw);
        localStorage.removeItem(CHANNEL);
      } catch {
        /* storage may be unavailable in private mode */
      }
    }

    /* And the world, when a relay is configured. */
    if (this.online) {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(raw);
      } else {
        /* Hold onto it; it goes out as soon as the socket opens. */
        if (this.outbox.length < 80) this.outbox.push(raw);
        this.connectSocket();
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

export const PLAYER_COLORS = ['#22d3ee', '#f43f5e', '#a78bfa', '#4ade80', '#fbbf24'];

export const CALLSIGNS = ['VIPER', 'NOMAD', 'ECHO', 'RAVEN', 'CIPHER', 'ONYX', 'ZERO', 'KILO', 'NOVA', 'DELTA'];
