import test from "node:test";
import assert from "node:assert/strict";
import presets from "../config/presets.json";
import { isSupportedOpenAIModel } from "../lib/providers/openai-models.ts";

test("all openai preset defaults are supported", () => {
  for (const preset of presets) {
    if (preset.defaultProvider !== "openai") continue;
    assert.equal(isSupportedOpenAIModel(preset.defaultModel), true, `unsupported default model: ${preset.defaultModel}`);
  }
});

test("gpt-image-2 is explicitly supported", () => {
  assert.equal(isSupportedOpenAIModel("gpt-image-2"), true);
});
