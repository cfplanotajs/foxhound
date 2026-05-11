import test from "node:test";
import assert from "node:assert/strict";
import { GET, POST } from "../app/api/presets/manage/route.ts";
import { prisma } from "../lib/db.ts";
import { hashPresetContent } from "../lib/presets.ts";

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

test("edit ignores client contentHash and does not create duplicate version for unchanged content", async () => {
  const origFindUnique = prisma.preset.findUnique;
  const origUpdate = prisma.preset.update;
  let updated = false;
  (prisma.preset as any).findUnique = async () => ({
    id: "p1",
    stableKey: "k1",
    versions: [{ version: "v1", contentHash: hashPresetContent({ stylePrompt: "Style", defaultProvider: "openai", defaultModel: "gpt-image-2", defaultParams: {}, samplePrompt: null }) }]
  });
  (prisma.preset as any).update = async () => {
    updated = true;
    return {};
  };
  const res = await POST(
    new Request("http://x", {
      method: "POST",
      body: JSON.stringify({
        action: "edit",
        stableKey: "k1",
        name: "Preset",
        stylePrompt: "Style",
        defaultProvider: "openai",
        defaultModel: "gpt-image-2",
        defaultParams: {},
        samplePrompt: null,
        contentHash: "bogus-client-hash"
      })
    })
  );
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.noChange, true);
  assert.equal(updated, false);
  (prisma.preset as any).findUnique = origFindUnique;
  (prisma.preset as any).update = origUpdate;
});

test("duplicate uses deterministic contentHash derived from content", async () => {
  const origFindUnique = prisma.preset.findUnique;
  const origCreate = prisma.preset.create;
  let createdArgs: any = null;
  (prisma.preset as any).findUnique = async () => ({
    id: "src1",
    stableKey: "source",
    description: "desc",
    bestUseLabel: null,
    versions: [{
      version: "v3",
      stylePrompt: "Style",
      defaultProvider: "openai",
      defaultModel: "gpt-image-2",
      defaultParamsJson: JSON.stringify({ size: "1536x1024" }),
      samplePrompt: null,
      contentHash: "old-hash"
    }]
  });
  (prisma.preset as any).create = async (args: any) => {
    createdArgs = args;
    return { id: "new1" };
  };

  const res = await POST(new Request("http://x", {
    method: "POST",
    body: JSON.stringify({ action: "duplicate", stableKey: "source", newStableKey: "copy", newName: "Copy" })
  }));
  assert.equal(res.status, 200);

  const expectedHash = hashPresetContent({
    stylePrompt: "Style",
    defaultProvider: "openai",
    defaultModel: "gpt-image-2",
    defaultParams: { size: "1536x1024" },
    samplePrompt: null
  });
  assert.equal(createdArgs.data.versions.create.contentHash, expectedHash);

  (prisma.preset as any).findUnique = origFindUnique;
  (prisma.preset as any).create = origCreate;
});


test("create requires stableKey", async () => {
  const res = await POST(new Request("http://x", {
    method: "POST",
    body: JSON.stringify({ action: "create", name: "Preset", stylePrompt: "Style", defaultProvider: "openai", defaultModel: "gpt-image-2", defaultParams: {} })
  }));
  assert.equal(res.status, 400);
  const data = await res.json();
  assert.equal(data.error, "Preset stableKey is required.");
});

test("create rejects invalid stableKey characters", async () => {
  const res = await POST(new Request("http://x", {
    method: "POST",
    body: JSON.stringify({ action: "create", stableKey: "Bad Key!", name: "Preset", stylePrompt: "Style", defaultProvider: "openai", defaultModel: "gpt-image-2", defaultParams: {} })
  }));
  assert.equal(res.status, 400);
  const data = await res.json();
  assert.equal(data.error, "Preset stableKey must use only lowercase letters, numbers, hyphens, or underscores.");
});

test("create trims and saves valid stableKey", async () => {
  const origCreate = prisma.preset.create;
  let createdArgs: any = null;
  (prisma.preset as any).create = async (args: any) => {
    createdArgs = args;
    return { id: "p-new" };
  };
  const res = await POST(new Request("http://x", {
    method: "POST",
    body: JSON.stringify({ action: "create", stableKey: "  valid_key-1  ", name: "Preset", stylePrompt: "Style", defaultProvider: "openai", defaultModel: "gpt-image-2", defaultParams: {} })
  }));
  assert.equal(res.status, 200);
  assert.equal(createdArgs.data.stableKey, "valid_key-1");
  (prisma.preset as any).create = origCreate;
});

test("create returns clear error on stableKey conflict", async () => {
  const origCreate = prisma.preset.create;
  (prisma.preset as any).create = async () => { throw new Error("Unique constraint failed on the fields: (`stableKey`)"); };
  const res = await POST(new Request("http://x", {
    method: "POST",
    body: JSON.stringify({ action: "create", stableKey: "dupe_key", name: "Preset", stylePrompt: "Style", defaultProvider: "openai", defaultModel: "gpt-image-2", defaultParams: {} })
  }));
  assert.equal(res.status, 400);
  const data = await res.json();
  assert.equal(data.error, "Preset stableKey already exists.");
  (prisma.preset as any).create = origCreate;
});


