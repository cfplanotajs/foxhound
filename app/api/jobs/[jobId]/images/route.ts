import fs from "node:fs/promises";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  const tasks = await prisma.generationTask.findMany({ where: { jobId }, orderBy: { createdAt: "asc" } });

  const payload = await Promise.all(
    tasks.map(async (task) => {
      let imageBase64: string | null = null;
      if (task.outputPath) {
        try {
          const bytes = await fs.readFile(task.outputPath);
          imageBase64 = bytes.toString("base64");
        } catch {
          imageBase64 = null;
        }
      }
      return { ...task, imageBase64 };
    })
  );

  return NextResponse.json({ tasks: payload });
}
