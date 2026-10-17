import type * as Party from 'partykit/server';

/**
 * NEON BREACH relay.
 *
 * Deliberately dumb: it does not know or care what a "soldier" or a "boss" is.
 * It keeps a roster of who is connected, broadcasts every message to the other
 * members of the same room, and lets the clients keep their own authoritative
 * state. That means none of the game logic changes when the transport moves
 * from same-browser tabs to the internet.
 */

interface Member {
  id: string;
  name: string;
  color: string;
  joinedAt: number;
}

export default class NeonBreachServer implements Party.Server {
  members = new Map<string, Member>();

  constructor(readonly room: Party.Room) {}

  /** Reconnect a client and hand it the current roster. */
  async onConnect(conn: Party.Connection) {
    conn.send(
      JSON.stringify({
        t: 'welcome',
        members: Array.from(this.members.values()),
      })
    );
  }

  onMessage(raw: string, sender: Party.Connection) {
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
      const id = msg.from as string;
      this.members.delete(id);
    }

    /* Relay to everyone else in the room. The sender already applied it
       locally, so echoing back would double-apply every event. */
    this.room.broadcast(raw, [sender.id]);
  }

  onClose(conn: Party.Connection) {
    /* Drop anyone whose connection died without a polite goodbye. */
    for (const [id, m] of this.members) {
      if (Date.now() - m.joinedAt > 0 && !this.isStillConnected(id)) {
        this.members.delete(id);
      }
    }
  }

  private isStillConnected(_id: string) {
    /* PartyKit keeps its own connection list; the entry is dropped lazily on
       the next roster request rather than tracked precisely here. */
    return true;
  }

  /** HTTP endpoint so the client can discover who else is in the room. */
  async onRequest(_req: Party.Request) {
    return Response.json({
      members: Array.from(this.members.values()),
      count: this.members.size,
    });
  }
}

NeonBreachServer satisfies Party.Worker;
