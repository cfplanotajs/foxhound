import test from "node:test";
import assert from "node:assert/strict";
import { getActivePresets, seedPresetsFromConfig } from "../lib/presets.ts";

test("seed upsert does not force archived presets back to active", async () => {
  const creates: Array<Record<string, unknown>> = [];
  const db: any = {
    preset: {
      findUnique: async () => ({ id: "p1", stableKey: "existing", name: "Custom", description: "Custom", bestUseLabel: "Custom", isArchived: true }),
      create: async ({ data }: any) => {
        creates.push(data);
        return { id: "p-new", ...data };
      }
    },
    presetVersion: {
      findUnique: async () => ({ id: "existing-version" }),
      findMany: async () => ([{ version: "v1" }]),
      create: async () => ({ id: "new-version" })
    }
  };

  await seedPresetsFromConfig(db);
  assert.equal(creates.length, 0);
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

test("seed creates missing preset with config metadata", async () => {
  let created: any = null;
  const db: any = {
    preset: {
      findUnique: async () => null,
      create: async ({ data }: any) => {
        created = data;
        return { id: "created-id", ...data };
      }
    },
    presetVersion: {
      findUnique: async () => ({ id: "existing-version" }),
      findMany: async () => [],
      create: async () => ({ id: "new-version" })
    }
  };
  await seedPresetsFromConfig(db);
  assert.equal(typeof created.stableKey, "string");
  assert.equal(typeof created.name, "string");
  assert.equal(typeof created.description, "string");
  assert.equal(created.isArchived, false);
});

test("seed does not overwrite existing managed metadata fields", async () => {
  let createCalls = 0;
  let updateCalls = 0;
  const existing = { id: "p1", stableKey: "character_closeup_clean", name: "Custom Name", description: "Custom Description", bestUseLabel: "Custom Label", isArchived: false };
  const db: any = {
    preset: {
      findUnique: async () => existing,
      create: async () => { createCalls += 1; return null; },
      update: async () => { updateCalls += 1; return null; }
    },
    presetVersion: {
      findUnique: async () => ({ id: "existing-version" }),
      findMany: async () => ([{ version: "v1" }]),
      create: async () => ({ id: "new-version" })
    }
  };
  await seedPresetsFromConfig(db);
  assert.equal(createCalls, 0);
  assert.equal(updateCalls, 0);
});
