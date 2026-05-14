import fs from "node:fs/promises";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getStorageBaseDir } from "@/lib/storage";

export async function GET() {
  const timestamp = new Date().toISOString();

  let database: "ok" | "error" = "ok";
  let storage: "ok" | "error" = "ok";

  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    database = "error";
  }

  try {
    const baseDir = getStorageBaseDir();
    await fs.mkdir(baseDir, { recursive: true });
    await fs.access(baseDir);
  } catch {
    storage = "error";
  }

  const status = database === "ok" && storage === "ok" ? "ok" : "error";
  const body = { status, app: "foxhound", timestamp, database, storage };
  return NextResponse.json(body, { status: status === "ok" ? 200 : 503 });
}
