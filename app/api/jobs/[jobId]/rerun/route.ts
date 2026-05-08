import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createJobAndTasksAtomic } from "@/lib/jobs/create-job";
import { serializeTaskPayload } from "@/lib/jobs/provider-payload";

export async function POST(_request: Request, { params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  const source = await prisma.generationJob.findUnique({ where: { id: jobId }, include: { tasks: { orderBy: { createdAt: "asc" } } } });
  if (!source || source.tasks.length === 0) return NextResponse.json({ error: "Source job not found." }, { status: 404 });
  const first = source.tasks[0];
  const preset = await prisma.preset.findUnique({ where: { stableKey: first.presetId } });
  if (!preset || preset.isArchived) return NextResponse.json({ error: "Source preset is archived or unavailable. Use Duplicate into form instead." }, { status: 400 });

  const job = await createJobAndTasksAtomic(prisma as never, {
    jobData: { status: "queued", provider: source.provider, model: source.model },
    taskData: source.tasks.map((task) => ({
      presetId: task.presetId,
      presetName: task.presetName,
      presetVersion: task.presetVersion,
      stylePromptSnapshot: task.stylePromptSnapshot,
      subjectPrompt: task.subjectPrompt,
      finalPrompt: task.finalPrompt,
      constraints: task.constraints,
      provider: task.provider,
      model: task.model,
      status: "queued",
      attempts: 0,
      maxAttempts: task.maxAttempts,
      nextAttemptAt: null,
      defaultProviderSnapshot: task.defaultProviderSnapshot,
      defaultModelSnapshot: task.defaultModelSnapshot,
      defaultParamsJsonSnapshot: task.defaultParamsJsonSnapshot,
      requestPayloadJson: serializeTaskPayload({}, JSON.parse(task.requestPayloadJson ?? "{}").providerPayload ?? { model: task.model }),
      presetVersionId: task.presetVersionId
    }))
  });
  return NextResponse.json({ jobId: job.id, status: "queued" });
}
