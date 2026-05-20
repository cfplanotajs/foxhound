import test from "node:test";
import assert from "node:assert/strict";
import { appendEditChip, buildEditRequestPayload, canEditTask } from "../lib/jobs/edit-ui.ts";

test("canEditTask true only for completed task with image", () => {
  assert.equal(canEditTask({ status: "completed", imageUrl: "/api/images/x" }), true);
  assert.equal(canEditTask({ status: "failed", imageUrl: "/api/images/x" }), false);
  assert.equal(canEditTask({ status: "completed", imageUrl: null }), false);
});

test("appendEditChip appends sentence", () => {
  assert.equal(appendEditChip("", "Clean up artifacts"), "Clean up artifacts");
  assert.equal(appendEditChip("Keep style", "Remove text"), "Keep style. Remove text");
});

test("buildEditRequestPayload includes core fields", () => {
  const out = buildEditRequestPayload({ presetId: "p1", provider: "mock", model: "mock-v1", editInstruction: "White bg", variationCount: 2, quality: "high", aspectRatio: "1:1", constraints: "none", projectId: "pr1", folderId: "fo1" });
  assert.equal(out.presetId, "p1");
  assert.equal(out.editInstruction, "White bg");
  assert.equal(out.variationCount, 2);
  assert.equal(out.folderId, "fo1");
});