test("create normalizes compatible quality for dall-e-3", async () => {
  const origCreate = prisma.preset.create;
  let createdArgs: any = null;
  (prisma.preset as any).create = async (args: any) => { createdArgs = args; return { id: "p3" }; };
  const res = await POST(new Request("http://x", {
    method: "POST",
    body: JSON.stringify({ action: "create", stableKey: "de3", name: "Preset", stylePrompt: "Style", defaultProvider: "openai", defaultModel: "dall-e-3", defaultParams: { quality: "standard" } })
  }));
  assert.equal(res.status, 200);
  const params = JSON.parse(createdArgs.data.versions.create.defaultParamsJson);
  assert.equal(params.quality, "standard");
  (prisma.preset as any).create = origCreate;
});

test("create rejects incompatible quality for selected model", async () => {
  const res = await POST(new Request("http://x", {
    method: "POST",
    body: JSON.stringify({ action: "create", stableKey: "badq", name: "Preset", stylePrompt: "Style", defaultProvider: "openai", defaultModel: "dall-e-3", defaultParams: { quality: "high" } })
  }));
  assert.equal(res.status, 400);
  const data = await res.json();
  assert.equal(data.error, "Quality high is not supported for model dall-e-3.");
});

test("create supports mock quality path", async () => {
  const origCreate = prisma.preset.create;
  let createdArgs: any = null;
  (prisma.preset as any).create = async (args: any) => { createdArgs = args; return { id: "mock1" }; };
  const res = await POST(new Request("http://x", {
    method: "POST",
    body: JSON.stringify({ action: "create", stableKey: "mock_key", name: "Preset", stylePrompt: "Style", defaultProvider: "mock", defaultModel: "mock-v1", defaultParams: { quality: "high" } })
  }));
  assert.equal(res.status, 200);
  const params = JSON.parse(createdArgs.data.versions.create.defaultParamsJson);
  assert.equal(params.quality, "high");
  (prisma.preset as any).create = origCreate;
});


test("duplicate validates newStableKey and newName before source lookup", async () => {
  const origFindUnique = prisma.preset.findUnique;
  let lookupCalls = 0;
  (prisma.preset as any).findUnique = async () => { lookupCalls += 1; return null; };

  const missingKey = await POST(new Request("http://x", { method: "POST", body: JSON.stringify({ action: "duplicate", stableKey: "source", newName: "Copy" }) }));
  assert.equal(missingKey.status, 400);
  assert.equal((await missingKey.json()).error, "Preset stableKey is required.");

  const invalidKey = await POST(new Request("http://x", { method: "POST", body: JSON.stringify({ action: "duplicate", stableKey: "source", newStableKey: "Bad Key!", newName: "Copy" }) }));
  assert.equal(invalidKey.status, 400);
  assert.equal((await invalidKey.json()).error, "Preset stableKey must use only lowercase letters, numbers, hyphens, or underscores.");

  const missingName = await POST(new Request("http://x", { method: "POST", body: JSON.stringify({ action: "duplicate", stableKey: "source", newStableKey: "copy_key", newName: "   " }) }));
  assert.equal(missingName.status, 400);
  assert.equal((await missingName.json()).error, "Preset name is required.");
  assert.equal(lookupCalls, 0);
  (prisma.preset as any).findUnique = origFindUnique;
});

test("duplicate returns clear stableKey conflict error", async () => {
  const origFindUnique = prisma.preset.findUnique;
  const origCreate = prisma.preset.create;
  (prisma.preset as any).findUnique = async () => ({
    id: "src1", stableKey: "source", description: "desc", bestUseLabel: null,
    versions: [{ version: "v1", stylePrompt: "Style", defaultProvider: "openai", defaultModel: "gpt-image-2", defaultParamsJson: "{}", samplePrompt: null }]
  });
  (prisma.preset as any).create = async () => { throw new Error("Unique constraint failed on the fields: (`stableKey`)"); };
  const res = await POST(new Request("http://x", { method: "POST", body: JSON.stringify({ action: "duplicate", stableKey: "source", newStableKey: "copy", newName: "Copy" }) }));
  assert.equal(res.status, 400);
  assert.equal((await res.json()).error, "Preset stableKey already exists.");
  (prisma.preset as any).findUnique = origFindUnique;
  (prisma.preset as any).create = origCreate;
});


test("edit rejects incompatible quality and creates no version", async () => {
  const origFindUnique = prisma.preset.findUnique;
  const origUpdate = prisma.preset.update;
  let updated = false;
  (prisma.preset as any).findUnique = async () => ({ id: "p1", stableKey: "k1", versions: [{ version: "v1", contentHash: "old" }] });
  (prisma.preset as any).update = async () => { updated = true; return {}; };
  const res = await POST(new Request("http://x", {
    method: "POST",
    body: JSON.stringify({ action: "edit", stableKey: "k1", name: "Preset", stylePrompt: "Style", defaultProvider: "openai", defaultModel: "dall-e-3", defaultParams: { quality: "high" } })
  }));
  assert.equal(res.status, 400);
  assert.equal((await res.json()).error, "Quality high is not supported for model dall-e-3.");
  assert.equal(updated, false);
  (prisma.preset as any).findUnique = origFindUnique;
  (prisma.preset as any).update = origUpdate;
});
