import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getProvider } from "@/lib/providers";
import { saveImage } from "@/lib/storage";
import { requireApiToken } from "@/lib/env";

export async function POST(request: Request) {
  try {
    requireApiToken(request);
    const queuedJob = await prisma.generationJob.findFirst({ where: { status: "queued" }, orderBy: { createdAt: "asc" } });
    if (!queuedJob) return NextResponse.json({ message: "No queued jobs" });

    await prisma.generationJob.update({ where: { id: queuedJob.id }, data: { status: "processing", startedAt: new Date() } });
    const tasks = await prisma.generationTask.findMany({ where: { jobId: queuedJob.id }, orderBy: { createdAt: "asc" } });
    const provider = getProvider(queuedJob.provider as "openai");

    for (const task of tasks) {
      await prisma.generationTask.update({ where: { id: task.id }, data: { status: "processing", startedAt: new Date() } });
      try {
        const result = await provider.generateImage({
          provider: queuedJob.provider as "openai",
          model: task.model,
          prompt: task.finalPrompt,
          size: "1024x1024",
          quality: "high",
          count: 1
        });

        const outputPath = await saveImage(task.jobId, task.id, result.images[0].bytes);
        await prisma.generationTask.update({
          where: { id: task.id },
          data: {
            status: "completed",
            outputPath,
            responseMetadataJson: JSON.stringify(result.providerMetadata),
            completedAt: new Date()
          }
        });
      } catch (error) {
        await prisma.generationTask.update({
          where: { id: task.id },
          data: {
            status: "failed",
            errorMessage: error instanceof Error ? error.message : "Unknown provider error",
            completedAt: new Date()
          }
        });
      }
    }

    const finishedTasks = await prisma.generationTask.findMany({ where: { jobId: queuedJob.id } });
    const allFailed = finishedTasks.every((t) => t.status === "failed");
    const anyFailed = finishedTasks.some((t) => t.status === "failed");
    await prisma.generationJob.update({
      where: { id: queuedJob.id },
      data: {
        status: allFailed ? "failed" : anyFailed ? "partial_failed" : "completed",
        completedAt: new Date()
      }
    });

    return NextResponse.json({ processedJobId: queuedJob.id });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
