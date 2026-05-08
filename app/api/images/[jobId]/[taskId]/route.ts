import fs from "node:fs/promises";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(_request: Request, { params }: { params: Promise<{ jobId: string; taskId: string }> }) {
  try {
    const { jobId, taskId } = await params;
    const task = await prisma.generationTask.findFirst({ where: { id: taskId, jobId } });
    if (!task?.outputPath) return NextResponse.json({ error: "Not found" }, { status: 404 });

    let bytes;
    try {
      bytes = await fs.readFile(task.outputPath);
    } catch (error) {
      const maybe = error as NodeJS.ErrnoException;
      if (maybe?.code === "ENOENT") return NextResponse.json({ error: "Image file not found" }, { status: 404 });
      throw error;
    }
    return new NextResponse(bytes, { headers: { "Content-Type": "image/png", "Cache-Control": "private, max-age=60" } });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
