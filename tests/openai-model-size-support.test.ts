import test from "node:test";
import assert from "node:assert/strict";
import presets from "../config/presets.json";
import { isSupportedOpenAIModel, isSizeSupportedForOpenAIModel } from "../lib/providers/openai-models.ts";

test("seeded presets use supported openai models", () => {
  for (const preset of presets) {
    assert.equal(isSupportedOpenAIModel(preset.defaultModel), true);
  }
});

test("gpt-image-2 supports documented flexible sizes", () => {
  assert.equal(isSizeSupportedForOpenAIModel("gpt-image-2", "1536x864"), true);
  assert.equal(isSizeSupportedForOpenAIModel("gpt-image-2", "1536x1152"), true);
  assert.equal(isSizeSupportedForOpenAIModel("gpt-image-2", "1152x2048"), true);
  assert.equal(isSizeSupportedForOpenAIModel("gpt-image-2", "1535x864"), false);
  assert.equal(isSizeSupportedForOpenAIModel("gpt-image-2", "4096x512"), false);
});

test("dall-e models stay fixed-size", () => {
  assert.equal(isSizeSupportedForOpenAIModel("dall-e-3", "1792x1024"), true);
  assert.equal(isSizeSupportedForOpenAIModel("dall-e-3", "1536x1024"), false);
  assert.equal(isSizeSupportedForOpenAIModel("dall-e-2", "512x512"), true);
  assert.equal(isSizeSupportedForOpenAIModel("dall-e-2", "1536x1024"), false);
});
