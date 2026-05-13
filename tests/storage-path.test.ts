import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { saveImage } from "../lib/storage.ts";

test("saveImage defaults to generated directory", async () => {
  const prev = process.env.FOXHOUND_STORAGE_DIR;
  delete process.env.FOXHOUND_STORAGE_DIR;

  const out = await saveImage("job-storage-default", "task-storage-default", Buffer.from("abc"));
  assert.equal(out, path.join(process.cwd(), "generated", "job-storage-default", "task-storage-default.png"));

  await fs.rm(path.join(process.cwd(), "generated", "job-storage-default"), { recursive: true, force: true });
  process.env.FOXHOUND_STORAGE_DIR = prev;
});

test("saveImage respects FOXHOUND_STORAGE_DIR", async () => {
  const prev = process.env.FOXHOUND_STORAGE_DIR;
  process.env.FOXHOUND_STORAGE_DIR = ".foxhound-generated";

  const out = await saveImage("job-storage-env", "task-storage-env", Buffer.from("abc"));
  assert.equal(out, path.join(process.cwd(), ".foxhound-generated", "job-storage-env", "task-storage-env.png"));

  await fs.rm(path.join(process.cwd(), ".foxhound-generated", "job-storage-env"), { recursive: true, force: true });
  process.env.FOXHOUND_STORAGE_DIR = prev;
});
