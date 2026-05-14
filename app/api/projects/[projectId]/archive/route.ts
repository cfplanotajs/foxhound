import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parseJsonBody } from "@/lib/jobs/json-body";

function parseRequiredBoolean(value: unknown): { ok: true; value: boolean } | { ok: false } {
  if (typeof value !== "boolean") return { ok: false };
  return { ok: true, value };
}

export async function POST(request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    const { projectId } = await params;
    const parsed = await parseJsonBody(request);
    if (!parsed.ok) return NextResponse.json({ error: "Malformed JSON request body." }, { status: 400 });

    const body = parsed.data as { isArchived?: unknown };
    const archived = parseRequiredBoolean(body?.isArchived);
    if (!archived.ok) return NextResponse.json({ error: "isArchived must be a boolean." }, { status: 400 });

    await prisma.project.update({ where: { id: projectId }, data: { isArchived: archived.value } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if ((error as { code?: string })?.code === "P2025") {
      return NextResponse.json({ error: "Project not found." }, { status: 404 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
