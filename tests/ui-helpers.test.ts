import test from "node:test";
import assert from "node:assert/strict";
import { getChecklistItemTone, getTaskModeLabel, getTaskProviderLabel } from "@/components/studio/ui-helpers";

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
