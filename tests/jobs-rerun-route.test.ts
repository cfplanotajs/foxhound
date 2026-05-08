import test from "node:test";
import assert from "node:assert/strict";
import { POST } from "../app/api/jobs/[jobId]/rerun/route.ts";
import { prisma } from "../lib/db.ts";

test("rerun creates a new job from source job id", async () => {
  const origFind = prisma.generationJob.findUnique;
  const origPresetFind = prisma.preset.findUnique;
  const origTx = (prisma as any).$transaction;
  let createdTaskData: any[] = [];
  (prisma.generationJob as any).findUnique = async () => ({
    id: "j1",
    provider: "mock",
    model: "mock-v1",
    tasks: [{ presetId: "p1", presetName: "Preset", presetVersion: "v1", stylePromptSnapshot: "s", subjectPrompt: "cat", finalPrompt: "f", constraints: null, provider: "mock", model: "mock-v1", maxAttempts: 3, defaultProviderSnapshot: "mock", defaultModelSnapshot: "mock-v1", defaultParamsJsonSnapshot: "{}", requestPayloadJson: "{}", presetVersionId: null }]
  });
  (prisma.preset as any).findUnique = async () => ({ stableKey: "p1", isArchived: false });
  (prisma as any).$transaction = async (fn: any) => fn({ generationJob: { create: async () => ({ id: "new1" }) }, generationTask: { createMany: async ({ data }: any) => { createdTaskData = data; return { count: 1 }; } } });
  const res = await POST(new Request("http://x", { method: "POST" }), { params: Promise.resolve({ jobId: "j1" }) });
  const data = await res.json();
  assert.equal(data.jobId, "new1");
  assert.equal(createdTaskData[0].requestPayloadJson.includes("providerPayload"), true);
  (prisma.generationJob as any).findUnique = origFind;
  (prisma as any).$transaction = origTx;
  (prisma.preset as any).findUnique = origPresetFind;
});
