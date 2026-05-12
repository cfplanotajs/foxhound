import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

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
  const body = await request.json();
  const name = String(body?.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "Project name is required." }, { status: 400 });
  const project = await prisma.project.create({ data: { name, stableKey: toStableKey(body?.stableKey || name), description: body?.description?.trim() || null } });
  return NextResponse.json({ projectId: project.id });
}
