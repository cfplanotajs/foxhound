import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const body = await request.json();
  await prisma.project.update({ where: { id: projectId }, data: { isArchived: !!body?.isArchived } });
  return NextResponse.json({ ok: true });
}
