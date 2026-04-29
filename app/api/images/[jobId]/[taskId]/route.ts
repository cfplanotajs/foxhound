import fs from "node:fs/promises";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiToken } from "@/lib/env";

export async function GET(request: Request, { params }: { params: Promise<{ jobId: string; taskId: string }> }) {
  try {
    requireApiToken(request);
    const { jobId, taskId } = await params;
    const task = await prisma.generationTask.findFirst({ where: { id: taskId, jobId } });
    if (!task?.outputPath) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const bytes = await fs.readFile(task.outputPath);
    return new NextResponse(bytes, { headers: { "Content-Type": "image/png" } });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "Unknown error" }, { status: 500 });
  }
}
