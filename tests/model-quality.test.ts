import test from "node:test";
import assert from "node:assert/strict";
import { getQualityOptionsForModel, normalizeQualityForModel } from "../lib/providers/model-quality.ts";

test("dall-e-2 uses standard quality", () => {
  assert.deepEqual(getQualityOptionsForModel("openai", "dall-e-2"), ["standard"]);
  assert.equal(normalizeQualityForModel("openai", "dall-e-2", "high"), "standard");
});

test("dall-e-3 accepts standard/hd", () => {
  assert.deepEqual(getQualityOptionsForModel("openai", "dall-e-3"), ["standard", "hd"]);
  assert.equal(normalizeQualityForModel("openai", "dall-e-3", "hd"), "hd");
});

test("mock quality path remains harmless", () => {
  assert.deepEqual(getQualityOptionsForModel("mock", "mock-v1"), ["high"]);
});
