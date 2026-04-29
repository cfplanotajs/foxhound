import { NextResponse } from "next/server";
import { composePrompt } from "@/lib/prompt-composer";
import { prisma } from "@/lib/db";
import { getPresetById } from "@/lib/presets";
import { getProvider } from "@/lib/providers";
import { saveImage } from "@/lib/storage";

interface CreateJobBody {
  presetId: string;
  provider?: string;
  model?: string;
  constraints?: string;
  singlePrompt?: string;
  bulkPrompts?: string;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CreateJobBody;
    const preset = getPresetById(body.presetId);
    if (!preset) return NextResponse.json({ error: "Preset not found" }, { status: 400 });

    const provider = body.provider ?? preset.defaultProvider;
    const model = body.model ?? process.env.OPENAI_IMAGE_MODEL ?? preset.defaultModel;

    const lines = (body.bulkPrompts ?? "")
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    const single = body.singlePrompt?.trim();
    const subjectPrompts = [...(single ? [single] : []), ...lines];

    if (subjectPrompts.length === 0) {
      return NextResponse.json({ error: "Please provide at least one prompt" }, { status: 400 });
    }

    const job = await prisma.generationJob.create({
      data: { status: "processing", provider, model }
    });

    const imageProvider = getProvider(provider);

    for (const subjectPrompt of subjectPrompts) {
      const finalPrompt = composePrompt(preset.stylePrompt, subjectPrompt, body.constraints);
      const task = await prisma.generationTask.create({
        data: {
          jobId: job.id,
          presetId: preset.id,
          presetName: preset.name,
          presetVersion: preset.version,
          stylePromptSnapshot: preset.stylePrompt,
          subjectPrompt,
          finalPrompt,
          constraints: body.constraints?.trim() || null,
          provider,
          model,
          status: "processing",
          requestPayloadJson: JSON.stringify({ model, prompt: finalPrompt, params: preset.defaultParams })
        }
      });

      try {
        const result = await imageProvider.generateImage({ prompt: finalPrompt, model, params: preset.defaultParams });
        const path = await saveImage(job.id, task.id, result.imageBytes);

        await prisma.generationTask.update({
          where: { id: task.id },
          data: {
            status: "completed",
            outputPath: path,
            responseMetadataJson: JSON.stringify(result.metadata),
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

    const tasks = await prisma.generationTask.findMany({ where: { jobId: job.id } });
    const anyFailed = tasks.some((task) => task.status === "failed");
    const allCompleted = tasks.every((task) => task.status === "completed");

    await prisma.generationJob.update({
      where: { id: job.id },
      data: {
        status: allCompleted ? "completed" : anyFailed ? "partial_failed" : "processing",
        completedAt: new Date()
      }
    });

    return NextResponse.json({ jobId: job.id });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
