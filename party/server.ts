import { routePartykitRequest, Server } from 'partyserver';
import type { Connection } from 'partyserver';

/**
 * NEON BREACH relay.
 *
 * Deliberately dumb: it does not know or care what a "soldier" or a "boss" is.
 * It keeps a roster of who is connected, broadcasts every message to the other
 * members of the same room, and lets the clients keep their own authoritative
 * state. That means none of the game logic changes when the transport moves
 * from same-browser tabs to the internet.
 *
 * Runs on Cloudflare Workers + Durable Objects via PartyServer (the successor
 * to the retired PartyKit hosted platform).
 */

interface Member {
  id: string;
  name: string;
  color: string;
  joinedAt: number;
}

interface Env {
  Main: DurableObjectNamespace;
}

export class Main extends Server<Env> {
  members = new Map<string, Member>();

  /** Greet a new connection with the current roster. */
  async onConnect(conn: Connection) {
    conn.send(
      JSON.stringify({
        t: 'welcome',
        members: Array.from(this.members.values()),
      })
    );
  }

  /** PartyServer passes (connection, message) — the reverse of PartyKit. */
  onMessage(sender: Connection, raw: string) {
    let msg: Record<string, unknown>;
    try {
      msg = JSON.parse(raw);
    } catch {
      return; // ignore anything malformed
    }

    /* Track who is here, so a late joiner can be told the full roster. */
    if (msg.t === 'hello') {
      const from = msg.from as Member | undefined;
      if (from?.id) {
        this.members.set(from.id, {
          id: from.id,
          name: from.name ?? 'OPERATÖR',
          color: from.color ?? '#22d3ee',
          joinedAt: Date.now(),
        });
      }
    }

    if (msg.t === 'bye') {
      this.members.delete(msg.from as string);
    }

    /* Relay to everyone else in the room. The sender already applied it
       locally, so echoing back would double-apply every event. */
    this.broadcast(raw, [sender.id]);
  }

  /**
   * Roster entries age out on their own: clients re-announce `hello` on a
   * heartbeat, so anyone who stops appearing drops off the list.
   */
  onClose(_conn: Connection) {}

  /** HTTP endpoint so a client can discover who else is in the room. */
  async onRequest(_req: Request) {
    return Response.json({
      members: Array.from(this.members.values()),
      count: this.members.size,
    });
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    return (
      (await routePartykitRequest(request, env)) ??
      new Response('Not found', { status: 404 })
    );
  },
} satisfies ExportedHandler<Env>;
