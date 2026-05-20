import test from "node:test";
import assert from "node:assert/strict";
import { getWorkerHeartbeatIntervalMs, getWorkerMaxAttempts, getWorkerPollIntervalMs, getWorkerRetryBaseMs, getWorkerStalledAfterMs, parsePositiveIntEnv } from "../lib/jobs/worker-config.ts";

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

test("getWorkerRetryBaseMs sanitizes malformed values", () => {
  const old = process.env.WORKER_RETRY_BASE_MS;
  process.env.WORKER_RETRY_BASE_MS = "5s";
  assert.equal(getWorkerRetryBaseMs(), 5000);
  process.env.WORKER_RETRY_BASE_MS = " ";
  assert.equal(getWorkerRetryBaseMs(), 5000);
  process.env.WORKER_RETRY_BASE_MS = "-10";
  assert.equal(getWorkerRetryBaseMs(), 1000);
  process.env.WORKER_RETRY_BASE_MS = "9999999";
  assert.equal(getWorkerRetryBaseMs(), 300000);
  process.env.WORKER_RETRY_BASE_MS = old;
});


test("getWorkerPollIntervalMs sanitizes malformed values", () => {
  const old = process.env.WORKER_POLL_INTERVAL_MS;
  process.env.WORKER_POLL_INTERVAL_MS = "abc";
  assert.equal(getWorkerPollIntervalMs(), 5000);
  process.env.WORKER_POLL_INTERVAL_MS = " ";
  assert.equal(getWorkerPollIntervalMs(), 5000);
  process.env.WORKER_POLL_INTERVAL_MS = "0";
  assert.equal(getWorkerPollIntervalMs(), 1000);
  process.env.WORKER_POLL_INTERVAL_MS = "-10";
  assert.equal(getWorkerPollIntervalMs(), 1000);
  process.env.WORKER_POLL_INTERVAL_MS = "2500.9";
  assert.equal(getWorkerPollIntervalMs(), 5000);
  process.env.WORKER_POLL_INTERVAL_MS = "9999999";
  assert.equal(getWorkerPollIntervalMs(), 300000);
  process.env.WORKER_POLL_INTERVAL_MS = old;
});


test("getWorkerStalledAfterMs sanitizes malformed values", () => {
  const old = process.env.WORKER_STALLED_AFTER_MS;
  delete process.env.WORKER_STALLED_AFTER_MS;
  assert.equal(getWorkerStalledAfterMs(), 900000);
  process.env.WORKER_STALLED_AFTER_MS = "abc";
  assert.equal(getWorkerStalledAfterMs(), 900000);
  process.env.WORKER_STALLED_AFTER_MS = "   ";
  assert.equal(getWorkerStalledAfterMs(), 900000);
  process.env.WORKER_STALLED_AFTER_MS = "0";
  assert.equal(getWorkerStalledAfterMs(), 60000);
  process.env.WORKER_STALLED_AFTER_MS = "-10";
  assert.equal(getWorkerStalledAfterMs(), 60000);
  process.env.WORKER_STALLED_AFTER_MS = "120000.9";
  assert.equal(getWorkerStalledAfterMs(), 900000);
  process.env.WORKER_STALLED_AFTER_MS = "999999999";
  assert.equal(getWorkerStalledAfterMs(), 86400000);
  process.env.WORKER_STALLED_AFTER_MS = "120000";
  assert.equal(getWorkerStalledAfterMs(), 120000);
  process.env.WORKER_STALLED_AFTER_MS = old;
});

test("getWorkerHeartbeatIntervalMs stays within safe bounds", () => {
  assert.equal(getWorkerHeartbeatIntervalMs(60000), 20000);
  assert.equal(getWorkerHeartbeatIntervalMs(900000), 30000);
  assert.equal(getWorkerHeartbeatIntervalMs(12000), 5000);
});
