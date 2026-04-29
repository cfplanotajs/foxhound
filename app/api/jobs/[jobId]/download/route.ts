import archiver from "archiver";
import { PassThrough } from "node:stream";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiToken } from "@/lib/env";

export async function GET(request: Request, { params }: { params: Promise<{ jobId: string }> }) {
  try {
    requireApiToken(request);
    const { jobId } = await params;
    const tasks = await prisma.generationTask.findMany({ where: { jobId, status: "completed" } });
    if (tasks.length === 0) return NextResponse.json({ error: "No completed images" }, { status: 400 });

    const stream = new PassThrough();
    const archive = archiver("zip", { zlib: { level: 9 } });
    archive.on("error", () => stream.destroy());
    archive.pipe(stream);
    for (const task of tasks) {
      if (task.outputPath) archive.file(task.outputPath, { name: `${task.id}.png` });
    }
    archive.finalize();

    return new NextResponse(stream as unknown as ReadableStream, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="job-${jobId}.zip"`
      }
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "Unknown error" }, { status: 500 });
  }
}
