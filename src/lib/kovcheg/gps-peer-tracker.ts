import { create } from "zustand";
import { persist } from "zustand/middleware";
import { registerPanicCallback } from "./tactical-security.ts";

export type PeerPairingStatus =
  | "pending_incoming" // Friend requested connection to me
  | "pending_outgoing" // I sent request to friend
  | "approved"         // Both devices confirmed pairing
  | "rejected"         // Denied
  | "revoked";         // Terminated/switched off

export type GpsCoordinates = {
  lat: number;
  lng: number;
  altitude?: number | null;
  accuracy?: number | null;
  speed?: number | null;
  heading?: number | null;
  timestamp: number;
};

export type GpsPeerBeacon = {
  lat: number;
  lng: number;
  altitude?: number | null;
  accuracy?: number | null;
  timestamp: number;
  isSos?: boolean;
  sosMessage?: string;
  distanceMeters?: number;
  bearingDeg?: number;
};

export type GpsFriend = {
  id: string; // Unique Peer ID or npub
  callsign: string;
  note?: string;
  status: PeerPairingStatus;
  createdAt: number;
  lastSeenAt: number;

  // Granular privacy toggles:
  // User can turn OFF broadcasting their location to this specific friend at any time
  sharingWithPeer: boolean;

  // Voluntary challenge code for verification ("Friend or Foe" authentication)
  challengeCode?: string;
  isVerifiedWithCode?: boolean;
  requireCodeForCoords?: boolean;

  // Received beacon telemetry from this friend
  lastBeacon?: GpsPeerBeacon | null;
};

export type GpsBeaconPacket = {
  type:
    | "pairing_request"
    | "pairing_response"
    | "beacon_update"
    | "beacon_revoke"
    | "sos_alert";
  senderId: string;
  senderCallsign: string;
  targetId?: string; // Recipient ID or undefined for broadcast
  coords?: GpsCoordinates;
  isSos?: boolean;
  sosMessage?: string;
  status?: "approved" | "rejected" | "revoked";
  timestamp: number;
};

