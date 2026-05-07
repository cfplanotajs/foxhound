import fs from "node:fs/promises";
import path from "node:path";

export function getOutputDir(jobId: string): string {
  return path.join(process.cwd(), "generated", jobId);
}

export function outputPathFor(jobId: string, taskId: string): string {
  return path.join(getOutputDir(jobId), `${taskId}.png`);
}

export async function saveImage(jobId: string, taskId: string, bytes: Buffer): Promise<string> {
  const outputDir = getOutputDir(jobId);
  await fs.mkdir(outputDir, { recursive: true });
  const outputPath = outputPathFor(jobId, taskId);
  await fs.writeFile(outputPath, bytes);
  return outputPath;
}
