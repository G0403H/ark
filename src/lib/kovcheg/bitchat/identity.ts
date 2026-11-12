import { generateSecretKey, getPublicKey, nip19 } from "nostr-tools";
import type { BitChatIdentity } from "./types.ts";

export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function pubkeyToColor(pubkey: string): string {
  let hash = 0;
  for (let i = 0; i < pubkey.length; i++) {
    hash = (hash << 5) - hash + pubkey.charCodeAt(i);
    hash |= 0;
  }
  const colors = [
    "#e0a045", // lamp
    "#8a9474", // calm olive
    "#b54032", // alarm red
    "#5e81ac", // tactical blue
    "#d08770", // rust orange
    "#a3be8c", // sage green
    "#b48ead", // muted purple
    "#ebcb8b", // amber
  ];
  return colors[Math.abs(hash) % colors.length];
}

const CALLSIGN_PREFIXES = ["Ратник", "Сокол", "Маяк", "Север", "Шквал", "Тайга", "Беркут", "Восток", "Заря", "Кедр"];

export function generateDefaultCallsign(pubkey: string): string {
  const prefix = CALLSIGN_PREFIXES[Math.abs(pubkey.charCodeAt(0) + pubkey.charCodeAt(1)) % CALLSIGN_PREFIXES.length];
  const suffix = pubkey.slice(0, 4).toUpperCase();
  return `${prefix}-${suffix}`;
}

export function generateIdentity(customCallsign?: string): BitChatIdentity {
  const secretKey = generateSecretKey();
  const pubkeyHex = getPublicKey(secretKey);
  const npub = nip19.npubEncode(pubkeyHex);
  const nsec = nip19.nsecEncode(secretKey);
  const privkeyHex = bytesToHex(secretKey);
  const callsign = customCallsign?.trim() || generateDefaultCallsign(pubkeyHex);
  const avatarColor = pubkeyToColor(pubkeyHex);

  return {
    pubkey: pubkeyHex,
    npub,
    privkey: privkeyHex,
    nsec,
    callsign,
    avatarColor,
  };
}

export function formatNpubShort(npub: string): string {
  if (npub.length <= 16) return npub;
  return `${npub.slice(0, 9)}...${npub.slice(-5)}`;
}

export type ParsedChatCommand = {
  command: "join" | "msg" | "who" | "clear" | "sos" | "wipe" | "relay" | "nick" | string;
  args: string[];
};

export function parseChatCommand(input: string): ParsedChatCommand | null {
  const trimmed = input.trim();
  if (!trimmed.startsWith("/")) return null;

  const parts = trimmed.slice(1).split(/\s+/);
  const command = parts[0]?.toLowerCase() || "";
  const args = parts.slice(1);

  return {
    command,
    args,
  };
}
