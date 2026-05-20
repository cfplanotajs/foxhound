import test from "node:test";
import assert from "node:assert/strict";
import { applyJobTemplateToFormState } from "../lib/jobs/template-form.ts";

test("applyJobTemplateToFormState keeps explicit aspect ratio", () => {
  const out = applyJobTemplateToFormState({
    promptLines: ["a"],
    provider: "openai",
    model: "gpt-image-2",
    aspectRatio: "16:9"
  });
  assert.equal(out.aspectRatio, "16:9");
  assert.equal(out.aspectRatioSelection, "16:9");
  assert.equal(out.aspectRatioTouched, true);
});

test("applyJobTemplateToFormState clears touched ratio when missing", () => {
  const out = applyJobTemplateToFormState({
    promptLines: ["a"],
    provider: "openai",
    model: "gpt-image-2",
    aspectRatio: null
  });
  assert.equal(out.aspectRatio, "1:1");
  assert.equal(out.aspectRatioSelection, "preset-default");
  assert.equal(out.aspectRatioTouched, false);
});

test("applyJobTemplateToFormState copies or clears constraints", () => {
  const withConstraints = applyJobTemplateToFormState({
    promptLines: ["a"],
    provider: "openai",
    model: "gpt-image-2",
    constraints: "brand-safe"
  });
  assert.equal(withConstraints.constraints, "brand-safe");

  const withoutConstraints = applyJobTemplateToFormState({
    promptLines: ["a"],
    provider: "openai",
    model: "gpt-image-2",
    constraints: null
  });
  assert.equal(withoutConstraints.constraints, "");
});
