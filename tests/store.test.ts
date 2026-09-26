import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { JsonInviteStore } from "@/lib/store/json";
import { fromRow, toRow } from "@/lib/store/supabase";
import type { Invite } from "@/lib/types";

const base: Invite = {
  code: "SM-TEST1",
  deviceId: "dev-1",
  monkId: "m1",
  serviceId: "house_blessing",
  date: "2026-10-03",
  slot: "morning",
  mode: "monk_comes",
  area: "nimman",
  language: "en",
  donation: 1000,
  status: "pending",
  createdAt: "2026-09-26T10:00:00.000Z",
  updatedAt: "2026-09-26T10:00:00.000Z",
};

const tmpFile = () => path.join(mkdtempSync(path.join(tmpdir(), "sm-")), "invites.json");

describe("JsonInviteStore", () => {
  it("persists across instances (i.e. dev restarts)", async () => {
    const file = tmpFile();
    await new JsonInviteStore(file).create(base);
    const again = new JsonInviteStore(file);
    expect(await again.get("SM-TEST1")).toEqual(base);
    expect(await again.get("nope")).toBeNull();
  });

  it("filters by device and lists newest first", async () => {
    const s = new JsonInviteStore(tmpFile());
    await s.create(base);
    await s.create({ ...base, code: "SM-TEST2", createdAt: "2026-09-26T11:00:00.000Z" });
    await s.create({ ...base, code: "SM-OTHER", deviceId: "dev-2" });
    expect((await s.listByDevice("dev-1")).map((i) => i.code)).toEqual(["SM-TEST2", "SM-TEST1"]);
    expect(await s.listAll()).toHaveLength(3);
  });

  it("updates status and rejects duplicate codes", async () => {
    const s = new JsonInviteStore(tmpFile());
    await s.create(base);
    await expect(s.create(base)).rejects.toThrow(/duplicate/);
    const updated = await s.setStatus("SM-TEST1", "accepted");
    expect(updated?.status).toBe("accepted");
    expect(updated?.updatedAt).not.toBe(base.updatedAt);
    expect(await s.setStatus("missing", "accepted")).toBeNull();
  });

  it("does not lose writes made concurrently", async () => {
    const s = new JsonInviteStore(tmpFile());
    await Promise.all(Array.from({ length: 10 }, (_, n) => s.create({ ...base, code: `SM-C${n}` })));
    expect(await s.listAll()).toHaveLength(10);
  });
});

describe("supabase row mapping", () => {
  it("round-trips an invite", () => {
    const full: Invite = { ...base, address: "Nimman Soi 7", guests: 4, userId: null, note: "gate code 12" };
    expect(fromRow(toRow(full))).toEqual(full);
    expect(fromRow(toRow(base))).toEqual({ ...base, userId: null });
  });
});

describe("JsonInviteStore across instances", () => {
  it("serialises writes from two instances on the same file", async () => {
    const file = tmpFile();
    const a = new JsonInviteStore(file);
    const b = new JsonInviteStore(file);
    await Promise.all(
      Array.from({ length: 10 }, (_, n) => (n % 2 ? a : b).create({ ...base, code: `SM-X${n}` })),
    );
    expect(await a.listAll()).toHaveLength(10);
  });
});
