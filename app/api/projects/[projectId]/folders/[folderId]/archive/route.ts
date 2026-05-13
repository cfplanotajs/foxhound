import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parseJsonBody } from "@/lib/jobs/json-body";

export async function POST(request: Request, { params }: { params: Promise<{ projectId: string; folderId: string }> }) {
  const { projectId, folderId } = await params;
  const parsed = await parseJsonBody(request);
  if (!parsed.ok) return NextResponse.json({ error: "Malformed JSON request body." }, { status: 400 });
  const body = parsed.data as { isArchived?: unknown };
  const folder = await prisma.projectFolder.findUnique({ where: { id: folderId } });
  if (!folder || folder.projectId !== projectId) return NextResponse.json({ error: "Folder not found." }, { status: 404 });
  await prisma.projectFolder.update({ where: { id: folderId }, data: { isArchived: !!body?.isArchived } });
  return NextResponse.json({ ok: true });
}
