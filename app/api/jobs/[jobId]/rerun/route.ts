import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createJobAndTasksAtomic } from "@/lib/jobs/create-job";
import { cloneTaskPayloadForRerun } from "@/lib/jobs/provider-payload";
import { ensureJobProviderConfigured } from "@/lib/jobs/provider-config";
import { MISSING_OPENAI_KEY_MESSAGE } from "@/lib/env";

export async function POST(_request: Request, { params }: { params: Promise<{ jobId: string }> }) {
  try {
    const { jobId } = await params;
    const source = await prisma.generationJob.findUnique({ where: { id: jobId }, include: { tasks: { orderBy: { createdAt: "asc" } }, project: true, folder: true } });
    if (!source || source.tasks.length === 0) return NextResponse.json({ error: "Source job not found." }, { status: 404 });
    if (source.projectId && source.project?.isArchived) return NextResponse.json({ error: "Source project is archived. Use Duplicate into form instead." }, { status: 400 });
    if (source.folderId && source.folder?.isArchived) return NextResponse.json({ error: "Source folder is archived. Use Duplicate into form instead." }, { status: 400 });
    const first = source.tasks[0];
    const preset = await prisma.preset.findUnique({ where: { stableKey: first.presetId } });
    if (!preset || preset.isArchived) return NextResponse.json({ error: "Source preset is archived or unavailable. Use Duplicate into form instead." }, { status: 400 });
    ensureJobProviderConfigured(source.provider as "openai" | "mock");

    const job = await createJobAndTasksAtomic(prisma as never, {
      jobData: { status: "queued", provider: source.provider, model: source.model, projectId: source.projectId, folderId: source.folderId },
      taskData: source.tasks.map((task: any) => ({
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
        requestPayloadJson: cloneTaskPayloadForRerun(task.requestPayloadJson, { model: task.model }),
        presetVersionId: task.presetVersionId
      }))
    });
    return NextResponse.json({ jobId: job.id, status: "queued" });
  } catch (error) {
    if (error instanceof Error && error.message === MISSING_OPENAI_KEY_MESSAGE) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof Error && error.message.startsWith("Unsupported provider:")) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
