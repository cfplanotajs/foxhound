import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parseTaskPayload } from "@/lib/jobs/provider-payload";
import { inferAspectRatioFromSize } from "@/lib/jobs/task-size";

export async function GET(_request: Request, { params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  const job = await prisma.generationJob.findUnique({ where: { id: jobId }, include: { tasks: { orderBy: { createdAt: "asc" } }, project: true, folder: true } });
  if (!job || job.tasks.length === 0) return NextResponse.json({ error: "Job not found." }, { status: 404 });
  const first = job.tasks[0];
  const preset = await prisma.preset.findUnique({ where: { stableKey: first.presetId } });
  const payload = parseTaskPayload(first.requestPayloadJson);
  const providerPayload: any = payload.providerPayload ?? {};
  const metadata: any = payload.metadata ?? {};
  const size = payload.taskParams.size ?? providerPayload.size ?? null;
  const aspectRatio =
    (typeof metadata.aspectRatio === "string" && metadata.aspectRatio.length > 0 ? metadata.aspectRatio : null) ??
    (typeof providerPayload.aspectRatio === "string" && providerPayload.aspectRatio.length > 0 ? providerPayload.aspectRatio : null) ??
    inferAspectRatioFromSize(typeof size === "string" ? size : null);
  const promptLines = job.tasks.flatMap((task: any) => {
    const taskPayload = parseTaskPayload(task.requestPayloadJson);
    const variationIndex = Number((taskPayload.metadata as any)?.variationIndex ?? 1);
    return variationIndex > 1 ? [] : [task.subjectPrompt];
  });
  return NextResponse.json({
    template: {
      jobId: job.id,
      provider: job.provider,
      model: job.model,
      promptLines,
      presetId: first.presetId,
      presetName: first.presetName,
      presetVersion: first.presetVersion,
      presetSelectable: !!preset && !preset.isArchived,
      aspectRatio,
      size,
      quality: payload.taskParams.quality ?? providerPayload.quality ?? null,
      variationCount: metadata.variationCount ?? providerPayload.variationCount ?? 1,
      constraints: first.constraints ?? null,
      status: job.status
      ,mode: job.mode ?? "generate"
      ,sourceTaskId: job.sourceTaskId ?? null
      ,sourceJobId: job.sourceJobId ?? null
      ,editInstruction: job.editInstruction ?? null
      ,projectId: job.projectId ?? null
      ,folderId: job.folderId ?? null
      ,projectName: job.project?.name ?? null
      ,folderName: job.folder?.name ?? null
    }
  });
}
