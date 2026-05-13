import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parseJsonBody } from "@/lib/jobs/json-body";

function toStableKey(input: string) { return input.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "_"); }

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const includeArchived = searchParams.get("includeArchived") === "1";
  const projects = await prisma.project.findMany({
    where: includeArchived ? {} : { isArchived: false },
    orderBy: { updatedAt: "desc" },
    include: { folders: { where: includeArchived ? {} : { isArchived: false }, orderBy: { updatedAt: "desc" } } }
  });
  return NextResponse.json({ projects });
}

export async function POST(request: Request) {
  try {
    const parsed = await parseJsonBody(request);
    if (!parsed.ok) return NextResponse.json({ error: "Malformed JSON request body." }, { status: 400 });
    const body = parsed.data as { name?: unknown; stableKey?: unknown; description?: string };
    const name = String(body?.name ?? "").trim();
    if (!name) return NextResponse.json({ error: "Project name is required." }, { status: 400 });
    const stableKey = toStableKey(String(body?.stableKey || name));
    if (!stableKey) return NextResponse.json({ error: "Project stableKey is required." }, { status: 400 });
    const project = await prisma.project.create({ data: { name, stableKey, description: body?.description?.trim() || null } });
    return NextResponse.json({ projectId: project.id });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "P2002") {
      return NextResponse.json({ error: "Project stableKey already exists." }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
