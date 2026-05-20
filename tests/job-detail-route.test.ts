import test from "node:test";
import assert from "node:assert/strict";
import { GET } from "../app/api/jobs/[jobId]/route.ts";
import { prisma } from "../lib/db.ts";

test("job detail route returns 404 for missing job", async () => {
  const orig = prisma.generationJob.findUnique;
  (prisma.generationJob as any).findUnique = async () => null;
  const res = await GET(new Request("http://x"), { params: Promise.resolve({ jobId: "j1" }) });
  assert.equal(res.status, 404);
  assert.equal((await res.json()).error, "Not found");
  (prisma.generationJob as any).findUnique = orig;
});

test("job detail route returns sanitized task DTOs", async () => {
  const orig = prisma.generationJob.findUnique;
  (prisma.generationJob as any).findUnique = async () => ({
    id: "j1",
    status: "completed",
    mode: "edit",
    provider: "openai",
    model: "gpt-image-2",
    sourceJobId: "j0",
    sourceTaskId: "t0",
    editInstruction: "white bg",
    projectId: null,
    folderId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    completedAt: new Date(),
    tasks: [{
      id: "t1", jobId: "j1", status: "completed", subjectPrompt: "cat", finalPrompt: "f", presetName: "p", presetVersion: "v1", provider: "openai", model: "gpt-image-2",
      errorMessage: null, responseMetadataJson: null, requestPayloadJson: JSON.stringify({ metadata: { mode: "edit", sourceTaskId: "t0", sourceJobId: "j0", editInstruction: "white bg" } }),
      createdAt: new Date(), completedAt: new Date(), outputPath: "/private/path.png", reviewStatus: "approved"
    }]
  });
  const res = await GET(new Request("http://x"), { params: Promise.resolve({ jobId: "j1" }) });
  assert.equal(res.status, 200);
  const data = await res.json();
  const task = data.job.tasks[0];
  assert.equal(task.imageUrl, "/api/images/j1/t1");
  assert.equal(task.mode, "edit");
  assert.equal(task.sourceTaskId, "t0");
  assert.equal(task.sourceJobId, "j0");
  assert.equal(task.editInstruction, "white bg");
  assert.equal("outputPath" in task, false);
  assert.equal("requestPayloadJson" in task, false);
  assert.equal("responseMetadataJson" in task, false);
  (prisma.generationJob as any).findUnique = orig;
});

