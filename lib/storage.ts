import fs from "node:fs/promises";
import path from "node:path";

export function getOutputDir(jobId: string): string {
  return path.join(process.cwd(), "generated", jobId);
}

export async function saveImage(jobId: string, taskId: string, bytes: Buffer): Promise<string> {
  const outputDir = getOutputDir(jobId);
  await fs.mkdir(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, `${taskId}.png`);
  await fs.writeFile(outputPath, bytes);
  return outputPath;
}
