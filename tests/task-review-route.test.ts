import test from "node:test";
import assert from "node:assert/strict";
import { POST } from "../app/api/tasks/[taskId]/review/route.ts";
import { prisma } from "../lib/db.ts";

test("review route rejects invalid status", async () => {
  const res = await POST(new Request("http://x", { method: "POST", body: JSON.stringify({ reviewStatus: "bad" }) }), { params: Promise.resolve({ taskId: "t1" }) });
  assert.equal(res.status, 400);
});

test("review route updates valid status", async () => {
  const orig = prisma.generationTask.update;
  (prisma.generationTask as any).update = async ({ data }: any) => ({
    id: "t1", jobId: "j1", status: "completed", subjectPrompt: "p", finalPrompt: "f", presetName: "n", presetVersion: "v1", provider: "mock", model: "mock-v1", errorMessage: null, responseMetadataJson: null, createdAt: new Date(), completedAt: null, outputPath: null, reviewStatus: data.reviewStatus
  });
  const res = await POST(new Request("http://x", { method: "POST", body: JSON.stringify({ reviewStatus: "favorite" }) }), { params: Promise.resolve({ taskId: "t1" }) });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.task.reviewStatus, "favorite");
  (prisma.generationTask as any).update = orig;
});
