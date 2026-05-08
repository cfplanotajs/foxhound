import test from "node:test";
import assert from "node:assert/strict";
import { GET } from "../app/api/jobs/[jobId]/template/route.ts";
import { prisma } from "../lib/db.ts";

test("job template route returns safe duplicate/rerun fields", async () => {
  const origJob = prisma.generationJob.findUnique;
  const origPreset = prisma.preset.findUnique;
  (prisma.generationJob as any).findUnique = async () => ({
    id: "j1",
    status: "completed",
    provider: "mock",
    model: "mock-v1",
    tasks: [{ presetId: "p1", presetName: "Preset", presetVersion: "v1", subjectPrompt: "cat", constraints: null, requestPayloadJson: JSON.stringify({ providerPayload: { aspectRatio: "1:1", variationCount: 2, quality: "high", size: "1024x1024" } }) }]
  });
  (prisma.preset as any).findUnique = async () => ({ stableKey: "p1", isArchived: false });
  const res = await GET(new Request("http://x"), { params: Promise.resolve({ jobId: "j1" }) });
  const data = await res.json();
  assert.equal(data.template.jobId, "j1");
  assert.equal(data.template.variationCount, 2);
  assert.equal("outputPath" in data.template, false);
  (prisma.generationJob as any).findUnique = origJob;
  (prisma.preset as any).findUnique = origPreset;
});
