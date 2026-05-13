import test from "node:test";
import assert from "node:assert/strict";
import { failClaimedJobTasks } from "../lib/jobs/processor.ts";
import { prisma } from "../lib/db.ts";

test("setup failure updates queued/processing and due failed retry tasks only", async () => {
  const origFindMany = prisma.generationTask.findMany;
  const origUpdate = prisma.generationTask.update;
  const origJobUpdate = prisma.generationJob.update;
  const tasks: any[] = [
    { id: "q", jobId: "j1", status: "queued", attempts: 0, maxAttempts: 3, nextAttemptAt: null },
    { id: "p", jobId: "j1", status: "processing", attempts: 0, maxAttempts: 3, nextAttemptAt: null },
    { id: "due", jobId: "j1", status: "failed", attempts: 0, maxAttempts: 3, nextAttemptAt: new Date(Date.now() - 1000) },
    { id: "future", jobId: "j1", status: "failed", attempts: 0, maxAttempts: 3, nextAttemptAt: new Date(Date.now() + 100000) },
    { id: "terminal", jobId: "j1", status: "failed", attempts: 3, maxAttempts: 3, nextAttemptAt: null }
  ];
  const updated = new Set<string>();
  (prisma.generationTask as any).findMany = async () => tasks;
  (prisma.generationTask as any).update = async ({ where, data }: any) => {
    updated.add(where.id);
    const t = tasks.find((x) => x.id === where.id);
    Object.assign(t, data);
    return t;
  };
  let jobStatus = "";
  (prisma.generationJob as any).update = async ({ data }: any) => {
    jobStatus = data.status;
    return {};
  };
  await failClaimedJobTasks("j1", new Error("OpenAI API key is missing"), console);
  assert.equal(updated.has("q"), true);
  assert.equal(updated.has("p"), true);
  assert.equal(updated.has("due"), true);
  assert.equal(updated.has("future"), false);
  assert.equal(updated.has("terminal"), false);
  assert.equal(jobStatus === "failed" || jobStatus === "queued" || jobStatus === "partial_failed", true);
  (prisma.generationTask as any).findMany = origFindMany;
  (prisma.generationTask as any).update = origUpdate;
  (prisma.generationJob as any).update = origJobUpdate;
});
