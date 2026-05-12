export async function parseJsonBody(request: Request): Promise<{ ok: true; data: unknown } | { ok: false }> {
  try {
    const data = await request.json();
    return { ok: true, data };
  } catch {
    return { ok: false };
  }
}
