import { prisma } from "@/lib/db";
import { getProvider } from "@/lib/providers";
import { saveImage } from "@/lib/storage";
import { aggregateJobStatus, TaskLikeStatus } from "@/lib/jobs/status";
import { computeBackoffMs, shouldRetry } from "@/lib/jobs/retry";
import { buildProviderRequest, extractTaskParams } from "@/lib/jobs/provider-payload";

const WORKER_MAX_ATTEMPTS = Number(process.env.WORKER_MAX_ATTEMPTS ?? "3");
const WORKER_RETRY_BASE_MS = Number(process.env.WORKER_RETRY_BASE_MS ?? "5000");

export async function processNextQueuedJob(logger: Pick<Console, "info" | "error"> = console): Promise<string | null> {
  const queued = await prisma.generationJob.findFirst({ where: { status: "queued" }, orderBy: { createdAt: "asc" } });
  if (!queued) return null;

  const claim = await prisma.generationJob.updateMany({
    where: { id: queued.id, status: "queued" },
    data: { status: "processing", startedAt: new Date() }
  });
  if (claim.count !== 1) return null;

  logger.info(`[worker] job claimed ${queued.id}`);
  const provider = getProvider(queued.provider as "openai");

  const now = new Date();
  const tasks = await prisma.generationTask.findMany({
    where: {
      jobId: queued.id,
      OR: [
        { status: "queued" },
        { status: "failed", nextAttemptAt: { lte: now }, attempts: { lt: WORKER_MAX_ATTEMPTS } }
      ]
    },
    orderBy: { createdAt: "asc" }
  });

  for (const task of tasks) {
    const taskClaim = await prisma.generationTask.updateMany({
      where: {
        id: task.id,
        OR: [
          { status: "queued" },
          { status: "failed", attempts: { lt: WORKER_MAX_ATTEMPTS }, nextAttemptAt: { lte: new Date() } }
        ]
      },
      data: { status: "processing", startedAt: new Date() }
    });
    if (taskClaim.count !== 1) continue;

    try {
      const providerRequest = buildProviderRequest({
        provider: queued.provider as "openai",
        model: task.model,
        prompt: task.finalPrompt,
        params: extractTaskParams(task.requestPayloadJson)
      });
      await prisma.generationTask.update({
        where: { id: task.id },
        data: { requestPayloadJson: JSON.stringify(providerRequest) }
      });
      const result = await provider.generateImage(providerRequest);

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
      logger.info(`[worker] task completed ${task.id}`);
    } catch (error) {
      const latest = await prisma.generationTask.findUnique({ where: { id: task.id } });
      const attempts = (latest?.attempts ?? 0) + 1;
      const canRetry = shouldRetry(attempts, latest?.maxAttempts ?? WORKER_MAX_ATTEMPTS);

      await prisma.generationTask.update({
        where: { id: task.id },
        data: {
          status: canRetry ? "failed" : "failed",
          attempts,
          maxAttempts: latest?.maxAttempts ?? WORKER_MAX_ATTEMPTS,
          lastError: error instanceof Error ? error.message : "Unknown provider error",
          errorMessage: error instanceof Error ? error.message : "Unknown provider error",
          nextAttemptAt: canRetry ? new Date(Date.now() + computeBackoffMs(attempts, WORKER_RETRY_BASE_MS)) : null,
          completedAt: canRetry ? null : new Date()
        }
      });
      logger.error(`[worker] task failed ${task.id} attempt=${attempts}`);
    }
  }

  const finishedTasks = await prisma.generationTask.findMany({ where: { jobId: queued.id } });
  const unresolved = finishedTasks.some((t: { status: string; attempts: number; maxAttempts: number }) => t.status === "queued" || (t.status === "failed" && t.attempts < t.maxAttempts));

  if (unresolved) {
    await prisma.generationJob.update({ where: { id: queued.id }, data: { status: "queued" } });
    logger.info(`[worker] job re-queued ${queued.id}`);
    return queued.id;
  }

  const status = aggregateJobStatus(finishedTasks.map((task: { status: string }) => task.status as TaskLikeStatus));
  await prisma.generationJob.update({ where: { id: queued.id }, data: { status, completedAt: new Date() } });
  logger.info(`[worker] job ${status} ${queued.id}`);

  return queued.id;
}
