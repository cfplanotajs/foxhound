import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parseTaskPayload } from "@/lib/jobs/provider-payload";

export async function GET(_request: Request, { params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  const job = await prisma.generationJob.findUnique({ where: { id: jobId }, include: { tasks: { orderBy: { createdAt: "asc" } } } });
  if (!job || job.tasks.length === 0) return NextResponse.json({ error: "Job not found." }, { status: 404 });
  const first = job.tasks[0];
  const preset = await prisma.preset.findUnique({ where: { stableKey: first.presetId } });
  const payload = parseTaskPayload(first.requestPayloadJson);
  const providerPayload: any = payload.providerPayload ?? {};
  const metadata: any = payload.metadata ?? {};
  return NextResponse.json({
    template: {
      jobId: job.id,
      provider: job.provider,
      model: job.model,
      promptLines: job.tasks.map((t: any) => t.subjectPrompt),
      presetId: first.presetId,
      presetName: first.presetName,
      presetVersion: first.presetVersion,
      presetSelectable: !!preset && !preset.isArchived,
      aspectRatio: metadata.aspectRatio ?? providerPayload.aspectRatio ?? "1:1",
      size: payload.taskParams.size ?? providerPayload.size ?? null,
      quality: payload.taskParams.quality ?? providerPayload.quality ?? null,
      variationCount: metadata.variationCount ?? providerPayload.variationCount ?? 1,
      constraints: first.constraints ?? null,
      status: job.status
    }
  });
}
