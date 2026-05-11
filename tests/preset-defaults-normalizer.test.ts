import test from "node:test";
import assert from "node:assert/strict";
import { normalizePresetDefaultsForModel } from "../lib/presets/defaults-normalizer.ts";

test("keeps compatible GPT defaults", () => {
  const out = normalizePresetDefaultsForModel({ provider: "openai", model: "gpt-image-2", defaultParams: { size: "1536x1024", quality: "high" } });
  assert.equal(out.size, "1536x1024");
  assert.equal(out.quality, "high");
});

test("remaps GPT landscape defaults for dall-e-3", () => {
  const out = normalizePresetDefaultsForModel({ provider: "openai", model: "dall-e-3", defaultParams: { size: "1536x1024", quality: "high" } });
  assert.equal(out.size, "1792x1024");
  assert.equal(out.quality, "standard");
});

test("remaps GPT portrait defaults for dall-e-3", () => {
  const out = normalizePresetDefaultsForModel({ provider: "openai", model: "dall-e-3", defaultParams: { size: "1024x1536", quality: "hd" } });
  assert.equal(out.size, "1024x1792");
  assert.equal(out.quality, "hd");
});

test("maps non-square defaults to safe square for dall-e-2", () => {
  const out = normalizePresetDefaultsForModel({ provider: "openai", model: "dall-e-2", defaultParams: { size: "1536x1024", quality: "high" } });
  assert.equal(out.size, "1024x1024");
  assert.equal(out.quality, "standard");
});

test("mock provider defaults remain unchanged", () => {
  const out = normalizePresetDefaultsForModel({ provider: "mock", model: "mock-v1", defaultParams: { size: "1536x864", quality: "high" } });
  assert.equal(out.size, "1536x864");
  assert.equal(out.quality, "high");
});
