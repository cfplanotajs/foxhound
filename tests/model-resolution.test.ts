import test from "node:test";
import assert from "node:assert/strict";
import { __resetEnvCacheForTests } from "../lib/env.ts";
import { resolveProviderAndModel } from "../lib/jobs/model-resolution.ts";

test("openai uses OPENAI_IMAGE_MODEL when body model missing", () => {
  process.env.DATABASE_URL = process.env.DATABASE_URL ?? "file:./dev.db";
  process.env.OPENAI_IMAGE_MODEL = "gpt-image-1";
  __resetEnvCacheForTests();
  const out = resolveProviderAndModel({ providerFromBody: "openai", modelFromBody: undefined, presetDefaultModel: "gpt-image-2" });
  assert.equal(out.model, "gpt-image-1");
});

test("openai returns null when no model anywhere", () => {
  process.env.DATABASE_URL = process.env.DATABASE_URL ?? "file:./dev.db";
  delete process.env.OPENAI_IMAGE_MODEL;
  __resetEnvCacheForTests();
  const out = resolveProviderAndModel({ providerFromBody: "openai" });
  assert.equal(out.model, null);
});

test("mock does not require OPENAI_IMAGE_MODEL", () => {
  process.env.DATABASE_URL = process.env.DATABASE_URL ?? "file:./dev.db";
  delete process.env.OPENAI_IMAGE_MODEL;
  __resetEnvCacheForTests();
  const out = resolveProviderAndModel({ providerFromBody: "mock", modelFromBody: "" });
  assert.equal(out.provider, "mock");
  assert.equal(out.model, "mock-v1");
});
