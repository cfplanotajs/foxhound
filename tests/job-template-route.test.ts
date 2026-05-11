import test from "node:test";
import assert from "node:assert/strict";
import { GET } from "../app/api/jobs/[jobId]/template/route.ts";
import { prisma } from "../lib/db.ts";

function withTemplateMocks(tasks: any[]) {
  const origJob = prisma.generationJob.findUnique;
  const origPreset = prisma.preset.findUnique;
  (prisma.generationJob as any).findUnique = async () => ({ id: "j1", status: "completed", provider: "mock", model: "mock-v1", tasks });
  (prisma.preset as any).findUnique = async () => ({ stableKey: "p1", isArchived: false });
  return () => {
    (prisma.generationJob as any).findUnique = origJob;
    (prisma.preset as any).findUnique = origPreset;
  };
}

test("variation duplicates are collapsed but original prompt order preserved", async () => {
  const restore = withTemplateMocks([
    { presetId: "p1", presetName: "Preset", presetVersion: "v1", subjectPrompt: "cat", constraints: null, requestPayloadJson: JSON.stringify({ metadata: { variationIndex: 1, variationCount: 2 }, providerPayload: { size: "1024x1024" } }) },
    { presetId: "p1", presetName: "Preset", presetVersion: "v1", subjectPrompt: "cat", constraints: null, requestPayloadJson: JSON.stringify({ metadata: { variationIndex: 2, variationCount: 2 }, providerPayload: { size: "1024x1024" } }) },
    { presetId: "p1", presetName: "Preset", presetVersion: "v1", subjectPrompt: "dog", constraints: null, requestPayloadJson: JSON.stringify({ metadata: { variationIndex: 1, variationCount: 2 }, providerPayload: { size: "1024x1024" } }) },
    { presetId: "p1", presetName: "Preset", presetVersion: "v1", subjectPrompt: "dog", constraints: null, requestPayloadJson: JSON.stringify({ metadata: { variationIndex: 2, variationCount: 2 }, providerPayload: { size: "1024x1024" } }) }
  ]);
  const res = await GET(new Request("http://x"), { params: Promise.resolve({ jobId: "j1" }) });
  const data = await res.json();
  assert.deepEqual(data.template.promptLines, ["cat", "dog"]);
  assert.equal("outputPath" in data.template, false);
  restore();
});

test("intentional duplicate prompt lines are preserved", async () => {
  const restore = withTemplateMocks([
    { presetId: "p1", presetName: "Preset", presetVersion: "v1", subjectPrompt: "cat", constraints: null, requestPayloadJson: JSON.stringify({ metadata: { variationIndex: 1, variationCount: 1 }, providerPayload: { size: "1024x1024" } }) },
    { presetId: "p1", presetName: "Preset", presetVersion: "v1", subjectPrompt: "cat", constraints: null, requestPayloadJson: JSON.stringify({ metadata: { variationIndex: 1, variationCount: 1 }, providerPayload: { size: "1024x1024" } }) },
    { presetId: "p1", presetName: "Preset", presetVersion: "v1", subjectPrompt: "dog", constraints: null, requestPayloadJson: JSON.stringify({ metadata: { variationIndex: 1, variationCount: 1 }, providerPayload: { size: "1024x1024" } }) }
  ]);
  const res = await GET(new Request("http://x"), { params: Promise.resolve({ jobId: "j1" }) });
  const data = await res.json();
  assert.deepEqual(data.template.promptLines, ["cat", "cat", "dog"]);
  restore();
});

test("template does not invent 1:1 when ratio metadata is missing and size is unknown", async () => {
  const restore = withTemplateMocks([
    { presetId: "p1", presetName: "Preset", presetVersion: "v1", subjectPrompt: "cat", constraints: null, requestPayloadJson: JSON.stringify({ taskParams: { quality: "high" }, providerPayload: {}, metadata: {} }) }
  ]);
  const res = await GET(new Request("http://x"), { params: Promise.resolve({ jobId: "j1" }) });
  const data = await res.json();
  assert.equal(data.template.aspectRatio, null);
  restore();
});



test("intentional duplicate lines are preserved while variation duplicates collapse", async () => {
  const restore = withTemplateMocks([
    { presetId: "p1", presetName: "Preset", presetVersion: "v1", subjectPrompt: "cat", constraints: null, requestPayloadJson: JSON.stringify({ metadata: { variationIndex: 1, variationCount: 4 }, providerPayload: { size: "1024x1024" } }) },
    { presetId: "p1", presetName: "Preset", presetVersion: "v1", subjectPrompt: "cat", constraints: null, requestPayloadJson: JSON.stringify({ metadata: { variationIndex: 2, variationCount: 4 }, providerPayload: { size: "1024x1024" } }) },
    { presetId: "p1", presetName: "Preset", presetVersion: "v1", subjectPrompt: "cat", constraints: null, requestPayloadJson: JSON.stringify({ metadata: { variationIndex: 1, variationCount: 4 }, providerPayload: { size: "1024x1024" } }) },
    { presetId: "p1", presetName: "Preset", presetVersion: "v1", subjectPrompt: "cat", constraints: null, requestPayloadJson: JSON.stringify({ metadata: { variationIndex: 3, variationCount: 4 }, providerPayload: { size: "1024x1024" } }) },
    { presetId: "p1", presetName: "Preset", presetVersion: "v1", subjectPrompt: "dog", constraints: null, requestPayloadJson: JSON.stringify({ metadata: { variationIndex: 1, variationCount: 4 }, providerPayload: { size: "1024x1024" } }) },
    { presetId: "p1", presetName: "Preset", presetVersion: "v1", subjectPrompt: "dog", constraints: null, requestPayloadJson: JSON.stringify({ metadata: { variationIndex: 2, variationCount: 4 }, providerPayload: { size: "1024x1024" } }) }
  ]);
  const res = await GET(new Request("http://x"), { params: Promise.resolve({ jobId: "j1" }) });
  const data = await res.json();
  assert.deepEqual(data.template.promptLines, ["cat", "cat", "dog"]);
  restore();
});

test("legacy tasks without variation metadata keep prompts in order", async () => {
  const restore = withTemplateMocks([
    { presetId: "p1", presetName: "Preset", presetVersion: "v1", subjectPrompt: "cat", constraints: null, requestPayloadJson: JSON.stringify({ providerPayload: { size: "1024x1024" } }) },
    { presetId: "p1", presetName: "Preset", presetVersion: "v1", subjectPrompt: "cat", constraints: null, requestPayloadJson: JSON.stringify({ providerPayload: { size: "1024x1024" } }) },
    { presetId: "p1", presetName: "Preset", presetVersion: "v1", subjectPrompt: "dog", constraints: null, requestPayloadJson: JSON.stringify({ providerPayload: { size: "1024x1024" } }) }
  ]);
  const res = await GET(new Request("http://x"), { params: Promise.resolve({ jobId: "j1" }) });
  const data = await res.json();
  assert.deepEqual(data.template.promptLines, ["cat", "cat", "dog"]);
  restore();
});
