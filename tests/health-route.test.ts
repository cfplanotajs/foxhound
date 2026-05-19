import test from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import fs from "node:fs/promises";
import { GET } from "../app/api/health/route.ts";
import { prisma } from "../lib/db.ts";

test("health route returns 200 when db and storage checks pass", async () => {
  const orig = prisma.$queryRaw;
  (prisma as any).$queryRaw = async () => [{ ok: 1 }];
  const previousStorage = process.env.FOXHOUND_STORAGE_DIR;
  process.env.FOXHOUND_STORAGE_DIR = path.join(os.tmpdir(), "foxhound-health-ok");

  const res = await GET();
  const data = await res.json();

  assert.equal(res.status, 200);
  assert.equal(data.status, "ok");
  assert.equal(data.app, "foxhound");
  assert.equal(data.database, "ok");
  assert.equal(data.storage, "ok");
  assert.equal(typeof data.timestamp, "string");

  assert.equal(JSON.stringify(data).includes("OPENAI_API_KEY"), false);
  assert.equal(JSON.stringify(data).includes("DATABASE_URL"), false);
  if (process.env.DATABASE_URL) assert.equal(JSON.stringify(data).includes(process.env.DATABASE_URL), false);
  if (process.env.FOXHOUND_STORAGE_DIR) assert.equal(JSON.stringify(data).includes(process.env.FOXHOUND_STORAGE_DIR), false);

  process.env.FOXHOUND_STORAGE_DIR = previousStorage;
  (prisma as any).$queryRaw = orig;
});

test("health route returns 503 when database check fails", async () => {
  const orig = prisma.$queryRaw;
  (prisma as any).$queryRaw = async () => { throw new Error("db down"); };
  const previousStorage = process.env.FOXHOUND_STORAGE_DIR;
  process.env.FOXHOUND_STORAGE_DIR = path.join(os.tmpdir(), "foxhound-health-db-fail");

  const res = await GET();
  const data = await res.json();

  assert.equal(res.status, 503);
  assert.equal(data.status, "error");
  assert.equal(data.database, "error");
  assert.equal(data.storage, "ok");

  process.env.FOXHOUND_STORAGE_DIR = previousStorage;
  (prisma as any).$queryRaw = orig;
});

test("health route returns 503 when storage check fails", async () => {
  const orig = prisma.$queryRaw;
  (prisma as any).$queryRaw = async () => [{ ok: 1 }];
  const mkdirOrig = fs.mkdir;
  (fs as any).mkdir = async () => { throw new Error("mkdir denied"); };

  const res = await GET();
  const data = await res.json();

  assert.equal(res.status, 503);
  assert.equal(data.status, "error");
  assert.equal(data.database, "ok");
  assert.equal(data.storage, "error");

  (fs as any).mkdir = mkdirOrig;
  (prisma as any).$queryRaw = orig;
});
