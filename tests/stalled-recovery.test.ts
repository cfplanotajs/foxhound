import test from "node:test";
import assert from "node:assert/strict";
import { isJobStalled, reconcileJobStatusFromTasks, shouldRetryAfterStall } from "../lib/jobs/stalled.ts";

test("processing job older than timeout is stale", () => {
  const now = new Date("2026-01-01T00:10:00Z");
  const started = new Date("2026-01-01T00:00:00Z");
  assert.equal(isJobStalled(started, now, 5 * 60_000), true);
});

test("non-stale processing job is not reclaimed", () => {
  const now = new Date("2026-01-01T00:01:00Z");
  const started = new Date("2026-01-01T00:00:00Z");
  assert.equal(isJobStalled(started, now, 5 * 60_000), false);
});

test("stalled processing task with attempts remaining becomes retryable", () => {
  assert.equal(shouldRetryAfterStall({ id: "t1", status: "processing", attempts: 0, maxAttempts: 3, nextAttemptAt: null }), true);
});

test("stalled processing task with exhausted attempts becomes failed terminal", () => {
  assert.equal(shouldRetryAfterStall({ id: "t1", status: "processing", attempts: 2, maxAttempts: 3, nextAttemptAt: null }), false);
});

test("stale job with completed tasks reconciles to completed", () => {
  const status = reconcileJobStatusFromTasks([{ status: "completed", attempts: 0, maxAttempts: 3, nextAttemptAt: null }]);
  assert.equal(status, "completed");
});

test("queued actionable tasks keep job queued", () => {
  const status = reconcileJobStatusFromTasks([{ status: "queued", attempts: 0, maxAttempts: 3, nextAttemptAt: null }]);
  assert.equal(status, "queued");
});
