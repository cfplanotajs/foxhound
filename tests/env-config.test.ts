import test from "node:test";
import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { __resetEnvCacheForTests, assertProviderConfigured, getEnv, MISSING_OPENAI_KEY_MESSAGE } from "../lib/env.ts";

test("env loads without OPENAI_API_KEY for demo mode", () => {
  process.env.DATABASE_URL = process.env.DATABASE_URL ?? "file:./dev.db";
  delete process.env.OPENAI_API_KEY;
  __resetEnvCacheForTests();
  const env = getEnv();
  assert.equal(env.OPENAI_API_KEY, undefined);
});

test("openai provider config assertion fails with friendly message", () => {
  process.env.DATABASE_URL = process.env.DATABASE_URL ?? "file:./dev.db";
  delete process.env.OPENAI_API_KEY;
  __resetEnvCacheForTests();
  assert.throws(() => assertProviderConfigured("openai"), new Error(MISSING_OPENAI_KEY_MESSAGE));
});

test("mock provider config assertion does not require OPENAI_API_KEY", () => {
  process.env.DATABASE_URL = process.env.DATABASE_URL ?? "file:./dev.db";
  delete process.env.OPENAI_API_KEY;
  __resetEnvCacheForTests();
  assert.doesNotThrow(() => assertProviderConfigured("mock"));
});

test("no client-side code references OPENAI_API_KEY", () => {
  let output = "";
  try {
    output = execSync("rg --line-number 'OPENAI_API_KEY|NEXT_PUBLIC_OPENAI_API_KEY' app --glob '*.tsx' --glob '*.ts'", { encoding: "utf8" }).trim();
  } catch {
    output = "";
  }
  assert.equal(output, "");
});
