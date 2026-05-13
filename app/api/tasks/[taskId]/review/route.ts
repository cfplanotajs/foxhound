import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { toClientTaskDto } from "@/lib/jobs/image-dto";
import { parseJsonBody } from "@/lib/jobs/json-body";

const schema = z.object({ reviewStatus: z.enum(["unreviewed", "favorite", "approved", "rejected"]) });

export async function POST(request: Request, { params }: { params: Promise<{ taskId: string }> }) {
  try {
    const { taskId } = await params;
    const parsedBody = await parseJsonBody(request);
    if (!parsedBody.ok) return NextResponse.json({ error: "Malformed JSON request body." }, { status: 400 });
    const parsed = schema.safeParse(parsedBody.data);
    if (!parsed.success) return NextResponse.json({ error: "Invalid review status." }, { status: 400 });
    const status = parsed.data.reviewStatus;
    const task = await prisma.generationTask.update({
      where: { id: taskId },
      data: { reviewStatus: status, reviewedAt: status === "unreviewed" ? null : new Date() }
    });
    return NextResponse.json({ task: toClientTaskDto(task as never) });
  } catch (error) {
    if ((error as { code?: string })?.code === "P2025") {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
