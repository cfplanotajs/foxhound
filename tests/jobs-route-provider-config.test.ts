import test from "node:test";
import assert from "node:assert/strict";
import { __resetEnvCacheForTests, MISSING_OPENAI_KEY_MESSAGE } from "../lib/env.ts";
import { ensureJobProviderConfigured } from "../lib/jobs/provider-config.ts";

test("openai job setup check returns friendly missing-key guidance", () => {
  process.env.DATABASE_URL = process.env.DATABASE_URL ?? "file:./dev.db";
  delete process.env.OPENAI_API_KEY;
  __resetEnvCacheForTests();
  assert.throws(() => ensureJobProviderConfigured("openai"), new Error(MISSING_OPENAI_KEY_MESSAGE));
});

test("mock job setup check passes without OPENAI_API_KEY", () => {
  process.env.DATABASE_URL = process.env.DATABASE_URL ?? "file:./dev.db";
  delete process.env.OPENAI_API_KEY;
  __resetEnvCacheForTests();
  assert.doesNotThrow(() => ensureJobProviderConfigured("mock"));
});
