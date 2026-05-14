import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { createJobAndTasksAtomic } from "@/lib/jobs/create-job";
import { composePrompt } from "@/lib/prompt-composer";
import { serializeTaskPayloadWithMetadata } from "@/lib/jobs/provider-payload";
import { resolveFinalTaskSize } from "@/lib/jobs/task-size";
import { resolveEffectiveQuality } from "@/lib/providers/model-quality";
import { resolveProviderAndModel } from "@/lib/jobs/model-resolution";
import { ensureJobProviderConfigured } from "@/lib/jobs/provider-config";
import { getWorkerMaxAttempts } from "@/lib/jobs/worker-config";
import { resolveJobProjectFolderAssignment } from "@/lib/jobs/project-folder-assignment";
import { existsSync } from "node:fs";
import { assertSupportedOpenAIModel } from "@/lib/providers/openai-models";
import { MISSING_OPENAI_KEY_MESSAGE } from "@/lib/env";
import { parseJsonBody } from "@/lib/jobs/json-body";
const WORKER_MAX_ATTEMPTS = getWorkerMaxAttempts();

const schema = z.object({
  presetId: z.string().min(1),
  provider: z.enum(["openai", "mock"]).optional(),
  model: z.string().min(1).optional(),
  editInstruction: z.string().trim().min(1, "Edit instruction is required."),
  constraints: z.string().optional(),
  aspectRatio: z.string().optional(),
  variationCount: z.number().int().refine((n) => [1,2,4].includes(n)).optional(),
  quality: z.enum(["low","medium","high","auto","standard","hd"]).optional(),
  projectId: z.string().optional(),
  folderId: z.string().optional()
});

export async function POST(request: Request, { params }: { params: Promise<{ taskId: string }> }) {
  try {
    const { taskId } = await params;
    const parsed = await parseJsonBody(request);
    if (!parsed.ok) return NextResponse.json({ error: "Malformed JSON request body." }, { status: 400 });
    const body = schema.parse(parsed.data);
    const sourceTask = await prisma.generationTask.findUnique({ where: { id: taskId }, include: { job: true } });
    if (!sourceTask) return NextResponse.json({ error: "Source task not found" }, { status: 404 });
    if (sourceTask.status !== "completed") return NextResponse.json({ error: "Source task must be completed before editing." }, { status: 400 });
    if (!sourceTask.outputPath) return NextResponse.json({ error: "Source task has no output image." }, { status: 400 });
    if (!existsSync(sourceTask.outputPath)) return NextResponse.json({ error: "Source image file not found" }, { status: 404 });

    const preset = await prisma.preset.findUnique({ where: { stableKey: body.presetId }, include: { versions: { orderBy: { createdAt: "desc" }, take: 1 } } });
    if (!preset || !preset.versions[0] || preset.isArchived) return NextResponse.json({ error: "Preset not found" }, { status: 400 });
    const latest = preset.versions[0];
    const defaultParams = JSON.parse(latest.defaultParamsJson || "{}") as Record<string, unknown>;
    const { provider, model } = resolveProviderAndModel({ providerFromBody: body.provider, modelFromBody: body.model, presetDefaultProvider: latest.defaultProvider, presetDefaultModel: latest.defaultModel });
    if (!provider || !model) return NextResponse.json({ error: "Provider and model are required." }, { status: 400 });
    if (provider === "openai") {
      const spec = assertSupportedOpenAIModel(model);
      if (spec.family !== "gpt-image") return NextResponse.json({ error: `Model ${model} does not support image editing in this adapter.` }, { status: 400 });
    }
    ensureJobProviderConfigured(provider);

    const sizeRes = resolveFinalTaskSize({ model, aspectRatio: body.aspectRatio, presetDefaultSize: (defaultParams as any).size ?? null });
    if (!sizeRes.ok) return NextResponse.json({ error: "Unable to resolve image size for selected model." }, { status: 400 });
    const finalSize = sizeRes.finalSize as string;
    const finalQuality = resolveEffectiveQuality({ provider: provider as any, model, requestedQuality: body.quality ?? null, presetDefaultQuality: ((defaultParams as any).quality ?? null) as any });
    const variationCount = body.variationCount ?? 1;
    const assignment = await resolveJobProjectFolderAssignment({ projectId: body.projectId ?? null, folderId: body.folderId ?? null });
    if (!assignment.ok) return NextResponse.json({ error: assignment.error }, { status: assignment.status });

    const job = await createJobAndTasksAtomic(prisma as never, {
      jobData: { status: "queued", mode: "edit", sourceJobId: sourceTask.jobId, sourceTaskId: sourceTask.id, editInstruction: body.editInstruction, provider, model, projectId: assignment.projectId, folderId: assignment.folderId },
      taskData: Array.from({ length: variationCount }, (_, i) => ({
        presetId: preset.stableKey,
        presetName: preset.name,
        presetVersion: latest.version,
        stylePromptSnapshot: latest.stylePrompt,
        subjectPrompt: body.editInstruction,
        finalPrompt: composePrompt(latest.stylePrompt, body.editInstruction, body.constraints),
        constraints: body.constraints?.trim() || null,
        provider,
        model,
        status: "queued",
        attempts: 0,
        maxAttempts: WORKER_MAX_ATTEMPTS,
        nextAttemptAt: null,
        defaultProviderSnapshot: latest.defaultProvider,
        defaultModelSnapshot: latest.defaultModel,
        defaultParamsJsonSnapshot: latest.defaultParamsJson,
        requestPayloadJson: serializeTaskPayloadWithMetadata({ ...(defaultParams as any), size: finalSize, quality: finalQuality as any }, { model, size: finalSize, quality: finalQuality }, { mode: "edit", sourceTaskId: sourceTask.id, sourceJobId: sourceTask.jobId, editInstruction: body.editInstruction, variationIndex: i + 1, variationCount, aspectRatio: body.aspectRatio ?? null }),
        presetVersionId: latest.id
      }))
    });

    return NextResponse.json({ jobId: job.id, status: "queued" });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    if (error instanceof Error && error.message === MISSING_OPENAI_KEY_MESSAGE) return NextResponse.json({ error: error.message }, { status: 400 });
    if (error instanceof Error && error.message.startsWith("Unsupported OpenAI image model:")) return NextResponse.json({ error: error.message }, { status: 400 });
    if (error instanceof Error && error.message.startsWith("Quality ") && error.message.includes(" is not supported for model ")) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal server error" }, { status: 500 });
  }
}
