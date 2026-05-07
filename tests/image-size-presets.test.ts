import test from "node:test";
import assert from "node:assert/strict";
import { IMAGE_RATIO_PRESETS, resolveSizeForModel } from "../lib/providers/image-size-presets.ts";

test("all ratio presets are multiples of 16", () => {
  for (const p of IMAGE_RATIO_PRESETS) {
    const [w, h] = p.size.split("x").map(Number);
    assert.equal(w % 16, 0);
    assert.equal(h % 16, 0);
  }
});

test("gpt-image-2 accepts key ratios", () => {
  for (const ratio of ["1:1", "2:3", "4:3", "9:16", "16:9"]) {
    assert.ok(resolveSizeForModel("gpt-image-2", ratio));
  }
});

test("unsupported model/ratio fails clearly via null", () => {
  assert.equal(resolveSizeForModel("dall-e-2", "16:9"), null);
});
