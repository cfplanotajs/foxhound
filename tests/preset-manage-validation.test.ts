import test from "node:test";
import assert from "node:assert/strict";
import { normalizePresetProviderModel } from "../lib/presets/manage-validation.ts";

test("create/edit accepts trimmed openai default model", () => {
  const out = normalizePresetProviderModel({ defaultProvider: "openai", defaultModel: "gpt-image-2 " });
  assert.equal(out.defaultModel, "gpt-image-2");
});

test("unsupported model with whitespace still fails after trim", () => {
  assert.throws(
    () => normalizePresetProviderModel({ defaultProvider: "openai", defaultModel: "bad-model " }),
    /Unsupported OpenAI image model: bad-model/
  );
});

test("mock provider works and unsupported provider fails", () => {
  const mock = normalizePresetProviderModel({ defaultProvider: "mock", defaultModel: "mock-v1 " });
  assert.equal(mock.provider, "mock");
  assert.equal(mock.defaultModel, "mock-v1");
  assert.throws(() => normalizePresetProviderModel({ defaultProvider: "bad-provider", defaultModel: "x" }), /Unsupported provider: bad-provider/);
});
