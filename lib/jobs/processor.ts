import { prisma } from "@/lib/db";
import { getProvider } from "@/lib/providers";
import { saveImage } from "@/lib/storage";
import { aggregateJobStatus, TaskLikeStatus } from "@/lib/jobs/status";
import { computeBackoffMs, shouldRetry } from "@/lib/jobs/retry";
import { buildProviderRequest, extractTaskParams, serializeTaskPayload } from "@/lib/jobs/provider-payload";
import { normalizeProviderError } from "@/lib/providers/error-normalizer";
import { hasActionableTask, shouldRequeueAfterPass } from "@/lib/jobs/actionable";
import { isJobStalled, reconcileJobStatusFromTasks, shouldRetryAfterStall, StalledTask } from "@/lib/jobs/stalled";
import { getWorkerMaxAttempts, getWorkerRetryBaseMs } from "@/lib/jobs/worker-config";

const WORKER_MAX_ATTEMPTS = getWorkerMaxAttempts();
const WORKER_RETRY_BASE_MS = getWorkerRetryBaseMs();
const WORKER_STALLED_AFTER_MS = Number(process.env.WORKER_STALLED_AFTER_MS ?? "900000");

function isActionableDuringSetupFailure(task: { status: string; attempts: number; maxAttempts: number; nextAttemptAt: Date | null }, now: Date): boolean {
  if (task.status === "queued" || task.status === "processing") return true;
  return task.status === "failed" && !!task.nextAttemptAt && task.nextAttemptAt <= now && task.attempts < task.maxAttempts;
}

export async function failClaimedJobTasks(jobId: string, setupError: unknown, logger: Pick<Console, "info" | "error">): Promise<void> {
  const normalized = normalizeProviderError(setupError);
  const now = new Date();
  const tasks = await prisma.generationTask.findMany({ where: { jobId } });
  for (const task of tasks) {
    if (!isActionableDuringSetupFailure(task as any, now)) continue;
    const attempts = task.attempts + 1;
    await prisma.generationTask.update({
      where: { id: task.id },
      data: {
        status: "failed",
        attempts,
        lastError: normalized.technicalMessage,
        errorMessage: normalized.title,
        responseMetadataJson: JSON.stringify({ providerError: normalized }),
        nextAttemptAt: null,
        completedAt: new Date()
      }
    });
  }
  const refreshed = await prisma.generationTask.findMany({ where: { jobId } });
  const status = reconcileJobStatusFromTasks(refreshed as any);
  await prisma.generationJob.update({ where: { id: jobId }, data: { status, ...(status !== "queued" ? { completedAt: new Date() } : {}) } });
  logger.error(`[worker] job failed during provider setup ${jobId} kind=${normalized.kind}`);
}

export async function recoverStalledProcessingJobs(logger: Pick<Console, "info" | "error"> = console): Promise<void> {
  const now = new Date();
  const processingJobs = await prisma.generationJob.findMany({ where: { status: "processing" }, include: { tasks: true } });

  for (const job of processingJobs) {
    if (!isJobStalled(job.startedAt, now, WORKER_STALLED_AFTER_MS)) continue;
    logger.info(`[worker] reclaiming stalled job ${job.id}`);

    for (const task of job.tasks) {
      if (task.status !== "processing") continue;
      const retryable = shouldRetryAfterStall(task as unknown as StalledTask);
      const attempts = task.attempts + 1;
      await prisma.generationTask.update({
        where: { id: task.id },
        data: {
          status: "failed",
          attempts,
          nextAttemptAt: retryable ? new Date() : null,
          errorMessage: task.errorMessage ?? "Worker stopped before task completed.",
          lastError: task.lastError ?? "Worker stopped before task completed.",
          completedAt: retryable ? null : new Date()
        }
      });
    }

    const refreshedTasks = await prisma.generationTask.findMany({ where: { jobId: job.id } });
    const status = reconcileJobStatusFromTasks(refreshedTasks);
    await prisma.generationJob.update({
      where: { id: job.id },
      data: { status, ...(status !== "queued" ? { completedAt: new Date() } : {}) }
    });
  }
}

