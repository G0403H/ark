import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  generateIdentity,
  formatNpubShort,
  parseChatCommand,
} from "./identity.ts";

describe("BitChat Identity & Commands", () => {
  test("generates valid Nostr cryptographic identity with npub and callsign", () => {
    const ident = generateIdentity("Маяк-1");
    assert.equal(ident.callsign, "Маяк-1");
    assert.ok(ident.pubkey && ident.pubkey.length === 64);
    assert.ok(ident.npub && ident.npub.startsWith("npub1"));
    assert.ok(ident.avatarColor.startsWith("#"));
  });

  test("generates default tactical callsign if none provided", () => {
    const ident = generateIdentity();
    assert.ok(ident.callsign.length > 0);
    assert.ok(ident.npub.startsWith("npub1"));
  });

  test("formatNpubShort truncates key cleanly", () => {
    const short = formatNpubShort("npub180cvv0wh49wghrr4eqhg82cw28gah72qhg72hg9");
    assert.equal(short, "npub180cv...72hg9");
  });

  test("parseChatCommand parses slash commands accurately", () => {
    const joinCmd = parseChatCommand("/join #sos");
    assert.deepEqual(joinCmd, { command: "join", args: ["#sos"] });

    const msgCmd = parseChatCommand("/msg npub1abc Прием как слышно");
    assert.deepEqual(msgCmd, { command: "msg", args: ["npub1abc", "Прием", "как", "слышно"] });

    const sosCmd = parseChatCommand("/sos Нужна помощь в секторе 4");
    assert.deepEqual(sosCmd, { command: "sos", args: ["Нужна", "помощь", "в", "секторе", "4"] });

    const plainText = parseChatCommand("Обычное сообщение в эфир");
    assert.equal(plainText, null);
  });
});
