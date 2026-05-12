import test from "node:test";
import assert from "node:assert/strict";
import { POST } from "../app/api/tasks/[taskId]/edit/route.ts";
import { prisma } from "../lib/db.ts";

test("edit route returns 404 for missing source task", async () => {
  const orig = prisma.generationTask.findUnique;
  (prisma.generationTask as any).findUnique = async () => null;
  const res = await POST(new Request("http://x", { method: "POST", body: JSON.stringify({ presetId: "p1", editInstruction: "fix bg" }) }), { params: Promise.resolve({ taskId: "t1" }) });
  assert.equal(res.status, 404);
  (prisma.generationTask as any).findUnique = orig;
});

test("edit route rejects non-completed task", async () => {
  const orig = prisma.generationTask.findUnique;
  (prisma.generationTask as any).findUnique = async () => ({ id: "t1", status: "queued" });
  const res = await POST(new Request("http://x", { method: "POST", body: JSON.stringify({ presetId: "p1", editInstruction: "fix bg" }) }), { params: Promise.resolve({ taskId: "t1" }) });
  assert.equal(res.status, 400);
  (prisma.generationTask as any).findUnique = orig;
});

test("edit route creates edit job in mock mode", async () => {
  const o1 = prisma.generationTask.findUnique;
  const o2 = prisma.preset.findUnique;
  const o3 = prisma.$transaction;
  (prisma.generationTask as any).findUnique = async () => ({ id: "t1", status: "completed", outputPath: __filename, jobId: "j1" });
  (prisma.preset as any).findUnique = async () => ({ stableKey: "p1", name: "Preset", isArchived: false, versions: [{ id: "pv1", version: "v1", stylePrompt: "style", defaultProvider: "mock", defaultModel: "mock-v1", defaultParamsJson: "{}" }] });
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
  (prisma.generationTask as any).findUnique = o1;
  (prisma.preset as any).findUnique = o2;
  (prisma as any).$transaction = o3;
});
