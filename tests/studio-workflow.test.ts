import test from "node:test";
import assert from "node:assert/strict";
import { getStudioWorkflow } from "@/lib/studio-workflow";

const base = { presetId: "", singlePrompt: "", bulkPrompts: "", jobId: "", tasks: [] as any[] };

test("empty state focuses choose preset", () => {
  const wf = getStudioWorkflow(base);
  assert.equal(wf.nextAction, "Choose a preset");
  assert.equal(wf.steps[0].state, "active");
});

test("preset + prompt no job focuses generate", () => {
  const wf = getStudioWorkflow({ ...base, presetId: "p1", singlePrompt: "cat" });
  assert.equal(wf.nextAction, "Generate images");
});

test("processing job keeps generate active", () => {
  const wf = getStudioWorkflow({ ...base, presetId: "p1", singlePrompt: "cat", jobId: "j1", tasks: [{ status: "processing" }] });
  assert.equal(wf.isProcessing, true);
  assert.equal(wf.steps[1].state, "active");
});

test("completed generated image focuses edit", () => {
  const wf = getStudioWorkflow({ ...base, jobId: "j1", tasks: [{ status: "completed", mode: "generate" }] });
  assert.equal(wf.nextAction, "Edit your best result");
});

test("edited image focuses review", () => {
  const wf = getStudioWorkflow({ ...base, jobId: "j1", tasks: [{ status: "completed", mode: "edit" }] });
  assert.equal(wf.nextAction, "Approve an image");
});

test("approved image focuses export", () => {
  const wf = getStudioWorkflow({ ...base, jobId: "j1", tasks: [{ status: "completed", mode: "edit", reviewStatus: "approved" }] });
  assert.equal(wf.nextAction, "Download approved ZIP");
  assert.equal(wf.approvedCount, 1);
});

test("checklist flags follow state", () => {
  const wf = getStudioWorkflow({ ...base, jobId: "j1", tasks: [{ status: "completed", mode: "generate" }, { status: "completed", mode: "edit", reviewStatus: "approved" }] });
  assert.equal(wf.checklist.generated, true);
  assert.equal(wf.checklist.edited, true);
  assert.equal(wf.checklist.approved, true);
});
