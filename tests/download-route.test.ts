import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { GET } from "../app/api/jobs/[jobId]/download/route.ts";
import { prisma } from "../lib/db.ts";

test("download route returns 400 when no completed images", async () => {
  const orig = prisma.generationTask.findMany;
  (prisma.generationTask as any).findMany = async () => [];
  const res = await GET(new Request("http://x"), { params: Promise.resolve({ jobId: "j1" }) });
  assert.equal(res.status, 400);
  const data = await res.json();
  assert.equal(data.error, "No completed images");
  (prisma.generationTask as any).findMany = orig;
});

test("download route returns 404 when completed task has no outputPath", async () => {
  const orig = prisma.generationTask.findMany;
  (prisma.generationTask as any).findMany = async () => [{ id: "t1", outputPath: null }];
  const res = await GET(new Request("http://x"), { params: Promise.resolve({ jobId: "j1" }) });
  assert.equal(res.status, 404);
  const data = await res.json();
  assert.equal(data.error, "One or more image files are missing.");
  assert.equal(String(JSON.stringify(data)).includes("outputPath"), false);
  (prisma.generationTask as any).findMany = orig;
});

test("download route returns 404 when file is missing from disk", async () => {
  const orig = prisma.generationTask.findMany;
  (prisma.generationTask as any).findMany = async () => [{ id: "t1", outputPath: "/tmp/foxhound-missing-file.png" }];
  const res = await GET(new Request("http://x"), { params: Promise.resolve({ jobId: "j1" }) });
  assert.equal(res.status, 404);
  const data = await res.json();
  assert.equal(data.error, "One or more image files are missing.");
  assert.equal(String(JSON.stringify(data)).includes("/tmp/"), false);
  (prisma.generationTask as any).findMany = orig;
});

test("download route returns zip when files exist", async () => {
  const orig = prisma.generationTask.findMany;
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "foxhound-zip-"));
  const fileA = path.join(dir, "a.png");
  const fileB = path.join(dir, "b.png");
  await fs.writeFile(fileA, Buffer.from([1, 2, 3]));
  await fs.writeFile(fileB, Buffer.from([4, 5, 6]));
  (prisma.generationTask as any).findMany = async () => [{ id: "t1", outputPath: fileA }, { id: "t2", outputPath: fileB }];

  const res = await GET(new Request("http://x"), { params: Promise.resolve({ jobId: "j1" }) });
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("Content-Type"), "application/zip");
  const bytes = new Uint8Array(await res.arrayBuffer());
  assert.ok(bytes.length > 0);

  await fs.rm(dir, { recursive: true, force: true });
  (prisma.generationTask as any).findMany = orig;
});


test("download route returns safe 500 on unexpected filesystem error", async () => {
  const origFindMany = prisma.generationTask.findMany;
  const origStat = (fs as any).stat;
  (prisma.generationTask as any).findMany = async () => [{ id: "t1", outputPath: "/tmp/protected.png" }];
  (fs as any).stat = async () => { throw Object.assign(new Error("EACCES: permission denied, stat /tmp/protected.png"), { code: "EACCES" }); };

  const res = await GET(new Request("http://x"), { params: Promise.resolve({ jobId: "j1" }) });
  assert.equal(res.status, 500);
  const data = await res.json();
  assert.equal(data.error, "Unable to read one or more image files.");
  assert.equal(String(JSON.stringify(data)).includes("/tmp/"), false);

  (fs as any).stat = origStat;
  (prisma.generationTask as any).findMany = origFindMany;
});

test("download route approvedOnly returns 400 when none approved", async () => {
  const orig = prisma.generationTask.findMany;
  (prisma.generationTask as any).findMany = async () => [];
  const res = await GET(new Request("http://x?approvedOnly=1"), { params: Promise.resolve({ jobId: "j1" }) });
  assert.equal(res.status, 400);
  assert.equal((await res.json()).error, "No approved images to download.");
  (prisma.generationTask as any).findMany = orig;
});

test("download route approvedOnly includes approved filter", async () => {
  const orig = prisma.generationTask.findMany;
  let whereArg: any;
  (prisma.generationTask as any).findMany = async ({ where }: any) => {
    whereArg = where;
    return [];
  };
  await GET(new Request("http://x?approvedOnly=1"), { params: Promise.resolve({ jobId: "j1" }) });
  assert.equal(whereArg.reviewStatus, "approved");
  (prisma.generationTask as any).findMany = orig;
});
