import test from "node:test";
import assert from "node:assert/strict";
import { getWorkerMaxAttempts, parsePositiveIntEnv } from "../lib/jobs/worker-config.ts";

test("missing value falls back to default", () => {
  assert.equal(parsePositiveIntEnv(undefined, 3), 3);
});

test("malformed and whitespace values fall back to default", () => {
  assert.equal(parsePositiveIntEnv("three", 3), 3);
  assert.equal(parsePositiveIntEnv("   ", 3), 3);
});

test("zero and negative values clamp to minimum", () => {
  assert.equal(parsePositiveIntEnv("0", 3), 1);
  assert.equal(parsePositiveIntEnv("-5", 3), 1);
});

test("decimal and high values are sanitized", () => {
  assert.equal(parsePositiveIntEnv("2.5", 3), 3);
  assert.equal(parsePositiveIntEnv("50", 3), 25);
});

test("getWorkerMaxAttempts uses sanitized env", () => {
  const old = process.env.WORKER_MAX_ATTEMPTS;
  process.env.WORKER_MAX_ATTEMPTS = " 0 ";
  assert.equal(getWorkerMaxAttempts(), 1);
  process.env.WORKER_MAX_ATTEMPTS = "three";
  assert.equal(getWorkerMaxAttempts(), 3);
  process.env.WORKER_MAX_ATTEMPTS = "7";
  assert.equal(getWorkerMaxAttempts(), 7);
  process.env.WORKER_MAX_ATTEMPTS = old;
});
