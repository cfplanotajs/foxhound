const DEFAULT_BASE_URL = "http://localhost:3000";

export function resolveBaseUrl(args: string[]): string {
  const value = args[0] || process.env.FOXHOUND_BASE_URL || DEFAULT_BASE_URL;
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

async function checkJson(url: string): Promise<{ ok: boolean; status: number; body: any }> {
  const response = await fetch(url, { method: "GET" });
  let body: any = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }
  return { ok: response.ok, status: response.status, body };
}

export async function runSmokeCheck(args: string[] = process.argv.slice(2)): Promise<number> {
  const baseUrl = resolveBaseUrl(args);
  try {
    const health = await checkJson(`${baseUrl}/api/health`);
    if (!(health.status === 200 && health.body?.status === "ok")) {
      console.error(`[smoke] fail health status=${health.status}`);
      return 1;
    }

    const presets = await checkJson(`${baseUrl}/api/presets`);
    if (!(presets.ok && Array.isArray(presets.body?.presets))) {
      console.error(`[smoke] fail presets status=${presets.status}`);
      return 1;
    }

    const projects = await checkJson(`${baseUrl}/api/projects`);
    if (!(projects.ok && Array.isArray(projects.body?.projects))) {
      console.error(`[smoke] fail projects status=${projects.status}`);
      return 1;
    }

    console.info(`[smoke] ok base=${baseUrl} presets=${presets.body.presets.length} projects=${projects.body.projects.length}`);
    return 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    console.error(`[smoke] unreachable ${baseUrl}: ${message}`);
    return 1;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runSmokeCheck().then((code) => {
    process.exitCode = code;
  });
}
