import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiToken } from "@/lib/env";

export async function GET(request: Request, { params }: { params: Promise<{ jobId: string }> }) {
  try {
    requireApiToken(request);
    const { jobId } = await params;
    const job = await prisma.generationJob.findUnique({ where: { id: jobId }, include: { tasks: true } });
    if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ job });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
