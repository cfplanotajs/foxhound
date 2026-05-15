import fs from "node:fs/promises";
import { prisma } from "../lib/db";
import { resolveSqlitePath, resolveStorageDir } from "./backup";

export async function runRestoreCheck(cwd = process.cwd()): Promise<number> {
  try {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      console.error("[restore-check] DATABASE_URL is required.");
      return 1;
    }

    const dbPath = resolveSqlitePath(databaseUrl, cwd);
    const storageDir = resolveStorageDir(cwd);

    await fs.access(dbPath);

    let dbStatus: "ok" | "error" = "ok";
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch {
      dbStatus = "error";
    }

    let storageStatus: "ok" | "error" = "ok";
    try {
      await fs.access(storageDir);
    } catch {
      storageStatus = "error";
    }

    let counts = { projects: 0, jobs: 0, tasks: 0 };
    try {
      const [projects, jobs, tasks] = await Promise.all([
        prisma.project.count(),
        prisma.generationJob.count(),
        prisma.generationTask.count()
      ]);
      counts = { projects, jobs, tasks };
    } catch {
      // keep read-only check resilient
    }

    const healthy = dbStatus === "ok" && storageStatus === "ok";
    console.info(`[restore-check] db=${dbStatus} storage=${storageStatus} projects=${counts.projects} jobs=${counts.jobs} tasks=${counts.tasks}`);
    return healthy ? 0 : 1;
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    console.error(`[restore-check] failed: ${message}`);
    return 1;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runRestoreCheck().then((code) => {
    process.exitCode = code;
  });
}
