import test from "node:test";
import assert from "node:assert/strict";
import { hasActionableTask } from "../lib/jobs/actionable.ts";

const now = new Date("2026-01-01T00:00:00Z");

test("skips job when only retryable failures are not due yet", () => {
  const tasks = [{ status: "failed", attempts: 1, maxAttempts: 3, nextAttemptAt: new Date("2026-01-01T00:10:00Z") }];
  assert.equal(hasActionableTask(tasks, now), false);
});

test("job with queued task is actionable", () => {
  const tasks = [{ status: "queued", attempts: 0, maxAttempts: 3, nextAttemptAt: null }];
  assert.equal(hasActionableTask(tasks, now), true);
});

test("due retry task is actionable", () => {
  const tasks = [{ status: "failed", attempts: 1, maxAttempts: 3, nextAttemptAt: new Date("2025-12-31T23:00:00Z") }];
  assert.equal(hasActionableTask(tasks, now), true);
});
