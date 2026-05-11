import test from "node:test";
import assert from "node:assert/strict";
import { getQualityOptionsForModel, normalizeQualityForModel, resolveEffectiveQuality } from "../lib/providers/model-quality.ts";

test("dall-e-2 uses standard quality", () => {
  assert.deepEqual(getQualityOptionsForModel("openai", "dall-e-2"), ["standard"]);
  assert.equal(normalizeQualityForModel("openai", "dall-e-2", "high"), "standard");
  assert.equal(resolveEffectiveQuality({ provider: "openai", model: "dall-e-2" }), "standard");
});

test("dall-e-3 accepts standard/hd", () => {
  assert.deepEqual(getQualityOptionsForModel("openai", "dall-e-3"), ["standard", "hd"]);
  assert.equal(normalizeQualityForModel("openai", "dall-e-3", "hd"), "hd");
  assert.equal(resolveEffectiveQuality({ provider: "openai", model: "dall-e-3", requestedQuality: "hd" }), "hd");
  assert.throws(() => resolveEffectiveQuality({ provider: "openai", model: "dall-e-3", requestedQuality: "high" }), /is not supported/);
});

test("requested quality wins, otherwise preset default is preserved", () => {
  assert.equal(resolveEffectiveQuality({ provider: "openai", model: "gpt-image-2", requestedQuality: "low", presetDefaultQuality: "high" }), "low");
  assert.equal(resolveEffectiveQuality({ provider: "openai", model: "gpt-image-2", presetDefaultQuality: "high" }), "high");
  assert.equal(resolveEffectiveQuality({ provider: "openai", model: "gpt-image-2" }), "auto");
});

test("invalid preset default quality fails clearly", () => {
  assert.throws(() => resolveEffectiveQuality({ provider: "openai", model: "dall-e-2", presetDefaultQuality: "high" }), /is not supported/);
});

test("mock quality path remains harmless", () => {
  assert.deepEqual(getQualityOptionsForModel("mock", "mock-v1"), ["high"]);
  assert.equal(resolveEffectiveQuality({ provider: "mock", model: "mock-v1" }), "high");
});
