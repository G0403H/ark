import type { BitChatMessage, BitChatIdentity, BitChatTransportType } from "./types.ts";

export const MAX_HOPS = 7;

export function generateMessageId(pubkey: string, timestamp: number, text: string): string {
  // Deterministic or pseudo-random unique ID for message deduplication
  const rand = Math.random().toString(36).slice(2, 8);
  return `${pubkey.slice(0, 8)}-${timestamp.toString(36)}-${rand}`;
}

export function createBitChatMessage(
  sender: BitChatIdentity,
  channel: string,
  text: string,
  options?: {
    isEmergency?: boolean;
    recipientPubkey?: string;
    transport?: BitChatTransportType;
  }
): BitChatMessage {
  const timestamp = Date.now();
  const id = generateMessageId(sender.pubkey, timestamp, text);

  return {
    id,
    senderPubkey: sender.pubkey,
    callsign: sender.callsign,
    channel,
    text: text.trim(),
    timestamp,
    transport: options?.transport ?? "mesh",
    hops: 0,
    isEmergency: options?.isEmergency ?? false,
    recipientPubkey: options?.recipientPubkey,
  };
}

export function relayBitChatMessage(msg: BitChatMessage): BitChatMessage | null {
  if (msg.hops >= MAX_HOPS) {
    return null; // Exceeded maximum mesh distance (hop count)
  }

  return {
    ...msg,
    hops: msg.hops + 1,
  };
}

export function createSosBeacon(
  sender: BitChatIdentity,
  coords?: { lat: number; lon: number },
  note?: string
): BitChatMessage {
  let text = "🚨 СИГНАЛ БЕДСТВИЯ / SOS BEACON!";
  if (coords) {
    text += ` Координаты: ${coords.lat}, ${coords.lon}`;
  }
  if (note?.trim()) {
    text += ` — ${note.trim()}`;
  }

  return createBitChatMessage(sender, "sos", text, {
    isEmergency: true,
    transport: "mesh",
  });
}
