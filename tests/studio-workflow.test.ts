import test from "node:test";
import assert from "node:assert/strict";
import { getStudioWorkflow } from "@/lib/studio-workflow";

const base = { presetId: "", singlePrompt: "", bulkPrompts: "", jobId: "", tasks: [] as any[] };

test("empty state focuses choose preset", () => {
  const wf = getStudioWorkflow(base);
  assert.equal(wf.nextAction, "Choose a preset");
  assert.equal(wf.steps[0].state, "active");
  assert.equal(wf.nextActionHint, "Pick a preset and try a starter prompt.");
});

test("preset + prompt no job focuses generate", () => {
  const wf = getStudioWorkflow({ ...base, presetId: "p1", singlePrompt: "cat" });
  assert.equal(wf.nextAction, "Generate images");
  assert.equal(wf.focusKey, "generate");
});

test("processing job keeps generate active", () => {
  const wf = getStudioWorkflow({ ...base, presetId: "p1", singlePrompt: "cat", jobId: "j1", tasks: [{ status: "processing" }] });
  assert.equal(wf.isProcessing, true);
  assert.equal(wf.processingCount, 1);
});

test("completed generated image focuses edit", () => {
  const wf = getStudioWorkflow({ ...base, jobId: "j1", tasks: [{ status: "completed", mode: "generate" }] });
  assert.equal(wf.nextAction, "Edit your best result");
  assert.equal(wf.successMessage, "Images ready to review.");
});

test("compare fallback and compareOpened override", () => {
  const edited = { status: "completed", mode: "edit" as const };
  const wfFallback = getStudioWorkflow({ ...base, jobId: "j1", tasks: [edited], compareOpened: false });
  assert.equal(wfFallback.checklist.compared, true);
  const wfOpened = getStudioWorkflow({ ...base, jobId: "j1", tasks: [edited], compareOpened: true });
  assert.equal(wfOpened.checklist.compared, true);
});

test("approved image focuses export", () => {
  const wf = getStudioWorkflow({ ...base, jobId: "j1", tasks: [{ status: "completed", mode: "edit", reviewStatus: "approved" }] });
  assert.equal(wf.nextAction, "Download approved ZIP");
  assert.equal(wf.approvedCount, 1);
  assert.equal(wf.successMessage, "Approved assets are ready to export.");
});
