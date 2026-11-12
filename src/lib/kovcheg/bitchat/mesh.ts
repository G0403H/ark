import type { BitChatMessage } from "./types.ts";
import { relayBitChatMessage } from "./protocol.ts";

export type MeshMessageCallback = (msg: BitChatMessage) => void;
export type PeerCountCallback = (count: number) => void;

export class BitChatMesh {
  private channel: BroadcastChannel | null = null;
  private seenIds = new Set<string>();
  private messageListeners = new Set<MeshMessageCallback>();
  private peerCountListeners = new Set<PeerCountCallback>();
  private activePeers = new Map<string, number>();
  private pingInterval: any = null;
  private selfId: string;

  constructor(selfId: string) {
    this.selfId = selfId;
    if (typeof window !== "undefined" && typeof BroadcastChannel !== "undefined") {
      this.channel = new BroadcastChannel("kovcheg-bitchat-mesh");
      this.channel.onmessage = this.handleChannelMessage.bind(this);

      // Start presence heartbeat
      this.pingInterval = setInterval(this.broadcastPresence.bind(this), 3000);
      this.broadcastPresence();
    }
  }

  private broadcastPresence() {
    if (!this.channel) return;
    this.channel.postMessage({
      type: "presence",
      peerId: this.selfId,
      time: Date.now(),
    });

    // Clean up stale peers (> 8 sec inactive)
    const now = Date.now();
    let changed = false;
    for (const [peer, lastSeen] of this.activePeers.entries()) {
      if (now - lastSeen > 8000) {
        this.activePeers.delete(peer);
        changed = true;
      }
    }
    if (changed) {
      this.notifyPeerCount();
    }
  }

  private handleChannelMessage(event: MessageEvent) {
    const data = event.data;
    if (!data || typeof data !== "object") return;

    if (data.type === "presence" && data.peerId && data.peerId !== this.selfId) {
      const isNew = !this.activePeers.has(data.peerId);
      this.activePeers.set(data.peerId, Date.now());
      if (isNew) {
        this.notifyPeerCount();
      }
      return;
    }

    if (data.type === "message" && data.message) {
      const msg: BitChatMessage = data.message;
      if (this.seenIds.has(msg.id)) {
        return; // Already processed
      }
      this.seenIds.add(msg.id);

      // Notify local listeners
      for (const listener of this.messageListeners) {
        try {
          listener(msg);
        } catch (err) {
          console.error("Mesh listener error:", err);
        }
      }

      // Multi-hop relay forwarding
      const forwarded = relayBitChatMessage(msg);
      if (forwarded && this.channel) {
        // Asynchronously propagate to mesh peers
        setTimeout(() => {
          this.channel?.postMessage({
            type: "message",
            message: forwarded,
          });
        }, 50);
      }
    }
  }

  public broadcast(msg: BitChatMessage) {
    this.seenIds.add(msg.id);
    if (this.channel) {
      this.channel.postMessage({
        type: "message",
        message: msg,
      });
    }
  }

  public onMessage(callback: MeshMessageCallback): () => void {
    this.messageListeners.add(callback);
    return () => this.messageListeners.delete(callback);
  }

  public onPeerCount(callback: PeerCountCallback): () => void {
    this.peerCountListeners.add(callback);
    callback(this.activePeers.size);
    return () => this.peerCountListeners.delete(callback);
  }

  private notifyPeerCount() {
    const count = this.activePeers.size;
    for (const cb of this.peerCountListeners) {
      cb(count);
    }
  }

  public getPeerCount(): number {
    return this.activePeers.size;
  }

  public destroy() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }
    if (this.channel) {
      this.channel.close();
      this.channel = null;
    }
    this.messageListeners.clear();
    this.peerCountListeners.clear();
  }
}
