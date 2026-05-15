import test from "node:test";
import assert from "node:assert/strict";
import { assertSupportedProvider, parseSupportedProvider } from "../lib/providers/supported.ts";

test("parseSupportedProvider accepts openai and mock", () => {
  assert.equal(parseSupportedProvider("openai"), "openai");
  assert.equal(parseSupportedProvider("mock"), "mock");
});

test("parseSupportedProvider rejects unsupported values", () => {
  assert.equal(parseSupportedProvider("bad-provider"), null);
});

test("assertSupportedProvider throws readable error for unsupported provider", () => {
  assert.throws(() => assertSupportedProvider("bad-provider"), /Unsupported provider: bad-provider/);
});
