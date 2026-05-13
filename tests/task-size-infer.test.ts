import test from "node:test";
import assert from "node:assert/strict";
import { inferAspectRatioFromSize } from "../lib/jobs/task-size.ts";

test("inferAspectRatioFromSize returns 1:1 for valid square sizes", () => {
  assert.equal(inferAspectRatioFromSize("256x256"), "1:1");
  assert.equal(inferAspectRatioFromSize("512x512"), "1:1");
  assert.equal(inferAspectRatioFromSize("1024x1024"), "1:1");
  assert.equal(inferAspectRatioFromSize("1536x1536"), "1:1");
});

test("inferAspectRatioFromSize preserves known non-square mappings", () => {
  assert.equal(inferAspectRatioFromSize("1536x1024"), "3:2");
  assert.equal(inferAspectRatioFromSize("1024x1536"), "2:3");
  assert.equal(inferAspectRatioFromSize("1536x1152"), "4:3");
  assert.equal(inferAspectRatioFromSize("1152x2048"), "9:16");
  assert.equal(inferAspectRatioFromSize("1536x864"), "16:9");
  assert.equal(inferAspectRatioFromSize("1792x1024"), "16:9");
  assert.equal(inferAspectRatioFromSize("1024x1792"), "9:16");
});

test("inferAspectRatioFromSize returns null for invalid strings", () => {
  for (const s of ["", "abc", "1024", "1024x", "0x0", "-1x-1", "1024xabc"]) {
    assert.equal(inferAspectRatioFromSize(s), null);
  }
});
