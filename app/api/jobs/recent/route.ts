import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const jobs = await prisma.generationJob.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
    include: { tasks: { orderBy: { createdAt: "asc" } } }
  });

  return NextResponse.json({
    jobs: jobs.map((job) => {
      const tasks = job.tasks;
      return {
        id: job.id,
        status: job.status,
        provider: job.provider,
        model: job.model,
        createdAt: job.createdAt,
        presetName: tasks[0]?.presetName ?? null,
        presetVersion: tasks[0]?.presetVersion ?? null,
        counts: {
          completed: tasks.filter((t) => t.status === "completed").length,
          failed: tasks.filter((t) => t.status === "failed").length,
          queued: tasks.filter((t) => t.status === "queued").length,
          processing: tasks.filter((t) => t.status === "processing").length
        }
      };
    })
  });
}
