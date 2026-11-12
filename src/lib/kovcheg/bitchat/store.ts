import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { BitChatMessage, BitChatIdentity, BitChatChannel } from "./types.ts";
import { DEFAULT_CHANNELS, DEFAULT_NOSTR_RELAYS } from "./types.ts";
import { generateIdentity } from "./identity.ts";

export type BitChatState = {
  identity: BitChatIdentity;
  activeChannel: string;
  channels: BitChatChannel[];
  relays: string[];
  messages: BitChatMessage[];
  peerCount: number;
  connectedRelays: number;

  setCallsign: (callsign: string) => void;
  setIdentity: (identity: BitChatIdentity) => void;
  setActiveChannel: (channel: string) => void;
  joinChannel: (channelId: string) => void;
  addRelay: (relayUrl: string) => void;
  removeRelay: (relayUrl: string) => void;
  addMessage: (msg: BitChatMessage) => void;
  clearMessages: (channel?: string) => void;
  setPeerCount: (count: number) => void;
  setConnectedRelays: (count: number) => void;
  panicWipe: () => void;
};

export const useBitChatStore = create<BitChatState>()(
  persist(
    (set) => ({
      identity: generateIdentity(),
      activeChannel: "general",
      channels: DEFAULT_CHANNELS,
      relays: DEFAULT_NOSTR_RELAYS,
      messages: [],
      peerCount: 0,
      connectedRelays: 0,

      setCallsign: (callsign) =>
        set((s) => ({
          identity: {
            ...s.identity,
            callsign: callsign.trim() || s.identity.callsign,
          },
        })),

      setIdentity: (identity) => set({ identity }),

      setActiveChannel: (activeChannel) => set({ activeChannel }),

      joinChannel: (channelId) => {
        const cleanId = channelId.replace(/^#/, "").toLowerCase().trim();
        if (!cleanId) return;

        set((s) => {
          const exists = s.channels.some((c) => c.id === cleanId);
          const updatedChannels = exists
            ? s.channels
            : [
                ...s.channels,
                {
                  id: cleanId,
                  name: `#${cleanId}`,
                  description: `Пользовательский канал связи`,
                },
              ];
          return {
            channels: updatedChannels,
            activeChannel: cleanId,
          };
        });
      },

      addRelay: (relayUrl) =>
        set((s) => {
          const cleanUrl = relayUrl.trim();
          if (!cleanUrl || s.relays.includes(cleanUrl)) return s;
          return { relays: [...s.relays, cleanUrl] };
        }),

      removeRelay: (relayUrl) =>
        set((s) => ({
          relays: s.relays.filter((r) => r !== relayUrl),
        })),

      addMessage: (msg) =>
        set((s) => {
          if (s.messages.some((m) => m.id === msg.id)) {
            return s; // Deduplicate
          }
          // Cap stored messages to 300 to preserve mobile memory
          return {
            messages: [...s.messages, msg].slice(-300),
          };
        }),

      clearMessages: (channel) =>
        set((s) => ({
          messages: channel
            ? s.messages.filter((m) => m.channel !== channel)
            : [],
        })),

      setPeerCount: (peerCount) => set({ peerCount }),

      setConnectedRelays: (connectedRelays) => set({ connectedRelays }),

      panicWipe: () =>
        set(() => {
          // Reset to completely new cryptographic keypair and empty message log
          return {
            identity: generateIdentity(),
            activeChannel: "general",
            channels: DEFAULT_CHANNELS,
            relays: DEFAULT_NOSTR_RELAYS,
            messages: [],
            peerCount: 0,
          };
        }),
    }),
    {
      name: "kovcheg-bitchat-storage-v1",
      partialize: (state) => ({
        identity: state.identity,
        activeChannel: state.activeChannel,
        channels: state.channels,
        relays: state.relays,
        messages: state.messages,
      }),
    }
  )
);
