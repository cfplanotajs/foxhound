import test from "node:test";
import assert from "node:assert/strict";
import { IMAGE_RATIO_PRESETS, resolveSizeForModel } from "../lib/providers/image-size-presets.ts";

test("ratio preset list remains stable", () => {
  assert.deepEqual(IMAGE_RATIO_PRESETS.map((p) => p.id), ["1:1", "2:3", "4:6", "4:3", "3:2", "9:16", "16:9"]);
});

test("gpt-image-2 accepts key ratios", () => {
  for (const ratio of ["1:1", "2:3", "4:3", "9:16", "16:9"]) {
    assert.ok(resolveSizeForModel("gpt-image-2", ratio));
  }
});

test("dall-e-3 uses model-specific widescreen/vertical sizes", () => {
  assert.equal(resolveSizeForModel("dall-e-3", "1:1"), "1024x1024");
  assert.equal(resolveSizeForModel("dall-e-3", "16:9"), "1792x1024");
  assert.equal(resolveSizeForModel("dall-e-3", "9:16"), "1024x1792");
  assert.equal(resolveSizeForModel("dall-e-3", "3:2"), null);
});

test("dall-e-2 only supports square", () => {
  assert.equal(resolveSizeForModel("dall-e-2", "1:1"), "1024x1024");
  assert.equal(resolveSizeForModel("dall-e-2", "16:9"), null);
  assert.equal(resolveSizeForModel("dall-e-2", "9:16"), null);
});

test("unsupported model/ratio fails clearly via null", () => {
  assert.equal(resolveSizeForModel("unknown-model", "16:9"), null);
});
