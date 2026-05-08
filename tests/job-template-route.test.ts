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

test("job template route returns safe duplicate/rerun fields", async () => {
  const restore = withTemplateMocks([
    { presetId: "p1", presetName: "Preset", presetVersion: "v1", subjectPrompt: "cat", constraints: null, requestPayloadJson: JSON.stringify({ providerPayload: { aspectRatio: "1:1", variationCount: 2, quality: "high", size: "1024x1024" } }) },
    { presetId: "p1", presetName: "Preset", presetVersion: "v1", subjectPrompt: "cat", constraints: null, requestPayloadJson: JSON.stringify({ providerPayload: { aspectRatio: "1:1", variationCount: 2, quality: "high", size: "1024x1024" } }) },
    { presetId: "p1", presetName: "Preset", presetVersion: "v1", subjectPrompt: "dog", constraints: null, requestPayloadJson: JSON.stringify({ providerPayload: { aspectRatio: "1:1", variationCount: 2, quality: "high", size: "1024x1024" } }) }
  ]);
  const res = await GET(new Request("http://x"), { params: Promise.resolve({ jobId: "j1" }) });
  const data = await res.json();
  assert.equal(data.template.jobId, "j1");
  assert.equal(data.template.variationCount, 2);
  assert.deepEqual(data.template.promptLines, ["cat", "dog"]);
  assert.equal("outputPath" in data.template, false);
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

test("template infers canonical ratio from stored non-square size", async () => {
  const restore = withTemplateMocks([
    { presetId: "p1", presetName: "Preset", presetVersion: "v1", subjectPrompt: "cat", constraints: null, requestPayloadJson: JSON.stringify({ taskParams: { size: "1536x1024" }, providerPayload: {}, metadata: {} }) }
  ]);
  const res = await GET(new Request("http://x"), { params: Promise.resolve({ jobId: "j1" }) });
  const data = await res.json();
  assert.equal(data.template.size, "1536x1024");
  assert.equal(data.template.aspectRatio, "3:2");
  assert.notEqual(data.template.aspectRatio, "1:1");
  restore();
});
