import test from "node:test";
import assert from "node:assert/strict";
import { resolveFinalTaskSize } from "../lib/jobs/task-size.ts";

test("resolveFinalTaskSize preserves preset default size when no aspect ratio is provided", () => {
  const out = resolveFinalTaskSize({ model: "gpt-image-1", presetDefaultSize: "1536x1024" });
  assert.equal(out.ok, true);
  assert.equal(out.finalSize, "1536x1024");
});

test("resolveFinalTaskSize uses explicit aspect ratio when provided", () => {
  const out = resolveFinalTaskSize({ model: "gpt-image-1", presetDefaultSize: "1536x1024", aspectRatio: "1:1" });
  assert.equal(out.ok, true);
  assert.equal(out.finalSize, "1024x1024");
});
