import fs from "node:fs/promises";
import path from "node:path";

export function getStorageBaseDir(): string {
  const configured = process.env.FOXHOUND_STORAGE_DIR?.trim();
  if (!configured) return path.join(process.cwd(), "generated");
  return path.isAbsolute(configured) ? configured : path.join(process.cwd(), configured);
}

export function getOutputDir(jobId: string): string {
  return path.join(getStorageBaseDir(), jobId);
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
