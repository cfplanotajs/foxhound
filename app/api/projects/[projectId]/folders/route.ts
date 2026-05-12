import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

function toStableKey(input: string) { return input.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "_"); }

export async function POST(request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const body = await request.json();
  const name = String(body?.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "Folder name is required." }, { status: 400 });
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });
  const folder = await prisma.projectFolder.create({ data: { projectId, name, stableKey: toStableKey(body?.stableKey || name), description: body?.description?.trim() || null } });
  return NextResponse.json({ folderId: folder.id });
}
