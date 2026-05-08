import test from "node:test";
import assert from "node:assert/strict";
import { normalizeProviderError } from "../lib/providers/error-normalizer.ts";

test("non-retryable billing/auth/content-policy errors are non-retryable", () => {
  assert.equal(normalizeProviderError(new Error("billing_hard_limit_reached")).retryable, false);
  assert.equal(normalizeProviderError(new Error("invalid api key")).retryable, false);
  assert.equal(normalizeProviderError(new Error("content policy violation")).retryable, false);
});

test("retryable rate-limit/network errors remain retryable", () => {
  assert.equal(normalizeProviderError(new Error("rate limit exceeded")).retryable, true);
  assert.equal(normalizeProviderError(new Error("network error econnreset")).retryable, true);
});
