import test from "node:test";
import assert from "node:assert/strict";
import { resolveEffectiveOpenAIModel } from "../lib/presets/effective-openai-model.ts";
import { normalizePresetDefaultsForModel } from "../lib/presets/defaults-normalizer.ts";

test("valid OPENAI_IMAGE_MODEL override is accepted", () => {
  assert.equal(resolveEffectiveOpenAIModel("dall-e-3", "gpt-image-2"), "gpt-image-2");
});

test("invalid or blank OPENAI_IMAGE_MODEL falls back to stored model", () => {
  assert.equal(resolveEffectiveOpenAIModel("dall-e-3", "invalid-model"), "dall-e-3");
  assert.equal(resolveEffectiveOpenAIModel("dall-e-3", "   "), "dall-e-3");
  assert.equal(resolveEffectiveOpenAIModel("dall-e-3", undefined), "dall-e-3");
});

test("mock presets remain unaffected by normalization path", () => {
  const params = normalizePresetDefaultsForModel({ provider: "mock", model: "mock-v1", defaultParams: { quality: "high", size: "1024x1024" } });
  assert.equal(params.quality, "high");
  assert.equal(params.size, "1024x1024");
});
