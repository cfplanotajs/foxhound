import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parseJsonBody } from "@/lib/jobs/json-body";

function parseRequiredBoolean(value: unknown): { ok: true; value: boolean } | { ok: false } {
  if (typeof value !== "boolean") return { ok: false };
  return { ok: true, value };
}

export async function POST(request: Request, { params }: { params: Promise<{ projectId: string; folderId: string }> }) {
  try {
    const { projectId, folderId } = await params;
    const parsed = await parseJsonBody(request);
    if (!parsed.ok) return NextResponse.json({ error: "Malformed JSON request body." }, { status: 400 });

    const body = parsed.data as { isArchived?: unknown };
    const archived = parseRequiredBoolean(body?.isArchived);
    if (!archived.ok) return NextResponse.json({ error: "isArchived must be a boolean." }, { status: 400 });

    const folder = await prisma.projectFolder.findUnique({ where: { id: folderId } });
    if (!folder || folder.projectId !== projectId) return NextResponse.json({ error: "Folder not found." }, { status: 404 });

    await prisma.projectFolder.update({ where: { id: folderId }, data: { isArchived: archived.value } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
