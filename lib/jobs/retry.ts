export function computeBackoffMs(attempts: number, baseMs = 5000): number {
  return baseMs * Math.max(1, attempts);
}

export function shouldRetry(attempts: number, maxAttempts: number): boolean {
  return attempts < maxAttempts;
}
