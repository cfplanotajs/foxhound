import { NextResponse } from "next/server";
import { z } from "zod";
import { composePrompt } from "@/lib/prompt-composer";
import { prisma } from "@/lib/db";
import { getPresetByStableKey, seedPresetsFromConfig } from "@/lib/presets";
import { getEnv, MISSING_OPENAI_KEY_MESSAGE } from "@/lib/env";
import { createJobSchema } from "@/lib/jobs/validation";
import { isIdempotencyCollisionError } from "@/lib/jobs/idempotency";
import { serializeTaskPayload } from "@/lib/jobs/provider-payload";
import { createJobAndTasksAtomic } from "@/lib/jobs/create-job";
import { ensureJobProviderConfigured } from "@/lib/jobs/provider-config";

const MAX_PROMPT_LINES = 50;
const WORKER_MAX_ATTEMPTS = Number(process.env.WORKER_MAX_ATTEMPTS ?? "3");


export async function POST(request: Request) {
  try {
    getEnv();
    const body = createJobSchema.parse(await request.json());
    await seedPresetsFromConfig();
    const preset = await getPresetByStableKey(body.presetId);
    if (!preset) return NextResponse.json({ error: "Preset not found" }, { status: 400 });

    if (body.idempotencyKey) {
      const existing = await prisma.generationJob.findUnique({ where: { idempotencyKey: body.idempotencyKey } });
      if (existing) return NextResponse.json({ jobId: existing.id, deduped: true });
    }

    const provider = body.provider ?? preset.defaultProvider;
    const model = body.model;
    if (!provider) return NextResponse.json({ error: "Provider is required." }, { status: 400 });
    if (!model) return NextResponse.json({ error: "Model is required." }, { status: 400 });
    ensureJobProviderConfigured(provider as "openai" | "mock");

    const lines = (body.bulkPrompts ?? "").split("\n").map((line) => line.trim()).filter(Boolean);
    const single = body.singlePrompt?.trim();
    const subjectPrompts = [...(single ? [single] : []), ...lines];
    if (subjectPrompts.length === 0) return NextResponse.json({ error: "Enter at least one prompt." }, { status: 400 });
    if (subjectPrompts.length > MAX_PROMPT_LINES) return NextResponse.json({ error: "Too many prompt lines" }, { status: 400 });

    let job;
    try {
      job = await createJobAndTasksAtomic(prisma as never, {
        jobData: { status: "queued", provider, model, idempotencyKey: body.idempotencyKey },
        taskData: subjectPrompts.map((subjectPrompt) => ({
            presetId: preset.stableKey,
            presetName: preset.name,
            presetVersion: preset.version,
            stylePromptSnapshot: preset.stylePrompt,
            subjectPrompt,
            finalPrompt: composePrompt(preset.stylePrompt, subjectPrompt, body.constraints),
            constraints: body.constraints?.trim() || null,
            provider,
            model,
            status: "queued",
            attempts: 0,
            maxAttempts: WORKER_MAX_ATTEMPTS,
            nextAttemptAt: null,
            defaultProviderSnapshot: preset.defaultProvider,
            defaultModelSnapshot: preset.defaultModel,
            defaultParamsJsonSnapshot: JSON.stringify(preset.defaultParams),
            requestPayloadJson: serializeTaskPayload(preset.defaultParams as { size?: string; quality?: "low" | "medium" | "high" | "auto"; count?: number }, { model }),
            presetVersionId: preset.versionId
          }))
      });
    } catch (error) {
      if (body.idempotencyKey && isIdempotencyCollisionError(error)) {
        const existing = await prisma.generationJob.findUnique({ where: { idempotencyKey: body.idempotencyKey } });
        if (existing) return NextResponse.json({ jobId: existing.id, deduped: true });
      }
      throw error;
    }

    return NextResponse.json({ jobId: job.id, status: "queued" });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    if (error instanceof Error && error.message === MISSING_OPENAI_KEY_MESSAGE) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
