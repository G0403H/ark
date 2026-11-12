import { SimplePool, finalizeEvent } from "nostr-tools";
import type { BitChatMessage, BitChatIdentity } from "./types.ts";
import { DEFAULT_NOSTR_RELAYS } from "./types.ts";

export type NostrMessageCallback = (msg: BitChatMessage) => void;
export type RelayStatusCallback = (connectedRelays: number, totalRelays: number) => void;

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

export class BitChatNostr {
  private pool: SimplePool | null = null;
  private relays: string[] = DEFAULT_NOSTR_RELAYS;
  private identity: BitChatIdentity;
  private messageListeners = new Set<NostrMessageCallback>();
  private statusListeners = new Set<RelayStatusCallback>();
  private sub: any = null;
  private seenIds = new Set<string>();
  private isConnected = false;

  constructor(identity: BitChatIdentity, customRelays?: string[]) {
    this.identity = identity;
    if (customRelays && customRelays.length > 0) {
      this.relays = customRelays;
    }
  }

  public updateIdentity(newIdentity: BitChatIdentity) {
    this.identity = newIdentity;
  }

  public connect(): boolean {
    if (typeof window === "undefined" || typeof WebSocket === "undefined") {
      return false;
    }

    try {
      this.pool = new SimplePool();
      this.subscribe();
      this.isConnected = true;
      this.notifyStatus(this.relays.length, this.relays.length);
      return true;
    } catch (err) {
      console.warn("Nostr connection failure:", err);
      this.notifyStatus(0, this.relays.length);
      return false;
    }
  }

  private subscribe() {
    if (!this.pool) return;

    try {
      // Subscribe to Kovcheg & BitChat messages across relays
      const oneDayAgo = Math.floor(Date.now() / 1000) - 86400;
      this.sub = this.pool.subscribeMany(
        this.relays,
        {
          kinds: [1],
          "#t": ["bitchat", "kovcheg"],
          since: oneDayAgo,
          limit: 40,
        },
        {
          onevent: (event) => {
            this.handleNostrEvent(event);
          },
        }
      );
    } catch (err) {
      console.warn("Nostr subscription error:", err);
    }
  }

  private handleNostrEvent(event: any) {
    if (this.seenIds.has(event.id)) return;
    this.seenIds.add(event.id);

    // Extract tags
    const channelTag = event.tags.find((t: string[]) => t[0] === "c");
    const callsignTag = event.tags.find((t: string[]) => t[0] === "callsign");
    const emergencyTag = event.tags.find((t: string[]) => t[0] === "emergency");

    const channel = channelTag ? channelTag[1] : "general";
    const callsign = callsignTag ? callsignTag[1] : `Nostr-${event.pubkey.slice(0, 4)}`;
    const isEmergency = emergencyTag ? emergencyTag[1] === "true" : false;

    const msg: BitChatMessage = {
      id: event.id,
      senderPubkey: event.pubkey,
      callsign,
      channel,
      text: event.content,
      timestamp: event.created_at * 1000,
      transport: "nostr",
      hops: 0,
      isEmergency,
    };

    for (const listener of this.messageListeners) {
      try {
        listener(msg);
      } catch (err) {
        console.error("Nostr listener error:", err);
      }
    }
  }

  public async publish(msg: BitChatMessage): Promise<boolean> {
    if (!this.pool || !this.identity.privkey) {
      return false;
    }

    try {
      const secretKey = hexToBytes(this.identity.privkey);
      const tags: string[][] = [
        ["t", "kovcheg"],
        ["t", "bitchat"],
        ["c", msg.channel],
        ["callsign", msg.callsign],
      ];

      if (msg.isEmergency) {
        tags.push(["emergency", "true"]);
      }

      if (msg.recipientPubkey) {
        tags.push(["p", msg.recipientPubkey]);
      }

      const unsignedEvent = {
        kind: 1,
        created_at: Math.floor(Date.now() / 1000),
        tags,
        content: msg.text,
      };

      const signedEvent = finalizeEvent(unsignedEvent, secretKey);
      this.seenIds.add(signedEvent.id);

      await Promise.any(this.pool.publish(this.relays, signedEvent));
      return true;
    } catch (err) {
      console.warn("Failed to publish to Nostr relays:", err);
      return false;
    }
  }

  public onMessage(callback: NostrMessageCallback): () => void {
    this.messageListeners.add(callback);
    return () => this.messageListeners.delete(callback);
  }

  public onStatus(callback: RelayStatusCallback): () => void {
    this.statusListeners.add(callback);
    if (this.isConnected) {
      callback(this.relays.length, this.relays.length);
    } else {
      callback(0, this.relays.length);
    }
    return () => this.statusListeners.delete(callback);
  }

  private notifyStatus(connected: number, total: number) {
    for (const cb of this.statusListeners) {
      cb(connected, total);
    }
  }

  public destroy() {
    if (this.sub) {
      try {
        this.sub.close();
      } catch {}
      this.sub = null;
    }
    if (this.pool) {
      try {
        this.pool.close(this.relays);
      } catch {}
      this.pool = null;
    }
    this.messageListeners.clear();
    this.statusListeners.clear();
    this.isConnected = false;
  }
}
