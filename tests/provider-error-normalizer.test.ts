import test from "node:test";
import assert from "node:assert/strict";
import { normalizeProviderError } from "../lib/providers/error-normalizer.ts";

test("billing-limit error maps friendly", () => {
  const n = normalizeProviderError(new Error("400 Billing hard limit has been reached"));
  assert.equal(n.kind, "billing_limit");
  assert.equal(n.retryable, false);
});

test("auth error maps correctly", () => {
  const n = normalizeProviderError(new Error("authentication invalid api key"));
  assert.equal(n.kind, "auth");
  assert.equal(n.retryable, false);
});

test("rate-limit maps retryable", () => {
  const n = normalizeProviderError(new Error("rate limit exceeded"));
  assert.equal(n.kind, "rate_limit");
  assert.equal(n.retryable, true);
});

test("unknown maps safely", () => {
  const n = normalizeProviderError(new Error("wild unexpected error"));
  assert.equal(n.kind, "unknown");
  assert.equal(n.title, "Image generation failed");
});


test("missing key error maps to setup guidance", () => {
  const n = normalizeProviderError(new Error("OpenAI API key is missing. Add OPENAI_API_KEY to the server .env file, or use Demo Mode."));
  assert.equal(n.kind, "auth");
  assert.match(n.designerMessage, /Demo Mode/);
});
