import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  useGpsPeerStore,
  calculateNavData,
  type GpsBeaconPacket,
} from "./gps-peer-tracker.ts";

describe("GPS Peer Tracker & Rescue Radar", () => {
  beforeEach(() => {
    useGpsPeerStore.setState({
      myPeerId: "ARK-1111",
      myCallsign: "Тест-База",
      isGlobalBeaconActive: true,
      isSosActive: false,
      sosMessage: "ТРЕВОГА",
      myCurrentLocation: {
        lat: 55.75,
        lng: 37.61,
        accuracy: 5,
        timestamp: Date.now(),
      },
      gpsWatchId: null,
      friends: [],
    });
  });

  test("should accurately calculate Haversine distance and azimuth", () => {
    // Moscow Red Square (55.7525, 37.6231) to Ostankino Tower (~55.8197, 37.6117) ~7.5 km north
    const nav = calculateNavData(55.7525, 37.6231, 55.8197, 37.6117);

    assert.ok(nav.distanceMeters > 7000);
    assert.ok(nav.distanceMeters < 8000);
    assert.equal(nav.distanceKm, "7.51");
    // Heading almost true North (~350-360 degrees)
    assert.ok(nav.bearingDeg > 345);
  });

  test("should manage friend pairing handshake: inbound request, approval, revocation", () => {
    const store = useGpsPeerStore.getState();

    // Inbound request from friend ARK-2222
    const packet: GpsBeaconPacket = {
      type: "pairing_request",
      senderId: "ARK-2222",
      senderCallsign: "Разведчик-5",
      timestamp: Date.now(),
    };
    store.handleIncomingPacket(packet);

    let friends = useGpsPeerStore.getState().friends;
    assert.equal(friends.length, 1);
    assert.equal(friends[0].id, "ARK-2222");
    assert.equal(friends[0].status, "pending_incoming");

    // Accept request
    useGpsPeerStore.getState().acceptPairingRequest("ARK-2222");
    friends = useGpsPeerStore.getState().friends;
    assert.equal(friends[0].status, "approved");
    assert.equal(friends[0].sharingWithPeer, true);

    // Revoke
    useGpsPeerStore.getState().revokeFriendPairing("ARK-2222");
    friends = useGpsPeerStore.getState().friends;
    assert.equal(friends[0].status, "revoked");
    assert.equal(friends[0].sharingWithPeer, false);
  });

  test("should only accept coordinates from approved friends", () => {
    const store = useGpsPeerStore.getState();

    // Attempt beacon update from unknown / unapproved peer ARK-9999
    const unapprovedPacket: GpsBeaconPacket = {
      type: "beacon_update",
      senderId: "ARK-9999",
      senderCallsign: "Чужак",
      coords: { lat: 55.8, lng: 37.7, timestamp: Date.now() },
      timestamp: Date.now(),
    };
    store.handleIncomingPacket(unapprovedPacket);

    // Should NOT be accepted or stored in friends telemetry
    assert.equal(useGpsPeerStore.getState().friends.length, 0);

    // Now properly pair with friend
    useGpsPeerStore.getState().addFriendRequest("ARK-5555", "Друг-1");
    // Simulate peer approval response
    store.handleIncomingPacket({
      type: "pairing_response",
      senderId: "ARK-5555",
      senderCallsign: "Друг-1",
      status: "approved",
      timestamp: Date.now(),
    });

    // Send valid telemetry from approved friend
    store.handleIncomingPacket({
      type: "beacon_update",
      senderId: "ARK-5555",
      senderCallsign: "Друг-1",
      coords: { lat: 55.76, lng: 37.62, timestamp: Date.now() },
      timestamp: Date.now(),
    });

    const friend = useGpsPeerStore.getState().friends.find((f) => f.id === "ARK-5555");
    assert.ok(friend?.lastBeacon);
    assert.equal(friend?.lastBeacon?.lat, 55.76);
    assert.ok((friend?.lastBeacon?.distanceMeters ?? 0) > 0);
  });

  test("should process emergency SOS alerts from friend", () => {
    const store = useGpsPeerStore.getState();

    // Add and approve friend
    useGpsPeerStore.getState().addFriendRequest("ARK-7777", "Сокол");
    store.handleIncomingPacket({
      type: "pairing_response",
      senderId: "ARK-7777",
      senderCallsign: "Сокол",
      status: "approved",
      timestamp: Date.now(),
    });

    // Friend sends SOS alert
    store.handleIncomingPacket({
      type: "sos_alert",
      senderId: "ARK-7777",
      senderCallsign: "Сокол",
      coords: { lat: 55.78, lng: 37.65, timestamp: Date.now() },
      isSos: true,
      sosMessage: "РАНЕН В НОГУ, НУЖНА ЭВАКУАЦИЯ",
      timestamp: Date.now(),
    });

    const friend = useGpsPeerStore.getState().friends.find((f) => f.id === "ARK-7777");
    assert.equal(friend?.lastBeacon?.isSos, true);
    assert.ok(friend?.lastBeacon?.sosMessage?.includes("РАНЕН В НОГУ"));
  });

  test("should wipe all friends and telemetry on panic wipe", () => {
    useGpsPeerStore.getState().addFriendRequest("ARK-3333", "Секретный контакт");
    assert.equal(useGpsPeerStore.getState().friends.length, 1);

    useGpsPeerStore.getState().panicWipeGps();

    assert.equal(useGpsPeerStore.getState().friends.length, 0);
    assert.equal(useGpsPeerStore.getState().myCurrentLocation, null);
    assert.equal(useGpsPeerStore.getState().isGlobalBeaconActive, false);
  });

  test("should support challenge code verification (Friend or Foe protocol)", () => {
    useGpsPeerStore.getState().addFriendRequest("ARK-8888", "Град");
    useGpsPeerStore.getState().acceptPairingRequest("ARK-8888");

    // Set challenge code
    useGpsPeerStore.getState().setFriendChallengeCode("ARK-8888", "ТАЙФУН-19", true);

    let friend = useGpsPeerStore.getState().friends.find((f) => f.id === "ARK-8888");
    assert.equal(friend?.challengeCode, "ТАЙФУН-19");
    assert.equal(friend?.requireCodeForCoords, true);
    assert.equal(friend?.isVerifiedWithCode, false);

    // Incorrect code attempt
    const failVerify = useGpsPeerStore.getState().verifyFriendChallengeCode("ARK-8888", "НЕВЕРНОЕ-СЛОВО");
    assert.equal(failVerify, false);
    friend = useGpsPeerStore.getState().friends.find((f) => f.id === "ARK-8888");
    assert.equal(friend?.isVerifiedWithCode, false);

    // Correct code attempt (case-insensitive)
    const okVerify = useGpsPeerStore.getState().verifyFriendChallengeCode("ARK-8888", "тайфун-19");
    assert.equal(okVerify, true);
    friend = useGpsPeerStore.getState().friends.find((f) => f.id === "ARK-8888");
    assert.equal(friend?.isVerifiedWithCode, true);
  });

  test("should activate emergency SOS via triggerEmergencyHardwareSos", () => {
    useGpsPeerStore.getState().triggerEmergencyHardwareSos();

    const state = useGpsPeerStore.getState();
    assert.equal(state.isSosActive, true);
    assert.equal(state.isGlobalBeaconActive, true);
  });
});
