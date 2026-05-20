import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { toClientTaskDto } from "@/lib/jobs/image-dto";

export async function GET(_request: Request, { params }: { params: Promise<{ jobId: string }> }) {
  try {
    const { jobId } = await params;
    const job = await prisma.generationJob.findUnique({ where: { id: jobId }, include: { tasks: true } });
    if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({
      job: {
        id: job.id,
        status: job.status,
        mode: job.mode,
        provider: job.provider,
        model: job.model,
        sourceJobId: job.sourceJobId,
        sourceTaskId: job.sourceTaskId,
        editInstruction: job.editInstruction,
        projectId: job.projectId,
        folderId: job.folderId,
        createdAt: job.createdAt,
        completedAt: job.completedAt,
        tasks: job.tasks.map(toClientTaskDto)
      }
    });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