export async function processNextQueuedJob(logger: Pick<Console, "info" | "error"> = console): Promise<string | null> {
  await recoverStalledProcessingJobs(logger);
  const now = new Date();
  const queuedCandidates = await prisma.generationJob.findMany({
    where: {
      status: "queued",
      tasks: {
        some: {
          OR: [
            { status: "queued" },
            { status: "failed", nextAttemptAt: { lte: now } }
          ]
        }
      }
    },
    orderBy: { createdAt: "asc" },
    include: { tasks: true }
  });
  const queued = queuedCandidates.find((job: any) => hasActionableTask(job.tasks as Array<{ status: string; attempts: number; maxAttempts: number; nextAttemptAt?: Date | null }>, now));
  if (!queued) return null;

  const claim = await prisma.generationJob.updateMany({
    where: { id: queued.id, status: "queued" },
    data: { status: "processing", startedAt: new Date() }
  });
  if (claim.count !== 1) return null;

  logger.info(`[worker] job claimed ${queued.id}`);
  let provider;
  try {
    provider = getProvider(queued.provider as "openai" | "mock");
  } catch (error) {
    await failClaimedJobTasks(queued.id, error, logger);
    return queued.id;
  }

  const tasks = await prisma.generationTask.findMany({
    where: {
      jobId: queued.id,
      OR: [
        { status: "queued" },
        { status: "failed", nextAttemptAt: { lte: now } }
      ]
    },
    orderBy: { createdAt: "asc" }
  });

  for (const task of tasks) {
    if (task.status === "failed" && !(task.attempts < task.maxAttempts && !!task.nextAttemptAt && task.nextAttemptAt <= new Date())) continue;

    const taskClaim = await prisma.generationTask.updateMany({
      where: {
        id: task.id,
        OR: [
          { status: "queued" },
          { status: "failed", nextAttemptAt: { lte: new Date() } }
        ]
      },
      data: { status: "processing", startedAt: new Date() }
    });
    if (taskClaim.count !== 1) continue;

    try {
      const providerRequest = buildProviderRequest({
        provider: queued.provider as "openai" | "mock",
        model: task.model,
        prompt: task.finalPrompt,
        params: extractTaskParams(task.requestPayloadJson),
        presetName: task.presetName
      });
      await prisma.generationTask.update({
        where: { id: task.id },
        data: {
          requestPayloadJson: serializeTaskPayload(extractTaskParams(task.requestPayloadJson), providerRequest)
        }
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
      const normalized = normalizeProviderError(error);
      const latest = await prisma.generationTask.findUnique({ where: { id: task.id } });
      const attempts = (latest?.attempts ?? 0) + 1;
      const canRetry = normalized.retryable && shouldRetry(attempts, latest?.maxAttempts ?? WORKER_MAX_ATTEMPTS);

      await prisma.generationTask.update({
        where: { id: task.id },
        data: {
          status: canRetry ? "failed" : "failed",
          attempts,
          maxAttempts: latest?.maxAttempts ?? WORKER_MAX_ATTEMPTS,
          lastError: normalized.technicalMessage,
          errorMessage: normalized.title,
          responseMetadataJson: JSON.stringify({ providerError: normalized }),
          nextAttemptAt: canRetry ? new Date(Date.now() + computeBackoffMs(attempts, WORKER_RETRY_BASE_MS)) : null,
          completedAt: canRetry ? null : new Date()
        }
      });
      logger.error(`[worker] task failed ${task.id} attempt=${attempts} kind=${normalized.kind}`);
    }
  }

  const finishedTasks = await prisma.generationTask.findMany({ where: { jobId: queued.id } });
  if (shouldRequeueAfterPass(finishedTasks as Array<{ status: string; attempts: number; maxAttempts: number; nextAttemptAt?: Date | null }>, new Date())) {
    await prisma.generationJob.update({ where: { id: queued.id }, data: { status: "queued" } });
    logger.info(`[worker] job waiting ${queued.id}`);
    return queued.id;
  }

  const status = aggregateJobStatus(finishedTasks.map((task: { status: string }) => task.status as TaskLikeStatus));
  await prisma.generationJob.update({ where: { id: queued.id }, data: { status, completedAt: new Date() } });
  logger.info(`[worker] job ${status} ${queued.id}`);

  return queued.id;
}
