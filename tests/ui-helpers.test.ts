import test from "node:test";
import assert from "node:assert/strict";
import { canCompareAsset, getChecklistItemTone, getTaskModeLabel, getTaskProviderLabel } from "@/components/studio/ui-helpers";

test("task labels map clearly", () => {
  assert.equal(getTaskModeLabel("generate"), "Generate");
  assert.equal(getTaskModeLabel("edit"), "Edit");
  assert.equal(getTaskProviderLabel("mock"), "Demo");
  assert.equal(getTaskProviderLabel("openai"), "OpenAI");
});

test("checklist tone prioritizes done then active then pending", () => {
  assert.equal(getChecklistItemTone(true, false), "done");
  assert.equal(getChecklistItemTone(false, true), "active");
  assert.equal(getChecklistItemTone(false, false), "pending");
});


test("compare eligibility is strict", () => {
  assert.equal(canCompareAsset("edit", true, true), true);
  assert.equal(canCompareAsset("edit", false, true), false);
  assert.equal(canCompareAsset("generate", true, true), false);
});
