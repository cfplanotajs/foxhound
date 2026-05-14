import test from "node:test";
import assert from "node:assert/strict";
import { GET, POST } from "../app/api/presets/manage/route.ts";
import { getNextPresetVersionTag, parsePresetVersionNumber } from "../lib/presets/version-tags.ts";
import { prisma } from "../lib/db.ts";
import { hashPresetContent } from "../lib/presets.ts";





test("parsePresetVersionNumber parses only valid numeric tags", () => {
  assert.equal(parsePresetVersionNumber("v1"), 1);
  assert.equal(parsePresetVersionNumber("v10"), 10);
  assert.equal(parsePresetVersionNumber(" v2 "), 2);
  assert.equal(parsePresetVersionNumber("v"), null);
  assert.equal(parsePresetVersionNumber("vx"), null);
  assert.equal(parsePresetVersionNumber("1"), null);
});

test("getNextPresetVersionTag computes next tag from highest numeric version", () => {
  assert.equal(getNextPresetVersionTag([]), "v1");
  assert.equal(getNextPresetVersionTag([{ version: "v1" }, { version: "v2" }]), "v3");
  assert.equal(getNextPresetVersionTag([{ version: "v1" }, { version: "v2" }, { version: "v10" }]), "v11");
  assert.equal(getNextPresetVersionTag([{ version: "v2" }, { version: "bad-tag" }]), "v3");
});

test("manage POST returns 400 for malformed JSON body", async () => {
  const res = await POST(new Request("http://x", { method: "POST", body: "{bad", headers: { "content-type": "application/json" } }));
  assert.equal(res.status, 400);
  assert.equal((await res.json()).error, "Malformed JSON request body.");
});
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

test("archive action requires stableKey and strict boolean isArchived", async () => {
  const orig = prisma.preset.update;
  const received: any[] = [];
  (prisma.preset as any).update = async (args: any) => {
    received.push(args);
    return {};
  };

  const missingKey = await POST(new Request("http://x", { method: "POST", body: JSON.stringify({ action: "archive", isArchived: true }) }));
  assert.equal(missingKey.status, 400);

  const setTrue = await POST(new Request("http://x", { method: "POST", body: JSON.stringify({ action: "archive", stableKey: "abc", isArchived: true }) }));
  assert.equal(setTrue.status, 200);
  assert.equal(received[0].where.stableKey, "abc");
  assert.equal(received[0].data.isArchived, true);

  const setFalse = await POST(new Request("http://x", { method: "POST", body: JSON.stringify({ action: "archive", stableKey: "abc", isArchived: false }) }));
  assert.equal(setFalse.status, 200);
  assert.equal(received[1].data.isArchived, false);

  for (const invalidValue of ["false", "true", 1, undefined]) {
    const payload: any = { action: "archive", stableKey: "abc" };
    if (invalidValue !== undefined) payload.isArchived = invalidValue;
    const res = await POST(new Request("http://x", { method: "POST", body: JSON.stringify(payload) }));
    assert.equal(res.status, 400);
    assert.equal((await res.json()).error, "isArchived must be a boolean.");
  }

  assert.equal(received.length, 2);
  (prisma.preset as any).update = orig;
});

