import test from "node:test";
import assert from "node:assert/strict";
import { computeBackoffMs, shouldRetry } from "../lib/jobs/retry.ts";

test("shouldRetry true when attempts below max", () => {
  assert.equal(shouldRetry(1, 3), true);
});

test("shouldRetry false when attempts reached max", () => {
  assert.equal(shouldRetry(3, 3), false);
});

test("computeBackoffMs scales with attempts", () => {
  assert.equal(computeBackoffMs(1, 1000), 1000);
  assert.equal(computeBackoffMs(2, 1000), 2000);
  assert.equal(computeBackoffMs(3, 1000), 3000);
});
