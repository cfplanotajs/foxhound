export function getTaskModeLabel(mode?: "generate" | "edit") {
  return mode === "edit" ? "Edit" : "Generate";
}

export function getTaskProviderLabel(provider: string) {
  return provider === "mock" ? "Demo" : "OpenAI";
}

export function getChecklistItemTone(done: boolean, isNext: boolean) {
  if (done) return "done" as const;
  if (isNext) return "active" as const;
  return "pending" as const;
}
