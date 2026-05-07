import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { toClientTaskDto } from "@/lib/jobs/image-dto";

const schema = z.object({ reviewStatus: z.enum(["unreviewed", "favorite", "approved", "rejected"]) });

export async function POST(request: Request, { params }: { params: Promise<{ taskId: string }> }) {
  const { taskId } = await params;
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid review status." }, { status: 400 });
  const status = parsed.data.reviewStatus;
  const task = await prisma.generationTask.update({
    where: { id: taskId },
    data: { reviewStatus: status, reviewedAt: status === "unreviewed" ? null : new Date() }
  });
  return NextResponse.json({ task: toClientTaskDto(task as never) });
}
