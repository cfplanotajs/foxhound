import { aggregateJobStatus, TaskLikeStatus } from "@/lib/jobs/status";

export interface StalledTask {
  id: string;
  status: string;
  attempts: number;
  maxAttempts: number;
  nextAttemptAt: Date | null;
}

export function isJobStalled(stalledRefAt: Date | null, now: Date, stalledAfterMs: number): boolean {
  if (!stalledRefAt) return false;
  return stalledRefAt.getTime() <= now.getTime() - stalledAfterMs;
}

export function getStalledReferenceTime(job: { processingHeartbeatAt?: Date | null; startedAt?: Date | null }): Date | null {
  return job.processingHeartbeatAt ?? job.startedAt ?? null;
}

export function shouldRetryAfterStall(task: StalledTask): boolean {
  return task.status === "processing" && task.attempts + 1 < task.maxAttempts;
}

function isRetryScheduled(task: { status: string; attempts: number; maxAttempts: number; nextAttemptAt: Date | null }): boolean {
  return task.status === "failed" && task.attempts < task.maxAttempts && !!task.nextAttemptAt;
}

export function reconcileJobStatusFromTasks(tasks: Array<{ status: string; attempts: number; maxAttempts: number; nextAttemptAt: Date | null }>): "queued" | "completed" | "partial_failed" | "failed" {
  const hasUnresolved = tasks.some((t) => t.status === "queued" || isRetryScheduled(t));
  if (hasUnresolved) return "queued";
  return aggregateJobStatus(tasks.map((t) => t.status as TaskLikeStatus));
}
