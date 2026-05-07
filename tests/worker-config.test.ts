import test from "node:test";
import assert from "node:assert/strict";
import { parsePositiveIntEnv } from "../lib/jobs/worker-config.ts";

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
