import test from "node:test";
import assert from "node:assert/strict";
import { POST } from "../app/api/tasks/[taskId]/edit/route.ts";
import { prisma } from "../lib/db.ts";
import { getWorkerMaxAttempts } from "../lib/jobs/worker-config.ts";
import { __resetEnvCacheForTests } from "../lib/env.ts";

function setupEditableSource() {
  const o1 = prisma.generationTask.findUnique;
  const o2 = prisma.preset.findUnique;
  (prisma.generationTask as any).findUnique = async () => ({ id: "t1", status: "completed", outputPath: __filename, jobId: "j1" });
  (prisma.preset as any).findUnique = async () => ({ stableKey: "p1", name: "Preset", isArchived: false, versions: [{ id: "pv1", version: "v1", stylePrompt: "style", defaultProvider: "mock", defaultModel: "mock-v1", defaultParamsJson: "{}" }] });
  return () => {
    (prisma.generationTask as any).findUnique = o1;
    (prisma.preset as any).findUnique = o2;
  };
}

test("edit route returns 404 for missing source task", async () => {
  const orig = prisma.generationTask.findUnique;
  (prisma.generationTask as any).findUnique = async () => null;
  const res = await POST(new Request("http://x", { method: "POST", body: JSON.stringify({ presetId: "p1", editInstruction: "fix bg" }) }), { params: Promise.resolve({ taskId: "t1" }) });
  assert.equal(res.status, 404);
  (prisma.generationTask as any).findUnique = orig;
});

test("edit route returns 400 for malformed JSON body", async () => {
  const res = await POST(new Request("http://x", { method: "POST", body: "{bad", headers: { "content-type": "application/json" } }), { params: Promise.resolve({ taskId: "t1" }) });
  assert.equal(res.status, 400);
  assert.equal((await res.json()).error, "Malformed JSON request body.");
});

test("edit route returns 400 for invalid schema body", async () => {
  const res = await POST(new Request("http://x", { method: "POST", body: JSON.stringify({ presetId: "", editInstruction: "" }) }), { params: Promise.resolve({ taskId: "t1" }) });
  assert.equal(res.status, 400);
});

test("edit route rejects non-completed task", async () => {
  const orig = prisma.generationTask.findUnique;
  (prisma.generationTask as any).findUnique = async () => ({ id: "t1", status: "queued" });
  const res = await POST(new Request("http://x", { method: "POST", body: JSON.stringify({ presetId: "p1", editInstruction: "fix bg" }) }), { params: Promise.resolve({ taskId: "t1" }) });
  assert.equal(res.status, 400);
  (prisma.generationTask as any).findUnique = orig;
});

test("edit route creates edit job in mock mode", async () => {
  const restore = setupEditableSource();
  const of = prisma.projectFolder.findUnique;
  const op = prisma.project.findUnique;
  const o3 = prisma.$transaction;
  (prisma.projectFolder as any).findUnique = async () => null;
  (prisma.project as any).findUnique = async () => null;
  (prisma as any).$transaction = async (fn: any) => {
    const taskRows: any[] = [];
    const out = await fn({ generationJob: { create: async ({ data }: any) => ({ id: "j2", ...data }) }, generationTask: { createMany: async ({ data }: any) => { taskRows.push(...data); return {}; } } });
    (globalThis as any).__editTaskRows = taskRows;
    return out;
  };
  const res = await POST(new Request("http://x", { method: "POST", body: JSON.stringify({ presetId: "p1", provider: "mock", model: "mock-v1", editInstruction: "white bg", variationCount: 2 }) }), { params: Promise.resolve({ taskId: "t1" }) });
  assert.equal(res.status, 200);
  const rows = (globalThis as any).__editTaskRows;
  assert.equal(rows.length, 2);
  assert.equal(JSON.parse(rows[0].requestPayloadJson).metadata.mode, "edit");
  assert.equal(rows[0].maxAttempts, getWorkerMaxAttempts());
  restore();
  (prisma.projectFolder as any).findUnique = of;
  (prisma.project as any).findUnique = op;
  (prisma as any).$transaction = o3;
});

test("edit route rejects archived folder assignment", async () => {
  const restore = setupEditableSource();
  const of = prisma.projectFolder.findUnique;
  (prisma.projectFolder as any).findUnique = async () => ({ id: "f1", projectId: "p1", isArchived: true });
  const res = await POST(new Request("http://x", { method: "POST", body: JSON.stringify({ presetId: "p1", editInstruction: "white bg", folderId: "f1" }) }), { params: Promise.resolve({ taskId: "t1" }) });
  assert.equal(res.status, 400);
  assert.equal((await res.json()).error, "Archived folder cannot be used for new jobs.");
  (prisma.projectFolder as any).findUnique = of;
  restore();
});

test("edit route infers project from folder", async () => {
  const restore = setupEditableSource();
  const of = prisma.projectFolder.findUnique;
  const op = prisma.project.findUnique;
  const ot = prisma.$transaction;
  (prisma.projectFolder as any).findUnique = async () => ({ id: "f1", projectId: "p1", isArchived: false });
  (prisma.project as any).findUnique = async () => ({ id: "p1", isArchived: false });
  (prisma as any).$transaction = async (fn: any) => fn({ generationJob: { create: async ({ data }: any) => ({ id: "j2", ...data }) }, generationTask: { createMany: async () => ({}) } });
  const res = await POST(new Request("http://x", { method: "POST", body: JSON.stringify({ presetId: "p1", editInstruction: "white bg", folderId: "f1" }) }), { params: Promise.resolve({ taskId: "t1" }) });
  assert.equal(res.status, 200);
  const payload = await res.json();
  assert.ok(payload.jobId);
  (prisma.projectFolder as any).findUnique = of;
  (prisma.project as any).findUnique = op;
  (prisma as any).$transaction = ot;
  restore();
});

