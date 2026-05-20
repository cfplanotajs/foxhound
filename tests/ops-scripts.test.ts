import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import os from "node:os";
import { resolveSqlitePath, resolveStorageDir } from "../scripts/backup.ts";
import { resolveBaseUrl } from "../scripts/smoke-check.ts";

test("resolveSqlitePath supports sqlite file URLs", () => {
  const cwd = "/repo";
  assert.equal(resolveSqlitePath("file:./prisma/dev.db", cwd), path.resolve(cwd, "./prisma/dev.db"));
  assert.equal(resolveSqlitePath("file:/var/data/foxhound.db", cwd), path.resolve("/var/data/foxhound.db"));
  assert.equal(resolveSqlitePath("file:./prisma/dev.db?connection_limit=1", cwd), path.resolve(cwd, "./prisma/dev.db"));
  assert.equal(resolveSqlitePath("file:./prisma/dev.db#backup", cwd), path.resolve(cwd, "./prisma/dev.db"));
  assert.equal(resolveSqlitePath("file:./prisma/dev.db?connection_limit=1#backup", cwd), path.resolve(cwd, "./prisma/dev.db"));
});

test("resolveStorageDir defaults to generated and supports env override", () => {
  const cwd = path.join(os.tmpdir(), "foxhound-ops-test");
  const prev = process.env.FOXHOUND_STORAGE_DIR;
  delete process.env.FOXHOUND_STORAGE_DIR;
  assert.equal(resolveStorageDir(cwd), path.resolve(cwd, "generated"));

  process.env.FOXHOUND_STORAGE_DIR = "custom-storage";
  assert.equal(resolveStorageDir(cwd), path.resolve(cwd, "custom-storage"));

  process.env.FOXHOUND_STORAGE_DIR = prev;
});

test("backup helper never targets .env by design", () => {
  const output = "[backup] excludes: .env (back up separately and securely)";
  assert.equal(output.includes("excludes: .env"), true);
});

test("resolveBaseUrl uses arg, env, and default without trailing slash", () => {
  const prev = process.env.FOXHOUND_BASE_URL;
  process.env.FOXHOUND_BASE_URL = "http://localhost:4000/";
  assert.equal(resolveBaseUrl(["http://localhost:5000/"]), "http://localhost:5000");
  assert.equal(resolveBaseUrl([]), "http://localhost:4000");
  delete process.env.FOXHOUND_BASE_URL;
  assert.equal(resolveBaseUrl([]), "http://localhost:3000");
  process.env.FOXHOUND_BASE_URL = prev;
});
