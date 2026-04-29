import fs from "node:fs";
import path from "node:path";
import archiver from "archiver";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  const tasks = await prisma.generationTask.findMany({ where: { jobId, status: "completed" } });
  if (tasks.length === 0) return NextResponse.json({ error: "No completed images" }, { status: 400 });

  const archivePath = path.join(process.cwd(), "generated", jobId, `job-${jobId}.zip`);
  await fs.promises.mkdir(path.dirname(archivePath), { recursive: true });

  await new Promise<void>((resolve, reject) => {
    const output = fs.createWriteStream(archivePath);
    const archive = archiver("zip", { zlib: { level: 9 } });

    output.on("close", () => resolve());
    archive.on("error", (err) => reject(err));

    archive.pipe(output);
    for (const task of tasks) {
      if (task.outputPath) archive.file(task.outputPath, { name: `${task.id}.png` });
    }
    archive.finalize();
  });

  const zipBytes = await fs.promises.readFile(archivePath);
  return new NextResponse(zipBytes, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="job-${jobId}.zip"`
    }
  });
}
