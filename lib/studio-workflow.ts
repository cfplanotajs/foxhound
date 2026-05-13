export type WorkflowStepKey = "choose" | "generate" | "edit" | "review" | "export";
export type StepState = "pending" | "active" | "complete";

export type WorkflowInput = {
  presetId: string;
  singlePrompt: string;
  bulkPrompts: string;
  jobId: string;
  tasks: Array<{ status: string; mode?: "generate" | "edit"; reviewStatus?: "approved" | "favorite" | "rejected" | "unreviewed" }>;
};

export function getStudioWorkflow(input: WorkflowInput) {
  const hasPreset = Boolean(input.presetId);
  const hasPrompt = Boolean(input.singlePrompt.trim() || input.bulkPrompts.trim());
  const hasJob = Boolean(input.jobId);
  const completed = input.tasks.filter((t) => t.status === "completed");
  const hasCompleted = completed.length > 0;
  const hasEdited = completed.some((t) => t.mode === "edit");
  const approvedCount = completed.filter((t) => t.reviewStatus === "approved").length;
  const isProcessing = input.tasks.some((t) => t.status === "queued" || t.status === "processing");

  let nextAction = "Choose a preset";
  let helper = "Pick a visual style preset to begin the demo workflow.";
  let active: WorkflowStepKey = "choose";

  if (hasPreset && !hasPrompt) {
    nextAction = "Write a prompt";
    helper = "Use a starter prompt and describe what you want to generate.";
  } else if (hasPreset && hasPrompt && !hasJob) {
    nextAction = "Generate images";
    helper = "Pick a starter prompt and generate 4 variations.";
    active = "generate";
  } else if (isProcessing) {
    nextAction = "Generate images";
    helper = "Worker is creating your images…";
    active = "generate";
  } else if (hasCompleted && !hasEdited) {
    nextAction = "Edit your best result";
    helper = "Open an image and click Edit Image to create a refined version.";
    active = "edit";
  } else if (hasEdited && approvedCount === 0) {
    nextAction = "Approve an image";
    helper = "Compare original vs edited, then mark one Approved.";
    active = "review";
  } else if (approvedCount > 0) {
    nextAction = "Download approved ZIP";
    helper = "Great—export your approved images as a ready-to-use ZIP.";
    active = "export";
  }

  const stepState = (key: WorkflowStepKey): StepState => {
    if (key === "choose") return hasPreset ? "complete" : active === key ? "active" : "pending";
    if (key === "generate") return hasCompleted || isProcessing ? (hasCompleted ? "complete" : "active") : active === key ? "active" : "pending";
    if (key === "edit") return hasEdited ? "complete" : active === key ? "active" : "pending";
    if (key === "review") return approvedCount > 0 ? "complete" : active === key ? "active" : "pending";
    return approvedCount > 0 ? "active" : "pending";
  };

  return {
    steps: [
      { key: "choose" as const, label: "Choose preset", state: stepState("choose") },
      { key: "generate" as const, label: "Generate", state: stepState("generate") },
      { key: "edit" as const, label: "Edit", state: stepState("edit") },
      { key: "review" as const, label: "Review", state: stepState("review") },
      { key: "export" as const, label: "Export", state: stepState("export") }
    ],
    nextAction,
    helper,
    approvedCount,
    hasEdited,
    isProcessing,
    checklist: {
      generated: hasCompleted,
      edited: hasEdited,
      compared: hasEdited,
      approved: approvedCount > 0,
      exported: approvedCount > 0
    }
  };
}
