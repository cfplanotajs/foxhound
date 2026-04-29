import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getProvider } from "@/lib/providers";
import { saveImage } from "@/lib/storage";

export async function POST() {
  try {
    const queued = await prisma.generationJob.findFirst({ where: { status: "queued" }, orderBy: { createdAt: "asc" } });
    if (!queued) return NextResponse.json({ message: "No queued jobs" });

    const claim = await prisma.generationJob.updateMany({
      where: { id: queued.id, status: "queued" },
      data: { status: "processing", startedAt: new Date() }
    });
    if (claim.count !== 1) return NextResponse.json({ message: "Job already claimed" });

    const provider = getProvider(queued.provider as "openai");
    const tasks = await prisma.generationTask.findMany({
      where: { jobId: queued.id, status: "queued" },
      orderBy: { createdAt: "asc" }
    });

    for (const task of tasks) {
      const taskClaim = await prisma.generationTask.updateMany({
        where: { id: task.id, status: "queued" },
        data: { status: "processing", startedAt: new Date() }
      });
      if (taskClaim.count !== 1) continue;

      try {
        const result = await provider.generateImage({
          provider: queued.provider as "openai",
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

    const finishedTasks = await prisma.generationTask.findMany({ where: { jobId: queued.id } });
    const allFailed = finishedTasks.every((t) => t.status === "failed");
    const anyFailed = finishedTasks.some((t) => t.status === "failed");
    await prisma.generationJob.update({
      where: { id: queued.id },
      data: {
        status: allFailed ? "failed" : anyFailed ? "partial_failed" : "completed",
        completedAt: new Date()
      }
    });

    return NextResponse.json({ processedJobId: queued.id });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
