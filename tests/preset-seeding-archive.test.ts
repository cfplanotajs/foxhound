import test from "node:test";
import assert from "node:assert/strict";
import { getActivePresets, seedPresetsFromConfig } from "../lib/presets.ts";

test("seed upsert does not force archived presets back to active", async () => {
  const updates: Array<Record<string, unknown>> = [];
  const db: any = {
    preset: {
      upsert: async ({ update }: any) => {
        updates.push(update);
        return { id: "p1" };
      }
    },
    presetVersion: {
      findUnique: async () => ({ id: "existing-version" }),
      findFirst: async () => ({ version: "v1" }),
      create: async () => ({ id: "new-version" })
    }
  };

  await seedPresetsFromConfig(db);
  assert.equal(updates.some((u) => Object.prototype.hasOwnProperty.call(u, "isArchived")), false);
});

test("active preset list excludes archived presets", async () => {
  const db: any = {
    preset: {
      findMany: async ({ where }: any) => ([
        { stableKey: "active", name: "A", description: "", bestUseLabel: null, isArchived: false, versions: [{ id: "v1", version: "v1", stylePrompt: "s", defaultProvider: "openai", defaultModel: "gpt-image-2", defaultParamsJson: "{}" }] },
        { stableKey: "archived", name: "B", description: "", bestUseLabel: null, isArchived: true, versions: [{ id: "v2", version: "v1", stylePrompt: "s", defaultProvider: "openai", defaultModel: "gpt-image-2", defaultParamsJson: "{}" }] }
      ].filter((p) => (where?.isArchived === false ? !p.isArchived : true)))
    }
  };
  const out = await getActivePresets(db);
  assert.equal(out.length, 1);
  assert.equal(out[0].stableKey, "active");
});
