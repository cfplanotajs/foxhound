import test from "node:test";
import assert from "node:assert/strict";
import { aggregateJobStatus, canClaimQueued } from "../lib/jobs/status.ts";

test("aggregateJobStatus returns completed when all complete", () => {
  assert.equal(aggregateJobStatus(["completed", "completed"]), "completed");
});

test("aggregateJobStatus returns failed when all failed", () => {
  assert.equal(aggregateJobStatus(["failed", "failed"]), "failed");
});

test("aggregateJobStatus returns partial_failed when mixed", () => {
  assert.equal(aggregateJobStatus(["completed", "failed", "completed"]), "partial_failed");
});

test("canClaimQueued only claims queued status", () => {
  assert.equal(canClaimQueued("queued"), true);
  assert.equal(canClaimQueued("processing"), false);
  assert.equal(canClaimQueued("completed"), false);
  assert.equal(canClaimQueued("failed"), false);
});
