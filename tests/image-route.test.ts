import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { GET } from "../app/api/images/[jobId]/[taskId]/route.ts";
import { prisma } from "../lib/db.ts";

test("image route returns 404 when task has no outputPath", async () => {
  const orig = prisma.generationTask.findFirst;
  (prisma.generationTask as any).findFirst = async () => ({ id: "t1", outputPath: null });
  const res = await GET(new Request("http://x"), { params: Promise.resolve({ jobId: "j1", taskId: "t1" }) });
  assert.equal(res.status, 404);
  (prisma.generationTask as any).findFirst = orig;
});

test("image route returns 404 when file path is missing on disk", async () => {
  const orig = prisma.generationTask.findFirst;
  (prisma.generationTask as any).findFirst = async () => ({ id: "t1", outputPath: "/tmp/does-not-exist-foxhound.png" });
  const res = await GET(new Request("http://x"), { params: Promise.resolve({ jobId: "j1", taskId: "t1" }) });
  assert.equal(res.status, 404);
  const data = await res.json();
  assert.equal(data.error, "Image file not found");
  assert.equal(String(data.error).includes("/tmp/"), false);
  (prisma.generationTask as any).findFirst = orig;
});

test("image route returns bytes when file exists", async () => {
  const orig = prisma.generationTask.findFirst;
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "foxhound-img-"));
  const file = path.join(dir, "sample.png");
  await fs.writeFile(file, Buffer.from([1, 2, 3, 4]));
  (prisma.generationTask as any).findFirst = async () => ({ id: "t1", outputPath: file });
  const res = await GET(new Request("http://x"), { params: Promise.resolve({ jobId: "j1", taskId: "t1" }) });
  assert.equal(res.status, 200);
  const bytes = new Uint8Array(await res.arrayBuffer());
  assert.equal(bytes.length, 4);
  await fs.rm(dir, { recursive: true, force: true });
  (prisma.generationTask as any).findFirst = orig;
});
