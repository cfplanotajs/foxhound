import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiToken } from "@/lib/env";

export async function GET(request: Request, { params }: { params: Promise<{ jobId: string }> }) {
  try {
    requireApiToken(request);
    const { jobId } = await params;
    const tasks = await prisma.generationTask.findMany({ where: { jobId }, orderBy: { createdAt: "asc" } });

    return NextResponse.json({
      tasks: tasks.map((task) => ({
        ...task,
        imageUrl: task.outputPath ? `/api/images/${jobId}/${task.id}` : null
      }))
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "Unknown error" }, { status: 500 });
  }
}
