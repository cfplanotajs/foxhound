import test from "node:test";
import assert from "node:assert/strict";
import { createJobAndTasksAtomic } from "../lib/jobs/create-job.ts";

test("job and tasks creation uses one atomic transaction", async () => {
  let txCalled = false;
  const db = {
    async $transaction(fn: (tx: any) => Promise<any>) {
      txCalled = true;
      return fn({
        generationJob: { create: async () => ({ id: "job1" }) },
        generationTask: { createMany: async () => ({ count: 1 }) }
      });
    }
  };
  const job = await createJobAndTasksAtomic(db as never, { jobData: { status: "queued" }, taskData: [{ status: "queued" }] });
  assert.equal(txCalled, true);
  assert.equal(job.id, "job1");
});

test("task creation failure bubbles and does not return orphan job", async () => {
  const db = {
    async $transaction(fn: (tx: any) => Promise<any>) {
      return fn({
        generationJob: { create: async () => ({ id: "job1" }) },
        generationTask: { createMany: async () => { throw new Error("task create failed"); } }
      });
    }
  };
  await assert.rejects(() => createJobAndTasksAtomic(db as never, { jobData: { status: "queued" }, taskData: [{ status: "queued" }] }), /task create failed/);
});
