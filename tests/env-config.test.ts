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

test("OPENAI_IMAGE_MODEL blank string is treated as undefined", () => {
  process.env.DATABASE_URL = process.env.DATABASE_URL ?? "file:./dev.db";
  process.env.OPENAI_IMAGE_MODEL = "";
  __resetEnvCacheForTests();
  assert.equal(getEnv().OPENAI_IMAGE_MODEL, undefined);
});

test("OPENAI_IMAGE_MODEL whitespace is treated as undefined", () => {
  process.env.DATABASE_URL = process.env.DATABASE_URL ?? "file:./dev.db";
  process.env.OPENAI_IMAGE_MODEL = "   ";
  __resetEnvCacheForTests();
  assert.equal(getEnv().OPENAI_IMAGE_MODEL, undefined);
});

test("OPENAI_IMAGE_MODEL is trimmed when present", () => {
  process.env.DATABASE_URL = process.env.DATABASE_URL ?? "file:./dev.db";
  process.env.OPENAI_IMAGE_MODEL = " gpt-image-2 ";
  __resetEnvCacheForTests();
  assert.equal(getEnv().OPENAI_IMAGE_MODEL, "gpt-image-2");
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

test("DATABASE_URL is required", () => {
  const prev = process.env.DATABASE_URL;
  delete process.env.DATABASE_URL;
  __resetEnvCacheForTests();
  assert.throws(() => getEnv());
  process.env.DATABASE_URL = prev;
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
