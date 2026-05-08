import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(_request: Request, { params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  const job = await prisma.generationJob.findUnique({ where: { id: jobId }, include: { tasks: { orderBy: { createdAt: "asc" } } } });
  if (!job || job.tasks.length === 0) return NextResponse.json({ error: "Job not found." }, { status: 404 });
  const first = job.tasks[0];
  const preset = await prisma.preset.findUnique({ where: { stableKey: first.presetId } });
  let providerPayload: any = {};
  try {
    providerPayload = JSON.parse(first.requestPayloadJson ?? "{}").providerPayload ?? {};
  } catch {}
  return NextResponse.json({
    template: {
      jobId: job.id,
      provider: job.provider,
      model: job.model,
      promptLines: job.tasks.map((t) => t.subjectPrompt),
      presetId: first.presetId,
      presetName: first.presetName,
      presetVersion: first.presetVersion,
      presetSelectable: !!preset && !preset.isArchived,
      aspectRatio: providerPayload.aspectRatio ?? "1:1",
      size: providerPayload.size ?? null,
      quality: providerPayload.quality ?? null,
      variationCount: providerPayload.variationCount ?? 1,
      constraints: first.constraints ?? null,
      status: job.status
    }
  });
}
