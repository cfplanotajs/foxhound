import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(_request: Request, { params }: { params: Promise<{ jobId: string }> }) {
  try {
    const { jobId } = await params;
    const tasks = await prisma.generationTask.findMany({ where: { jobId }, orderBy: { createdAt: "asc" } });

    return NextResponse.json({
      tasks: tasks.map((task: { outputPath: string | null; id: string }) => ({
        ...task,
        imageUrl: task.outputPath ? `/api/images/${jobId}/${task.id}` : null
      }))
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
