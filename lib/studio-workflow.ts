export type WorkflowStepKey = "choose" | "generate" | "edit" | "review" | "export";
export type StepState = "pending" | "active" | "complete";

export type WorkflowInput = {
  presetId: string;
  singlePrompt: string;
  bulkPrompts: string;
  jobId: string;
  compareOpened?: boolean;
  tasks: Array<{ status: string; mode?: "generate" | "edit"; reviewStatus?: "approved" | "favorite" | "rejected" | "unreviewed" }>;
};

export function getNextActionHint(nextAction: string) {
  if (nextAction === "Choose a preset" || nextAction === "Write a prompt") return "Pick a preset and try a starter prompt.";
  if (nextAction === "Generate images") return "Click Generate Images.";
  if (nextAction === "Edit your best result") return "Choose your best image and click Edit.";
  if (nextAction === "Approve an image") return "Click Compare, then approve your best result.";
  return "Download Approved ZIP.";
}

export function getStudioWorkflow(input: WorkflowInput) {
  const hasPreset = Boolean(input.presetId);
  const hasPrompt = Boolean(input.singlePrompt.trim() || input.bulkPrompts.trim());
  const hasJob = Boolean(input.jobId);
  const completed = input.tasks.filter((t) => t.status === "completed");
  const hasCompleted = completed.length > 0;
  const hasEdited = completed.some((t) => t.mode === "edit");
  const approvedCount = completed.filter((t) => t.reviewStatus === "approved").length;
  const isProcessing = input.tasks.some((t) => t.status === "queued" || t.status === "processing");
  const processingCount = input.tasks.filter((t) => t.status === "processing").length;
  const queuedCount = input.tasks.filter((t) => t.status === "queued").length;
  const compared = Boolean(input.compareOpened || hasEdited);

  let nextAction = "Choose a preset";
  let helper = "Pick a visual style preset to begin the demo workflow.";
  let active: WorkflowStepKey = "choose";

  if (hasPreset && !hasPrompt) helper = "Use a starter prompt and describe what you want to generate.";
  else if (hasPreset && hasPrompt && !hasJob) { nextAction = "Generate images"; helper = "Pick a starter prompt and generate 4 variations."; active = "generate"; }
  else if (isProcessing) { nextAction = "Generate images"; helper = "Worker is creating your images…"; active = "generate"; }
  else if (hasCompleted && !hasEdited) { nextAction = "Edit your best result"; helper = "Open an image and click Edit Image to create a refined version."; active = "edit"; }
  else if (hasEdited && approvedCount === 0) { nextAction = "Approve an image"; helper = "Compare original vs edited, then mark one Approved."; active = "review"; }
  else if (approvedCount > 0) { nextAction = "Download approved ZIP"; helper = "Great—export your approved images as a ready-to-use ZIP."; active = "export"; }

  const successMessage = approvedCount > 0 ? "Approved assets are ready to export." : hasEdited ? "Edited results are ready to compare." : hasCompleted ? "Images ready to review." : "";

  const stepState = (key: WorkflowStepKey): StepState => {
    if (key === "choose") return hasPreset ? "complete" : active === key ? "active" : "pending";
    if (key === "generate") return hasCompleted || isProcessing ? (hasCompleted ? "complete" : "active") : active === key ? "active" : "pending";
    if (key === "edit") return hasEdited ? "complete" : active === key ? "active" : "pending";
    if (key === "review") return approvedCount > 0 ? "complete" : active === key ? "active" : "pending";
    return approvedCount > 0 ? "active" : "pending";
  };

  return { steps: [
      { key: "choose" as const, label: "Choose preset", state: stepState("choose") },
      { key: "generate" as const, label: "Generate", state: stepState("generate") },
      { key: "edit" as const, label: "Edit", state: stepState("edit") },
      { key: "review" as const, label: "Review", state: stepState("review") },
      { key: "export" as const, label: "Export", state: stepState("export") }],
    nextAction, helper, nextActionHint: getNextActionHint(nextAction), focusKey: active, successMessage, approvedCount, hasEdited, isProcessing, processingCount, queuedCount,
    checklist: { generated: hasCompleted, edited: hasEdited, compared, approved: approvedCount > 0, exported: approvedCount > 0 }
  };
}
