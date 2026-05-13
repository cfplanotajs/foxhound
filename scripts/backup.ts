import fs from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";

export function resolveSqlitePath(databaseUrl: string, cwd = process.cwd()): string {
  if (!databaseUrl.startsWith("file:")) throw new Error("DATABASE_URL must be a SQLite file URL (file:...) for this backup script.");
  const raw = databaseUrl.slice("file:".length);
  if (!raw) throw new Error("DATABASE_URL file path is empty.");
  return path.isAbsolute(raw) ? raw : path.resolve(cwd, raw);
}

export function resolveStorageDir(cwd = process.cwd()): string {
  const configured = process.env.FOXHOUND_STORAGE_DIR?.trim();
  if (!configured) return path.resolve(cwd, "generated");
  return path.isAbsolute(configured) ? configured : path.resolve(cwd, configured);
}

function timestampForDir(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}_${pad(date.getHours())}-${pad(date.getMinutes())}-${pad(date.getSeconds())}`;
}

export async function runBackup(cwd = process.cwd()): Promise<number> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("[backup] DATABASE_URL is required.");
    return 1;
  }

  const dbPath = resolveSqlitePath(databaseUrl, cwd);
  const storageDir = resolveStorageDir(cwd);
  const backupRoot = path.resolve(cwd, "backups", timestampForDir());
  const dbBackupPath = path.join(backupRoot, "database", path.basename(dbPath));
  const storageBackupPath = path.join(backupRoot, "generated");
  const presetPath = path.resolve(cwd, "config", "presets.json");
  const presetBackupPath = path.join(backupRoot, "config", "presets.json");

  await fs.mkdir(path.dirname(dbBackupPath), { recursive: true });

  let dbCopiedWithVacuum = false;
  const sqliteCli = spawnSync("sqlite3", ["--version"], { stdio: "ignore" });
  if (sqliteCli.status === 0) {
    const vacuum = spawnSync("sqlite3", [dbPath, `VACUUM INTO '${dbBackupPath.replace(/'/g, "''")}'`], { stdio: "pipe", encoding: "utf8" });
    if (vacuum.status === 0) dbCopiedWithVacuum = true;
  }

  if (!dbCopiedWithVacuum) {
    await fs.copyFile(dbPath, dbBackupPath);
    console.warn("[backup] sqlite3 VACUUM INTO unavailable; used direct DB file copy. Prefer running during a quiet period.");
  }

  try {
    await fs.access(storageDir);
    await fs.mkdir(path.dirname(storageBackupPath), { recursive: true });
    await fs.cp(storageDir, storageBackupPath, { recursive: true });
  } catch {
    console.warn(`[backup] storage directory missing or unreadable, skipped: ${storageDir}`);
  }

  try {
    await fs.access(presetPath);
    await fs.mkdir(path.dirname(presetBackupPath), { recursive: true });
    await fs.copyFile(presetPath, presetBackupPath);
  } catch {
    console.warn("[backup] presets.json missing, skipped.");
  }

  console.info("[backup] complete");
  console.info(`[backup] location: ${backupRoot}`);
  console.info(`[backup] database: ${dbBackupPath}`);
  console.info(`[backup] generated: ${storageBackupPath}`);
  console.info("[backup] excludes: .env (back up separately and securely)");
  return 0;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runBackup().then((code) => {
    process.exitCode = code;
  }).catch((error) => {
    const message = error instanceof Error ? error.message : "unknown error";
    console.error(`[backup] failed: ${message}`);
    process.exitCode = 1;
  });
}
