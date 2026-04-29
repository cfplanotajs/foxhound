import archiver from "archiver";
import { PassThrough } from "node:stream";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(_request: Request, { params }: { params: Promise<{ jobId: string }> }) {
  try {
    const { jobId } = await params;
    const tasks = await prisma.generationTask.findMany({ where: { jobId, status: "completed" } });
    if (tasks.length === 0) return NextResponse.json({ error: "No completed images" }, { status: 400 });

    const stream = new PassThrough();
    const archive = archiver("zip", { zlib: { level: 9 } });
    archive.on("error", (err) => stream.destroy(err));
    archive.pipe(stream);
    for (const task of tasks) {
      if (task.outputPath) archive.file(task.outputPath, { name: `${task.id}.png` });
    }
    void archive.finalize();

    return new NextResponse(stream as unknown as ReadableStream, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename=\"job-${jobId}.zip\"`
      }
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
