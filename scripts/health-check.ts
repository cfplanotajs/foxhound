const DEFAULT_HEALTH_URL = "http://localhost:3000/api/health";

type HealthBody = { status?: string; app?: string; database?: string; storage?: string; timestamp?: string };

function resolveHealthUrl(args: string[]): string {
  return args[0] || process.env.FOXHOUND_HEALTH_URL || DEFAULT_HEALTH_URL;
}

export async function runHealthCheck(args: string[] = process.argv.slice(2)): Promise<number> {
  const url = resolveHealthUrl(args);
  try {
    const response = await fetch(url, { method: "GET" });
    const body = (await response.json()) as HealthBody;
    const healthy = response.status === 200 && body?.status === "ok";
    if (healthy) {
      console.info(`[health] ok ${url} db=${body.database ?? "?"} storage=${body.storage ?? "?"}`);
      return 0;
    }
    console.error(`[health] fail ${url} status=${response.status} body_status=${body?.status ?? "unknown"}`);
    return 1;
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    console.error(`[health] unreachable ${url}: ${message}`);
    return 1;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runHealthCheck().then((code) => {
    process.exitCode = code;
  });
}
