import test from "node:test";
import assert from "node:assert/strict";
import { hashPresetContent, upsertPresetVersionAtomic } from "../lib/presets.ts";

test("identical preset content yields identical hash", () => {
  const a = hashPresetContent({ stylePrompt: "s", defaultProvider: "openai", defaultModel: "gpt-image-2", defaultParams: { size: "1024x1024" } });
  const b = hashPresetContent({ stylePrompt: "s", defaultProvider: "openai", defaultModel: "gpt-image-2", defaultParams: { size: "1024x1024" } });
  assert.equal(a, b);
});

test("changed preset content yields different hash", () => {
  const a = hashPresetContent({ stylePrompt: "s1", defaultProvider: "openai", defaultModel: "gpt-image-2", defaultParams: {} });
  const b = hashPresetContent({ stylePrompt: "s2", defaultProvider: "openai", defaultModel: "gpt-image-2", defaultParams: {} });
  assert.notEqual(a, b);
});

test("duplicate-content race path (P2002) is safely handled", async () => {
  const created = { id: "pv1" };
  const db: any = {
    presetVersion: {
      findUnique: async ({ where }: any) => (where.presetId_contentHash.contentHash === "h1" && db._seen ? created : null),
      findMany: async () => ([{ version: "v1" }]),
      create: async () => {
        db._seen = true;
        const err = new Error("dup") as Error & { code?: string };
        err.code = "P2002";
        throw err;
      }
    },
    _seen: false
  };

  const out = await upsertPresetVersionAtomic(db, "p1", { stylePrompt: "x", defaultProvider: "openai", defaultModel: "m", defaultParamsJson: "{}", contentHash: "h1" });
  assert.equal(out.id, "pv1");
});
