import { NextResponse } from "next/server";
import { z } from "zod";
import { composePrompt } from "@/lib/prompt-composer";
import { prisma } from "@/lib/db";
import { getPresetById } from "@/lib/presets";
import { getEnv, requireApiToken } from "@/lib/env";

const MAX_PROMPT_LINES = 50;
const MAX_TEXT_LEN = 2000;

const createJobSchema = z.object({
  presetId: z.string().min(1),
  provider: z.literal("openai").optional(),
  model: z.string().min(1).max(120).optional(),
  constraints: z.string().max(MAX_TEXT_LEN).optional(),
  singlePrompt: z.string().max(MAX_TEXT_LEN).optional(),
  bulkPrompts: z.string().max(MAX_TEXT_LEN * MAX_PROMPT_LINES).optional(),
  idempotencyKey: z.string().min(8).max(128).optional()
});

export async function POST(request: Request) {
  try {
    requireApiToken(request);
    getEnv();
    const body = createJobSchema.parse(await request.json());
    const preset = getPresetById(body.presetId);
    if (!preset) return NextResponse.json({ error: "Preset not found" }, { status: 400 });

    if (body.idempotencyKey) {
      const existing = await prisma.generationJob.findUnique({ where: { idempotencyKey: body.idempotencyKey } });
      if (existing) return NextResponse.json({ jobId: existing.id, deduped: true });
    }

    const provider = body.provider ?? preset.defaultProvider;
    const model = body.model ?? getEnv().OPENAI_IMAGE_MODEL ?? preset.defaultModel;

    const lines = (body.bulkPrompts ?? "").split("\n").map((line) => line.trim()).filter(Boolean);
    const single = body.singlePrompt?.trim();
    const subjectPrompts = [...(single ? [single] : []), ...lines];
    if (subjectPrompts.length === 0) return NextResponse.json({ error: "Please provide at least one prompt" }, { status: 400 });
    if (subjectPrompts.length > MAX_PROMPT_LINES) return NextResponse.json({ error: "Too many prompt lines" }, { status: 400 });

    const job = await prisma.generationJob.create({
      data: { status: "queued", provider, model, idempotencyKey: body.idempotencyKey }
    });

    await prisma.generationTask.createMany({
      data: subjectPrompts.map((subjectPrompt) => ({
        jobId: job.id,
        presetId: preset.id,
        presetName: preset.name,
        presetVersion: preset.version,
        stylePromptSnapshot: preset.stylePrompt,
        subjectPrompt,
        finalPrompt: composePrompt(preset.stylePrompt, subjectPrompt, body.constraints),
        constraints: body.constraints?.trim() || null,
        provider,
        model,
        status: "queued",
        requestPayloadJson: JSON.stringify({ model, params: preset.defaultParams })
      }))
    });

    return NextResponse.json({ jobId: job.id, status: "queued" });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
