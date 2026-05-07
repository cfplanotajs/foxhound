import test from "node:test";
import assert from "node:assert/strict";
import { seedPresetsFromConfig } from "../lib/presets.ts";

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

