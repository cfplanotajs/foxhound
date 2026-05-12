import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId");
  const folderId = searchParams.get("folderId");
  const jobs = await prisma.generationJob.findMany({
    where: { ...(projectId ? { projectId } : {}), ...(folderId ? { folderId } : {}) },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: { tasks: { orderBy: { createdAt: "asc" } }, project: true, folder: true }
  });

  return NextResponse.json({
    jobs: jobs.map((job: any) => {
      const tasks = job.tasks;
      return {
        id: job.id,
        status: job.status,
        provider: job.provider,
        model: job.model,
        createdAt: job.createdAt,
        presetName: tasks[0]?.presetName ?? null,
        presetVersion: tasks[0]?.presetVersion ?? null,
        projectId: job.projectId ?? null,
        folderId: job.folderId ?? null,
        projectName: job.project?.name ?? null,
        folderName: job.folder?.name ?? null,
        counts: {
          completed: tasks.filter((t: any) => t.status === "completed").length,
          failed: tasks.filter((t: any) => t.status === "failed").length,
          queued: tasks.filter((t: any) => t.status === "queued").length,
          processing: tasks.filter((t: any) => t.status === "processing").length
        }
      };
    })
  });
}
