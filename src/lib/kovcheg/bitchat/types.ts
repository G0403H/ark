export type BitChatTransportType = "mesh" | "nostr" | "local";

export type BitChatMessage = {
  id: string;
  senderPubkey: string;
  callsign: string;
  channel: string; // e.g. "sos", "general", "med", "radiation", or "@npub..." for DM
  text: string;
  timestamp: number;
  transport: BitChatTransportType;
  hops: number;
  isEmergency?: boolean;
  recipientPubkey?: string; // set for direct messages
};

export type BitChatIdentity = {
  pubkey: string; // hex
  npub: string;
  privkey?: string; // hex
  nsec?: string;
  callsign: string;
  avatarColor: string;
};

export type BitChatChannel = {
  id: string;
  name: string;
  description: string;
  isEmergency?: boolean;
};

export const DEFAULT_CHANNELS: BitChatChannel[] = [
  {
    id: "general",
    name: "#общий",
    description: "Открытый канал связи и координации",
  },
  {
    id: "sos",
    name: "#sos-маяк",
    description: "Экстренные сигналы бедствия и спасения",
    isEmergency: true,
  },
  {
    id: "medical",
    name: "#медицина",
    description: "Первая помощь и поиск медикаментов",
  },
  {
    id: "radiation",
    name: "#радиация",
    description: "Радиационная обстановка и убежища",
  },
];

export const DEFAULT_NOSTR_RELAYS = [
  "wss://relay.damus.io",
  "wss://nos.lol",
  "wss://relay.primal.net",
];
