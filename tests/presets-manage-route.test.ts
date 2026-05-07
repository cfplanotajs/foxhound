import test from "node:test";
import assert from "node:assert/strict";
import { GET, POST } from "../app/api/presets/manage/route.ts";
import { prisma } from "../lib/db.ts";

test("manage GET returns stableKey for active and archived lists", async () => {
  const orig = prisma.preset.findMany;
  (prisma.preset as any).findMany = async () => ([
    { stableKey: "a", name: "A", description: "", bestUseLabel: null, isArchived: false, versions: [{ version: "v1", stylePrompt: "s", defaultProvider: "openai", defaultModel: "gpt-image-2", defaultParamsJson: "{}", samplePrompt: null }] },
    { stableKey: "b", name: "B", description: "", bestUseLabel: null, isArchived: true, versions: [{ version: "v1", stylePrompt: "s", defaultProvider: "openai", defaultModel: "gpt-image-2", defaultParamsJson: "{}", samplePrompt: null }] }
  ]);
  const res = await GET();
  const data = await res.json();
  assert.equal(data.active[0].stableKey, "a");
  assert.equal(data.archived[0].stableKey, "b");
  (prisma.preset as any).findMany = orig;
});

test("archive action requires stableKey and updates archive flag", async () => {
  const orig = prisma.preset.update;
  let received: any = null;
  (prisma.preset as any).update = async (args: any) => {
    received = args;
    return {};
  };
  const bad = await POST(new Request("http://x", { method: "POST", body: JSON.stringify({ action: "archive", isArchived: true }) }));
  assert.equal(bad.status, 400);
  const good = await POST(new Request("http://x", { method: "POST", body: JSON.stringify({ action: "archive", stableKey: "abc", isArchived: true }) }));
  assert.equal(good.status, 200);
  assert.equal(received.where.stableKey, "abc");
  (prisma.preset as any).update = orig;
});
