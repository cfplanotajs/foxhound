export type TaskLikeStatus = "queued" | "processing" | "completed" | "failed";
export type JobAggregateStatus = "completed" | "partial_failed" | "failed";

export function aggregateJobStatus(statuses: TaskLikeStatus[]): JobAggregateStatus {
  if (statuses.length === 0) {
    return "failed";
  }

  const allFailed = statuses.every((status) => status === "failed");
  const anyFailed = statuses.some((status) => status === "failed");
  return allFailed ? "failed" : anyFailed ? "partial_failed" : "completed";
}

export function canClaimQueued(currentStatus: TaskLikeStatus): boolean {
  return currentStatus === "queued";
}