test("edit route rejects mismatched project/folder", async () => {
  const restore = setupEditableSource();
  const of = prisma.projectFolder.findUnique;
  (prisma.projectFolder as any).findUnique = async () => ({ id: "f1", projectId: "p1", isArchived: false });
  const res = await POST(new Request("http://x", { method: "POST", body: JSON.stringify({ presetId: "p1", editInstruction: "white bg", folderId: "f1", projectId: "p2" }) }), { params: Promise.resolve({ taskId: "t1" }) });
  assert.equal(res.status, 400);
  assert.equal((await res.json()).error, "Folder must belong to selected project.");
  (prisma.projectFolder as any).findUnique = of;
  restore();
});

test("edit route treats blank projectId/folderId as unassigned", async () => {
  const restore = setupEditableSource();
  const of = prisma.projectFolder.findUnique;
  const op = prisma.project.findUnique;
  const ot = prisma.$transaction;
  (prisma.projectFolder as any).findUnique = async () => null;
  (prisma.project as any).findUnique = async () => null;
  let capturedJobData: any = null;
  (prisma as any).$transaction = async (fn: any) =>
    fn({
      generationJob: { create: async ({ data }: any) => ((capturedJobData = data), { id: "j2", ...data }) },
      generationTask: { createMany: async () => ({}) }
    });
  const res = await POST(new Request("http://x", { method: "POST", body: JSON.stringify({ presetId: "p1", editInstruction: "white bg", projectId: "   ", folderId: "" }) }), { params: Promise.resolve({ taskId: "t1" }) });
  assert.equal(res.status, 200);
  assert.equal(capturedJobData.projectId, null);
  assert.equal(capturedJobData.folderId, null);
  (prisma.projectFolder as any).findUnique = of;
  (prisma.project as any).findUnique = op;
  (prisma as any).$transaction = ot;
  restore();
});

test("edit route treats blank folderId as absent with valid project assignment", async () => {
  const restore = setupEditableSource();
  const of = prisma.projectFolder.findUnique;
  const op = prisma.project.findUnique;
  const ot = prisma.$transaction;
  (prisma.projectFolder as any).findUnique = async () => null;
  (prisma.project as any).findUnique = async ({ where }: any) => (where.id === "p1" ? { id: "p1", isArchived: false } : null);
  let capturedJobData: any = null;
  (prisma as any).$transaction = async (fn: any) =>
    fn({
      generationJob: { create: async ({ data }: any) => ((capturedJobData = data), { id: "j2", ...data }) },
      generationTask: { createMany: async () => ({}) }
    });
  const res = await POST(new Request("http://x", { method: "POST", body: JSON.stringify({ presetId: "p1", editInstruction: "white bg", projectId: " p1 ", folderId: "   " }) }), { params: Promise.resolve({ taskId: "t1" }) });
  assert.equal(res.status, 200);
  assert.equal(capturedJobData.projectId, "p1");
  assert.equal(capturedJobData.folderId, null);
  (prisma.projectFolder as any).findUnique = of;
  (prisma.project as any).findUnique = op;
  (prisma as any).$transaction = ot;
  restore();
});

test("edit route returns friendly 400 when openai key missing", async () => {
  const restore = setupEditableSource();
  const prev = process.env.OPENAI_API_KEY;
  const prevDb = process.env.DATABASE_URL;
  process.env.DATABASE_URL = prevDb ?? "file:./test.db";
  delete process.env.OPENAI_API_KEY;
  __resetEnvCacheForTests();
  const res = await POST(new Request("http://x", { method: "POST", body: JSON.stringify({ presetId: "p1", provider: "openai", model: "gpt-image-2", editInstruction: "white bg" }) }), { params: Promise.resolve({ taskId: "t1" }) });
  assert.equal(res.status, 400);
  assert.match((await res.json()).error, /OpenAI API key is missing/);
  if (prev) process.env.OPENAI_API_KEY = prev;
  if (prevDb) process.env.DATABASE_URL = prevDb;
  __resetEnvCacheForTests();
  restore();
});

test("edit route returns 400 for unsupported quality/model combinations", async () => {
  const restore = setupEditableSource();
  const ot = prisma.$transaction;
  let txCalls = 0;
  (prisma as any).$transaction = async () => {
    txCalls += 1;
    throw new Error("should not run");
  };

  const badMock = await POST(new Request("http://x", { method: "POST", body: JSON.stringify({ presetId: "p1", provider: "mock", model: "mock-v1", editInstruction: "white bg", quality: "hd" }) }), { params: Promise.resolve({ taskId: "t1" }) });
  assert.equal(badMock.status, 400);
  assert.equal((await badMock.json()).error, "Quality hd is not supported for model mock-v1.");

  assert.equal(txCalls, 0);
  (prisma as any).$transaction = ot;
  restore();
});
