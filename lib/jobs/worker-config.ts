export function parsePositiveIntEnv(value: string | undefined, fallback: number, min = 1, max = 25): number {
  const trimmed = value?.trim();
  if (!trimmed) return fallback;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || !Number.isInteger(n)) return fallback;
  if (n < min) return min;
  if (n > max) return max;
  return n;
}

export function getWorkerMaxAttempts(): number {
  return parsePositiveIntEnv(process.env.WORKER_MAX_ATTEMPTS, 3, 1, 25);
}

export function getWorkerRetryBaseMs(): number {
  return parsePositiveIntEnv(process.env.WORKER_RETRY_BASE_MS, 5000, 1000, 300000);
}

export function getWorkerPollIntervalMs(): number {
  return parsePositiveIntEnv(process.env.WORKER_POLL_INTERVAL_MS, 5000, 1000, 300000);
}
