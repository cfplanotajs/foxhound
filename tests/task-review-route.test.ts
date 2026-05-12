import test from "node:test";
import assert from "node:assert/strict";
import { Prisma } from "@prisma/client";
import { POST } from "../app/api/tasks/[taskId]/review/route.ts";
import { prisma } from "../lib/db.ts";

test("review route rejects invalid status", async () => {
  const res = await POST(new Request("http://x", { method: "POST", body: JSON.stringify({ reviewStatus: "bad" }) }), { params: Promise.resolve({ taskId: "t1" }) });
  assert.equal(res.status, 400);
});



test("review route returns 400 for malformed JSON body", async () => {
  const res = await POST(new Request("http://x", { method: "POST", body: "{" }), { params: Promise.resolve({ taskId: "t1" }) });
  assert.equal(res.status, 400);
  const data = await res.json();
  assert.equal(data.error, "Malformed JSON request body.");
});
test("review route updates valid status", async () => {
  const orig = prisma.generationTask.update;
  let updateArgs: any = null;
  (prisma.generationTask as any).update = async (args: any) => {
    updateArgs = args;
    return {
      id: "t1", jobId: "j1", status: "completed", subjectPrompt: "p", finalPrompt: "f", presetName: "n", presetVersion: "v1", provider: "mock", model: "mock-v1", errorMessage: null, responseMetadataJson: null, createdAt: new Date(), completedAt: null, outputPath: null, reviewStatus: args.data.reviewStatus
    };
  };
  const res = await POST(new Request("http://x", { method: "POST", body: JSON.stringify({ reviewStatus: "favorite" }) }), { params: Promise.resolve({ taskId: "t1" }) });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.task.reviewStatus, "favorite");
  assert.equal(updateArgs.where.id, "t1");
  assert.deepEqual(Object.keys(updateArgs.data).sort(), ["reviewStatus", "reviewedAt"]);
  (prisma.generationTask as any).update = orig;
});

test("review route returns 404 for missing task", async () => {
  const orig = prisma.generationTask.update;
  (prisma.generationTask as any).update = async () => {
    throw new (Prisma as any).PrismaClientKnownRequestError("Not found", { code: "P2025", clientVersion: "test" });
  };
  const res = await POST(new Request("http://x", { method: "POST", body: JSON.stringify({ reviewStatus: "approved" }) }), { params: Promise.resolve({ taskId: "missing" }) });
  assert.equal(res.status, 404);
  const data = await res.json();
  assert.equal(data.error, "Task not found");
  (prisma.generationTask as any).update = orig;
});

test("review route returns safe 500 on unexpected update error", async () => {
  const orig = prisma.generationTask.update;
  (prisma.generationTask as any).update = async () => {
    throw new Error("database exploded");
  };
  const res = await POST(new Request("http://x", { method: "POST", body: JSON.stringify({ reviewStatus: "approved" }) }), { params: Promise.resolve({ taskId: "t1" }) });
  assert.equal(res.status, 500);
  const data = await res.json();
  assert.equal(data.error, "Internal server error");
  (prisma.generationTask as any).update = orig;
});
