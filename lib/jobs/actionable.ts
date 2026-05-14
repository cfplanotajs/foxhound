export interface RetryTaskLite {
  status: string;
  attempts: number;
  maxAttempts: number;
  nextAttemptAt?: Date | null;
}

export function hasActionableTask(tasks: RetryTaskLite[], now: Date): boolean {
  return tasks.some((t) => t.status === "queued" || (t.status === "failed" && t.attempts < t.maxAttempts && !!t.nextAttemptAt && t.nextAttemptAt <= now));
}

export function shouldRequeueAfterPass(tasks: RetryTaskLite[], now: Date): boolean {
  return tasks.some(
    (t) =>
      t.status === "queued" ||
      (t.status === "failed" && t.attempts < t.maxAttempts && !!t.nextAttemptAt && (t.nextAttemptAt <= now || t.nextAttemptAt > now))
  );
}
