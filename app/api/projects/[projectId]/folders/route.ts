import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parseJsonBody } from "@/lib/jobs/json-body";

function toStableKey(input: string) { return input.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "_"); }

export async function POST(request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    const { projectId } = await params;
    const parsed = await parseJsonBody(request);
    if (!parsed.ok) return NextResponse.json({ error: "Malformed JSON request body." }, { status: 400 });
    const body = parsed.data as { name?: unknown; stableKey?: unknown; description?: string };
    const name = String(body?.name ?? "").trim();
    if (!name) return NextResponse.json({ error: "Folder name is required." }, { status: 400 });
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });
    if (project.isArchived) return NextResponse.json({ error: "Archived project cannot be used for new folders." }, { status: 400 });
    const stableKey = toStableKey(String(body?.stableKey || name));
    if (!stableKey) return NextResponse.json({ error: "Folder stableKey is required." }, { status: 400 });
    const folder = await prisma.projectFolder.create({ data: { projectId, name, stableKey, description: body?.description?.trim() || null } });
    return NextResponse.json({ folderId: folder.id });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "P2002") {
      return NextResponse.json({ error: "Folder stableKey already exists." }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
