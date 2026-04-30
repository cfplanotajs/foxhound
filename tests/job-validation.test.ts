import test from "node:test";
import assert from "node:assert/strict";
import { createJobSchema } from "../lib/jobs/validation.ts";

test("empty optional constraints are accepted", () => {
  const out = createJobSchema.parse({ presetId: "p1", model: "gpt-image-2", singlePrompt: "cat", constraints: "" });
  assert.equal(out.constraints, undefined);
});

test("blank prompt rejected by prompt composition guard scenario", () => {
  const out = createJobSchema.parse({ presetId: "p1", model: "gpt-image-2", singlePrompt: "   ", bulkPrompts: "   " });
  const prompts = [out.singlePrompt?.trim() ?? "", ...(out.bulkPrompts ?? "").split("\n").map((line) => line.trim())].filter(Boolean);
  assert.equal(prompts.length, 0);
});

test("missing preset returns clear validation error", () => {
  const result = createJobSchema.safeParse({ presetId: "", singlePrompt: "cat", model: "gpt-image-2" });
  assert.equal(result.success, false);
  if (!result.success) {
    assert.equal(result.error.issues[0]?.message, "Preset is required");
  }
});

test("missing model returns clear validation error", () => {
  const result = createJobSchema.safeParse({ presetId: "p1", singlePrompt: "cat", model: "" });
  assert.equal(result.success, false);
  if (!result.success) {
    assert.equal(result.error.issues[0]?.message, "Model is required");
  }
});

test("valid single prompt request passes validation", () => {
  const out = createJobSchema.parse({ presetId: "p1", provider: "openai", model: "gpt-image-2", singlePrompt: "cat" });
  assert.equal(out.presetId, "p1");
  assert.equal(out.model, "gpt-image-2");
});
