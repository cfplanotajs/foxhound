import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(request: Request, { params }: { params: Promise<{ projectId: string; folderId: string }> }) {
  const { projectId, folderId } = await params;
  const body = await request.json();
  const folder = await prisma.projectFolder.findUnique({ where: { id: folderId } });
  if (!folder || folder.projectId !== projectId) return NextResponse.json({ error: "Folder not found." }, { status: 404 });
  await prisma.projectFolder.update({ where: { id: folderId }, data: { isArchived: !!body?.isArchived } });
  return NextResponse.json({ ok: true });
}