// Calculate Haversine distance in meters and forward azimuth in degrees
export function calculateNavData(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number
): { distanceMeters: number; distanceKm: string; bearingDeg: number } {
  const R = 6371000; // Earth radius in meters
  const dLat = ((toLat - fromLat) * Math.PI) / 180;
  const dLng = ((toLng - fromLng) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((fromLat * Math.PI) / 180) *
      Math.cos((toLat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distanceMeters = Math.round(R * c);

  // Azimuth
  const y = Math.sin(dLng) * Math.cos((toLat * Math.PI) / 180);
  const x =
    Math.cos((fromLat * Math.PI) / 180) * Math.sin((toLat * Math.PI) / 180) -
    Math.sin((fromLat * Math.PI) / 180) *
      Math.cos((toLat * Math.PI) / 180) *
      Math.cos(dLng);
  let brng = (Math.atan2(y, x) * 180) / Math.PI;
  brng = (brng + 360) % 360;

  return {
    distanceMeters,
    distanceKm: (distanceMeters / 1000).toFixed(2),
    bearingDeg: Math.round(brng),
  };
}

export type GpsPeerState = {
  myPeerId: string;
  myCallsign: string;
  isGlobalBeaconActive: boolean; // Master switch for broadcasting GPS
  isSosActive: boolean;          // Red alert SOS beacon
  sosMessage: string;
  myCurrentLocation: GpsCoordinates | null;
  gpsWatchId: number | null;
  friends: GpsFriend[];

  // Actions
  setMyCallsign: (callsign: string) => void;
  regeneratePeerId: () => void;
  setGlobalBeaconActive: (active: boolean) => void;
  setSosActive: (active: boolean, message?: string) => void;
  updateMyLocation: (coords: GpsCoordinates) => void;
  startGpsTracking: () => void;
  stopGpsTracking: () => void;

  // Friend Pairing & Handshake
  addFriendRequest: (peerId: string, callsign: string, note?: string) => void;
  acceptPairingRequest: (peerId: string) => void;
  rejectPairingRequest: (peerId: string) => void;
  revokeFriendPairing: (peerId: string) => void;
  deleteFriend: (peerId: string) => void;
  setPeerSharing: (peerId: string, sharing: boolean) => void;
  setFriendChallengeCode: (peerId: string, code: string, requireForCoords?: boolean) => void;
  verifyFriendChallengeCode: (peerId: string, inputCode: string) => boolean;

  // P2P Ingestion & Broadcasting
  handleIncomingPacket: (packet: GpsBeaconPacket) => void;
  broadcastCurrentBeacon: (overrideSos?: boolean) => void;
  triggerEmergencyHardwareSos: () => void;
  panicWipeGps: () => void;
};

// Generate deterministic short tactical callsign and ID
function generateDefaultPeerId(): string {
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `ARK-${rand}`;
}

// Local P2P communication channel via BroadcastChannel
let p2pChannel: BroadcastChannel | null = null;
try {
  if (typeof window !== "undefined" && "BroadcastChannel" in window) {
    p2pChannel = new BroadcastChannel("kovcheg_gps_mesh_channel");
  }
} catch {
  // Ignore in non-browser env
}

export const useGpsPeerStore = create<GpsPeerState>()(
  persist(
    (set, get) => ({
      myPeerId: generateDefaultPeerId(),
      myCallsign: "Следопыт",
      isGlobalBeaconActive: true,
      isSosActive: false,
      sosMessage: "ТРЕВОГА! Требуется экстренная помощь и эвакуация!",
      myCurrentLocation: null,
      gpsWatchId: null,
      friends: [],

      setMyCallsign: (callsign: string) =>
        set({ myCallsign: callsign.trim() || "Следопыт" }),

      regeneratePeerId: () =>
        set({ myPeerId: generateDefaultPeerId() }),

      setGlobalBeaconActive: (active: boolean) => {
        set({ isGlobalBeaconActive: active });
        if (active) {
          get().broadcastCurrentBeacon();
        } else {
          // Notify connected peers that beacon is paused/revoked
          const packet: GpsBeaconPacket = {
            type: "beacon_revoke",
            senderId: get().myPeerId,
            senderCallsign: get().myCallsign,
            timestamp: Date.now(),
          };
          p2pChannel?.postMessage(packet);
        }
      },

      setSosActive: (active: boolean, message?: string) => {
        const msg = message || get().sosMessage;
        set({ isSosActive: active, sosMessage: msg });
        get().broadcastCurrentBeacon(active);
      },

      updateMyLocation: (coords: GpsCoordinates) => {
        set({ myCurrentLocation: coords });

        // Update distance/bearing for all approved friends
        set((s) => ({
          friends: s.friends.map((f) => {
            if (!f.lastBeacon) return f;
            const nav = calculateNavData(
              coords.lat,
              coords.lng,
              f.lastBeacon.lat,
              f.lastBeacon.lng
            );
            return {
              ...f,
              lastBeacon: {
                ...f.lastBeacon,
                distanceMeters: nav.distanceMeters,
                bearingDeg: nav.bearingDeg,
              },
            };
          }),
        }));

        // Automatically broadcast updated beacon to friends if active
        if (get().isGlobalBeaconActive) {
          get().broadcastCurrentBeacon();
        }
      },

      startGpsTracking: () => {
        if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
          return;
        }
        if (get().gpsWatchId !== null) return;

        const id = navigator.geolocation.watchPosition(
          (pos) => {
            get().updateMyLocation({
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              altitude: pos.coords.altitude,
              accuracy: pos.coords.accuracy,
              speed: pos.coords.speed,
              heading: pos.coords.heading,
              timestamp: pos.timestamp || Date.now(),
            });
          },
          (err) => {
            console.warn("GPS tracking warning:", err.message);
          },
          {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 10000,
          }
        );

        set({ gpsWatchId: id });
      },

      stopGpsTracking: () => {
        const id = get().gpsWatchId;
        if (id !== null && typeof navigator !== "undefined") {
          navigator.geolocation.clearWatch(id);
          set({ gpsWatchId: null });
        }
      },

      // Add a friend and send outgoing handshake
      addFriendRequest: (peerId: string, callsign: string, note?: string) => {
        const cleanId = peerId.trim().toUpperCase();
        if (!cleanId || cleanId === get().myPeerId) return;

        const existing = get().friends.find((f) => f.id === cleanId);
        const now = Date.now();

        if (existing) {
          // If already existing, refresh status
          set((s) => ({
            friends: s.friends.map((f) =>
              f.id === cleanId
                ? {
                    ...f,
                    callsign: callsign.trim() || f.callsign,
                    note: note || f.note,
                    status: f.status === "approved" ? "approved" : "pending_outgoing",
                    lastSeenAt: now,
                  }
                : f
            ),
          }));
        } else {
          const newFriend: GpsFriend = {
            id: cleanId,
            callsign: callsign.trim() || `Абонент ${cleanId}`,
            note: note?.trim(),
            status: "pending_outgoing",
            createdAt: now,
            lastSeenAt: now,
            sharingWithPeer: true,
          };
          set((s) => ({ friends: [newFriend, ...s.friends] }));
        }

        // Broadcast Pairing Request Packet
        const packet: GpsBeaconPacket = {
          type: "pairing_request",
          senderId: get().myPeerId,
          senderCallsign: get().myCallsign,
          targetId: cleanId,
          timestamp: now,
        };
        p2pChannel?.postMessage(packet);
      },

      acceptPairingRequest: (peerId: string) => {
        const now = Date.now();
        set((s) => ({
          friends: s.friends.map((f) =>
            f.id === peerId
              ? { ...f, status: "approved", sharingWithPeer: true, lastSeenAt: now }
              : f
          ),
        }));

        // Send positive response back to the peer
        const packet: GpsBeaconPacket = {
          type: "pairing_response",
          senderId: get().myPeerId,
          senderCallsign: get().myCallsign,
          targetId: peerId,
          status: "approved",
          timestamp: now,
        };
        p2pChannel?.postMessage(packet);

        // Share initial beacon if broadcast active
        get().broadcastCurrentBeacon();
      },

      rejectPairingRequest: (peerId: string) => {
        set((s) => ({
          friends: s.friends.map((f) =>
            f.id === peerId ? { ...f, status: "rejected" } : f
          ),
        }));

        const packet: GpsBeaconPacket = {
          type: "pairing_response",
          senderId: get().myPeerId,
          senderCallsign: get().myCallsign,
          targetId: peerId,
          status: "rejected",
          timestamp: Date.now(),
        };
        p2pChannel?.postMessage(packet);
      },

      revokeFriendPairing: (peerId: string) => {
        set((s) => ({
          friends: s.friends.map((f) =>
            f.id === peerId
              ? { ...f, status: "revoked", sharingWithPeer: false }
              : f
          ),
        }));

        const packet: GpsBeaconPacket = {
          type: "beacon_revoke",
          senderId: get().myPeerId,
          senderCallsign: get().myCallsign,
          targetId: peerId,
          status: "revoked",
          timestamp: Date.now(),
        };
        p2pChannel?.postMessage(packet);
      },

      deleteFriend: (peerId: string) => {
        set((s) => ({
          friends: s.friends.filter((f) => f.id !== peerId),
        }));
      },

      setPeerSharing: (peerId: string, sharing: boolean) => {
        set((s) => ({
          friends: s.friends.map((f) =>
            f.id === peerId ? { ...f, sharingWithPeer: sharing } : f
          ),
        }));

        if (sharing) {
          get().broadcastCurrentBeacon();
        } else {
          // Tell this peer that sharing is revoked
          const packet: GpsBeaconPacket = {
            type: "beacon_revoke",
            senderId: get().myPeerId,
            senderCallsign: get().myCallsign,
            targetId: peerId,
            timestamp: Date.now(),
          };
          p2pChannel?.postMessage(packet);
        }
      },

      setFriendChallengeCode: (peerId: string, code: string, requireForCoords = false) => {
        set((s) => ({
          friends: s.friends.map((f) =>
            f.id === peerId
              ? {
                  ...f,
                  challengeCode: code.trim(),
                  requireCodeForCoords: requireForCoords,
                  isVerifiedWithCode: false,
                }
              : f
          ),
        }));
      },

      verifyFriendChallengeCode: (peerId: string, inputCode: string) => {
        const friend = get().friends.find((f) => f.id === peerId);
        if (!friend || !friend.challengeCode) return false;

        const isMatch =
          friend.challengeCode.toUpperCase().trim() === inputCode.toUpperCase().trim();
        if (isMatch) {
          set((s) => ({
            friends: s.friends.map((f) =>
              f.id === peerId ? { ...f, isVerifiedWithCode: true } : f
            ),
          }));
        }
        return isMatch;
      },

      triggerEmergencyHardwareSos: () => {
        set({ isSosActive: true, isGlobalBeaconActive: true });

        // Tactile Morse SOS vibration pattern: ... --- ...
        if (typeof navigator !== "undefined" && "vibrate" in navigator) {
          try {
            navigator.vibrate([
              150, 100, 150, 100, 150, 200, 400, 100, 400, 100, 400, 200, 150, 100,
              150, 100, 150,
            ]);
          } catch {}
        }

        // Query GPS location immediately and broadcast SOS
        if (typeof navigator !== "undefined" && "geolocation" in navigator) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              const coords: GpsCoordinates = {
                lat: pos.coords.latitude,
                lng: pos.coords.longitude,
                altitude: pos.coords.altitude,
                accuracy: pos.coords.accuracy,
                speed: pos.coords.speed,
                heading: pos.coords.heading,
                timestamp: pos.timestamp || Date.now(),
              };
              get().updateMyLocation(coords);
              get().broadcastCurrentBeacon(true);
            },
            () => {
              get().broadcastCurrentBeacon(true);
            },
            { enableHighAccuracy: true, timeout: 5000, maximumAge: 60000 }
          );
        } else {
          get().broadcastCurrentBeacon(true);
        }
      },

      broadcastCurrentBeacon: (overrideSos?: boolean) => {
        const {
          myPeerId,
          myCallsign,
          isGlobalBeaconActive,
          isSosActive,
          sosMessage,
          myCurrentLocation,
          friends,
        } = get();

        if (!isGlobalBeaconActive && !overrideSos && !isSosActive) return;
        if (!myCurrentLocation) return;

        const effectiveSos = overrideSos !== undefined ? overrideSos : isSosActive;

        // Broadcast to approved peers who have sharing enabled (and verified if required)
        const approvedFriends = friends.filter((f) => {
          if (f.status !== "approved" || !f.sharingWithPeer) return false;
          // If challenge code is required for normal beacon, wait until verified
          if (!effectiveSos && f.requireCodeForCoords && !f.isVerifiedWithCode) {
            return false;
          }
          return true;
        });
        if (approvedFriends.length === 0 && !effectiveSos) return;

        const packet: GpsBeaconPacket = {
          type: effectiveSos ? "sos_alert" : "beacon_update",
          senderId: myPeerId,
          senderCallsign: myCallsign,
          coords: myCurrentLocation,
          isSos: effectiveSos,
          sosMessage: effectiveSos ? sosMessage : undefined,
          timestamp: Date.now(),
        };

        p2pChannel?.postMessage(packet);
      },

      handleIncomingPacket: (packet: GpsBeaconPacket) => {
        const { myPeerId, myCurrentLocation } = get();

        // Ignore packets originating from this device
        if (packet.senderId === myPeerId) return;

        // If packet is targeted to a specific peer, verify it matches me
        if (packet.targetId && packet.targetId !== myPeerId) return;

        const now = Date.now();

        // 1. Inbound Pairing Request from a friend
        if (packet.type === "pairing_request") {
          const existing = get().friends.find((f) => f.id === packet.senderId);
          if (!existing) {
            const newFriend: GpsFriend = {
              id: packet.senderId,
              callsign: packet.senderCallsign || `Абонент ${packet.senderId}`,
              status: "pending_incoming",
              createdAt: now,
              lastSeenAt: now,
              sharingWithPeer: false,
            };
            set((s) => ({ friends: [newFriend, ...s.friends] }));
          } else if (existing.status !== "approved") {
            set((s) => ({
              friends: s.friends.map((f) =>
                f.id === packet.senderId
                  ? { ...f, status: "pending_incoming", lastSeenAt: now }
                  : f
              ),
            }));
          }
          return;
        }

        // 2. Inbound Pairing Response (Friend accepted or rejected)
        if (packet.type === "pairing_response") {
          set((s) => ({
            friends: s.friends.map((f) => {
              if (f.id === packet.senderId) {
                return {
                  ...f,
                  status: packet.status === "approved" ? "approved" : "rejected",
                  callsign: packet.senderCallsign || f.callsign,
                  lastSeenAt: now,
                };
              }
              return f;
            }),
          }));

          if (packet.status === "approved") {
            get().broadcastCurrentBeacon();
          }
          return;
        }

        // 3. Beacon Revocation
        if (packet.type === "beacon_revoke") {
          set((s) => ({
            friends: s.friends.map((f) => {
              if (f.id === packet.senderId) {
                return {
                  ...f,
                  lastSeenAt: now,
                  lastBeacon: f.lastBeacon
                    ? { ...f.lastBeacon, isSos: false }
                    : null,
                };
              }
              return f;
            }),
          }));
          return;
        }

        // 4. GPS Beacon Update or Emergency SOS Alert
        if (packet.type === "beacon_update" || packet.type === "sos_alert") {
          const friend = get().friends.find((f) => f.id === packet.senderId);
          // Only accept telemetry if friend is approved! (Security Rule: friend must be authorized)
          if (!friend || friend.status !== "approved") return;
          if (!packet.coords) return;

          let distanceMeters: number | undefined;
          let bearingDeg: number | undefined;

          if (myCurrentLocation) {
            const nav = calculateNavData(
              myCurrentLocation.lat,
              myCurrentLocation.lng,
              packet.coords.lat,
              packet.coords.lng
            );
            distanceMeters = nav.distanceMeters;
            bearingDeg = nav.bearingDeg;
          }

          const beacon: GpsPeerBeacon = {
            lat: packet.coords.lat,
            lng: packet.coords.lng,
            altitude: packet.coords.altitude,
            accuracy: packet.coords.accuracy,
            timestamp: packet.timestamp || now,
            isSos: packet.isSos || packet.type === "sos_alert",
            sosMessage: packet.sosMessage,
            distanceMeters,
            bearingDeg,
          };

          set((s) => ({
            friends: s.friends.map((f) =>
              f.id === packet.senderId
                ? {
                    ...f,
                    callsign: packet.senderCallsign || f.callsign,
                    lastSeenAt: now,
                    lastBeacon: beacon,
                  }
                : f
            ),
          }));
        }
      },

      panicWipeGps: () => {
        // Stop GPS watching
        const id = get().gpsWatchId;
        if (id !== null && typeof navigator !== "undefined") {
          navigator.geolocation.clearWatch(id);
        }

        // Clear all friends, coordinates and history immediately
        set({
          friends: [],
          myCurrentLocation: null,
          gpsWatchId: null,
          isGlobalBeaconActive: false,
          isSosActive: false,
          myPeerId: generateDefaultPeerId(),
        });
      },
    }),
    {
      name: "kovcheg-gps-peers-v1",
      partialize: (state) => ({
        myPeerId: state.myPeerId,
        myCallsign: state.myCallsign,
        isGlobalBeaconActive: state.isGlobalBeaconActive,
        friends: state.friends,
      }),
    }
  )
);

// Register panic wipe listener with the tactical security module
registerPanicCallback(() => {
  useGpsPeerStore.getState().panicWipeGps();
});

// Setup P2P channel event listener
if (p2pChannel) {
  p2pChannel.onmessage = (event) => {
    try {
      const packet = event.data as GpsBeaconPacket;
      if (packet && packet.type && packet.senderId) {
        useGpsPeerStore.getState().handleIncomingPacket(packet);
      }
    } catch (e) {
      console.warn("Failed to parse incoming GPS peer packet:", e);
    }
  };
}