test("edit ignores client contentHash and persists metadata without creating duplicate version for unchanged content", async () => {
  const origFindUnique = prisma.preset.findUnique;
  const origUpdate = prisma.preset.update;
  const origTransaction = prisma.$transaction;
  const origVersionCreate = prisma.presetVersion.create;
  const updateCalls: any[] = [];
  let versionCreateCalls = 0;
  (prisma.preset as any).findUnique = async () => ({
    id: "p1",
    stableKey: "k1",
    versions: [{ version: "v1", contentHash: hashPresetContent({ stylePrompt: "Style", defaultProvider: "openai", defaultModel: "gpt-image-2", defaultParams: {}, samplePrompt: null }) }]
  });
  (prisma.preset as any).update = async (args: any) => {
    updateCalls.push(args);
    return {};
  };
  (prisma.presetVersion as any).create = async () => {
    versionCreateCalls += 1;
    return { version: "v2" };
  };
  (prisma as any).$transaction = async (fn: any) => fn(prisma);
  const res = await POST(
    new Request("http://x", {
      method: "POST",
      body: JSON.stringify({
        action: "edit",
        stableKey: "k1",
        name: "Preset renamed",
        description: "new desc",
        bestUseLabel: "label",
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
  assert.equal(updateCalls.length, 1);
  assert.equal(updateCalls[0].data.name, "Preset renamed");
  assert.equal(updateCalls[0].data.description, "new desc");
  assert.equal(updateCalls[0].data.bestUseLabel, "label");
  assert.equal(versionCreateCalls, 0);
  (prisma.preset as any).findUnique = origFindUnique;
  (prisma.preset as any).update = origUpdate;
  (prisma as any).$transaction = origTransaction;
  (prisma.presetVersion as any).create = origVersionCreate;
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

test("create rejects incompatible default size for selected model", async () => {
  const res = await POST(new Request("http://x", {
    method: "POST",
    body: JSON.stringify({ action: "create", stableKey: "badsize", name: "Preset", stylePrompt: "Style", defaultProvider: "openai", defaultModel: "dall-e-3", defaultParams: { size: "1536x1024" } })
  }));
  assert.equal(res.status, 400);
  assert.equal((await res.json()).error, "Size 1536x1024 is not supported by model dall-e-3.");
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
  const origTransaction = prisma.$transaction;
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
  (prisma as any).$transaction = origTransaction;
});

test("edit rejects incompatible default size and creates no version", async () => {
  const origFindUnique = prisma.preset.findUnique;
  let updated = false;
  (prisma.preset as any).findUnique = async () => ({ id: "p1", stableKey: "k1", versions: [{ version: "v1", contentHash: "old" }] });
  const origTransaction = prisma.$transaction;
  (prisma as any).$transaction = async () => { updated = true; };
  const res = await POST(new Request("http://x", {
    method: "POST",
    body: JSON.stringify({ action: "edit", stableKey: "k1", name: "Preset", stylePrompt: "Style", defaultProvider: "openai", defaultModel: "dall-e-3", defaultParams: { size: "1536x1024" } })
  }));
  assert.equal(res.status, 400);
  assert.equal((await res.json()).error, "Size 1536x1024 is not supported by model dall-e-3.");
  assert.equal(updated, false);
  (prisma.preset as any).findUnique = origFindUnique;
  (prisma as any).$transaction = origTransaction;
});


test("edit retries on version collision and succeeds", async () => {
  const origFindUnique = prisma.preset.findUnique;
  const origPresetUpdate = prisma.preset.update;
  const origTransaction = prisma.$transaction;
  const origFindMany = prisma.presetVersion.findMany;
  const origVersionCreate = prisma.presetVersion.create;
  const origFindContent = prisma.presetVersion.findUnique;
  let createCalls = 0;
  (prisma.preset as any).findUnique = async () => ({ id: "p1", stableKey: "k1", versions: [{ version: "v1", contentHash: "old" }] });
  (prisma.preset as any).update = async () => ({});
  (prisma as any).$transaction = async (fn: any) => fn(prisma);
  (prisma.presetVersion as any).findMany = async () => (createCalls === 0 ? [{ version: "v1" }] : [{ version: "v1" }, { version: "v2" }]);
  (prisma.presetVersion as any).findUnique = async () => null;
  (prisma.presetVersion as any).create = async () => {
    createCalls += 1;
    if (createCalls === 1) throw Object.assign(new Error("collision"), { code: "P2002" });
    return { version: "v3" };
  };
  const res = await POST(new Request("http://x", { method: "POST", body: JSON.stringify({ action: "edit", stableKey: "k1", name: "Preset", stylePrompt: "Style new", defaultProvider: "openai", defaultModel: "gpt-image-2", defaultParams: {} }) }));
  assert.equal(res.status, 200);
  assert.equal((await res.json()).version, "v3");
  (prisma.preset as any).findUnique = origFindUnique;
  (prisma.preset as any).update = origPresetUpdate;
  (prisma as any).$transaction = origTransaction;
  (prisma.presetVersion as any).findMany = origFindMany;
  (prisma.presetVersion as any).create = origVersionCreate;
  (prisma.presetVersion as any).findUnique = origFindContent;
});

test("edit returns 500 after repeated version collisions", async () => {
  const origFindUnique = prisma.preset.findUnique;
  const origPresetUpdate = prisma.preset.update;
  const origTransaction = prisma.$transaction;
  const origFindMany = prisma.presetVersion.findMany;
  const origVersionCreate = prisma.presetVersion.create;
  const origFindContent = prisma.presetVersion.findUnique;
  (prisma.preset as any).findUnique = async () => ({ id: "p1", stableKey: "k1", versions: [{ version: "v1", contentHash: "old" }] });
  (prisma.preset as any).update = async () => ({});
  (prisma as any).$transaction = async (fn: any) => fn(prisma);
  (prisma.presetVersion as any).findMany = async () => ([{ version: "v1" }]);
  (prisma.presetVersion as any).findUnique = async () => null;
  (prisma.presetVersion as any).create = async () => { throw Object.assign(new Error("collision"), { code: "P2002" }); };
  const res = await POST(new Request("http://x", { method: "POST", body: JSON.stringify({ action: "edit", stableKey: "k1", name: "Preset", stylePrompt: "Style new", defaultProvider: "openai", defaultModel: "gpt-image-2", defaultParams: {} }) }));
  assert.equal(res.status, 500);
  (prisma.preset as any).findUnique = origFindUnique;
  (prisma.preset as any).update = origPresetUpdate;
  (prisma as any).$transaction = origTransaction;
  (prisma.presetVersion as any).findMany = origFindMany;
  (prisma.presetVersion as any).create = origVersionCreate;
  (prisma.presetVersion as any).findUnique = origFindContent;
});

test("edit keeps metadata unchanged when version creation fails inside transaction", async () => {
  const origFindUnique = prisma.preset.findUnique;
  const origTransaction = prisma.$transaction;
  let metadataUpdated = false;
  (prisma.preset as any).findUnique = async () => ({ id: "p1", stableKey: "k1", versions: [{ version: "v1", contentHash: "old" }] });
  (prisma as any).$transaction = async (fn: any) => {
    const tx = {
      preset: {
        update: async () => {
          metadataUpdated = true;
          return {};
        }
      },
      presetVersion: {
        findMany: async () => ([{ version: "v1" }]),
        findUnique: async () => null,
        create: async () => {
          throw Object.assign(new Error("collision"), { code: "P2002" });
        }
      }
    };
    try {
      return await fn(tx);
    } catch {
      metadataUpdated = false;
      throw new Error("tx rolled back");
    }
  };

  const res = await POST(new Request("http://x", { method: "POST", body: JSON.stringify({ action: "edit", stableKey: "k1", name: "Preset New", stylePrompt: "Style new", defaultProvider: "openai", defaultModel: "gpt-image-2", defaultParams: {} }) }));
  assert.equal(res.status, 500);
  assert.equal(metadataUpdated, false);
  (prisma.preset as any).findUnique = origFindUnique;
  (prisma as any).$transaction = origTransaction;
});
