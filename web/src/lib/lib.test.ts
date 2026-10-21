import { describe, expect, it } from "vitest";
import fixture from "../../fixtures/sample-upload.json";
import { API_TOKEN_PATTERN, newApiToken, sha256 } from "./auth/crypto";
import { parseClaimedId } from "./auth/steam";
import { denormalize } from "./denormalize";
import { characterName, formatFrames, hitSourceName, itemName } from "./game";
import { parseRun, uploadSchema } from "./runSchema";

describe("parseRun", () => {
  it("accepts the mod's output and normalizes empty objects written as []", () => {
    const parsed = parseRun(fixture.runs[0]);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.run.floors[0].rooms[0].resources).toEqual({});
    expect(parsed.run.floors[1].summary?.pickups).toEqual({});
    expect("uploaded" in parsed.run).toBe(false);
    // Fields the validator doesn't know about are kept.
    expect(parsed.run.floors[0].map[0].displayFlags).toBe(5);
  });

  it("rejects unfinished runs and reports the uid", () => {
    const parsed = parseRun({ ...fixture.runs[0], status: "in_progress" });
    expect(parsed).toMatchObject({ ok: false, uid: "0f3a9c2b7d4e1a65" });
  });

  it("rejects runs without a uid", () => {
    const noUid: Record<string, unknown> = { ...fixture.runs[0] };
    delete noUid.uid;
    expect(parseRun(noUid).ok).toBe(false);
  });

  it("caps batch size", () => {
    expect(uploadSchema.safeParse({ schemaVersion: 3, runs: Array(51).fill({}) }).success).toBe(false);
  });
});

describe("denormalize", () => {
  it("derives list columns", () => {
    const parsed = parseRun(fixture.runs[0]);
    if (!parsed.ok) throw new Error(parsed.error);
    expect(denormalize(parsed.run)).toMatchObject({
      status: "died",
      floorsReached: 2,
      finalFloorName: "Basement II",
      killedBy: "Larry Jr.",
      itemCount: 3,
      endedAt: expect.any(Date),
    });
  });
});

describe("game names", () => {
  it("names items, characters and hit sources", () => {
    expect(itemName({ kind: "collectible", id: 1, name: "#THE_SAD_ONION_NAME" })).toBe("The Sad Onion");
    expect(itemName({ kind: "collectible", id: 99999, name: "My Modded Item" })).toBe("My Modded Item");
    expect(characterName(21)).toBe("Tainted Isaac");
    expect(characterName(4)).toBe("???");
    expect(
      hitSourceName({ amount: 1, flags: 1 << 7, sourceType: 0, sourceVariant: 0, frame: 0, player: 0 }),
    ).toBe("Spikes");
    expect(formatFrames(30 * 75)).toBe("1:15");
    expect(formatFrames(30 * 3725)).toBe("1:02:05");
  });
});

describe("auth helpers", () => {
  it("parses Steam claimed ids", () => {
    expect(parseClaimedId("https://steamcommunity.com/openid/id/76561197960287930")).toBe("76561197960287930");
    expect(parseClaimedId("https://evil.example/openid/id/76561197960287930")).toBeNull();
    expect(parseClaimedId("https://steamcommunity.com/openid/id/123")).toBeNull();
  });

  it("makes tokens in the format the mod accepts", () => {
    const token = newApiToken();
    expect(token).toMatch(API_TOKEN_PATTERN);
    expect(token).toMatch(/^sfi_\w+$/);
    expect(newApiToken()).not.toBe(token);
    expect(sha256("abc")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });
});
