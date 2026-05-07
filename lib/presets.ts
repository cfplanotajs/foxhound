import crypto from "node:crypto";
import { Prisma } from "@prisma/client";
import presets from "@/config/presets.json";
import { prisma } from "@/lib/db";
import { isSupportedOpenAIModel } from "@/lib/providers/openai-models";
import { assertSupportedProvider } from "@/lib/providers/supported";

export type DbPresetView = {
  id: string;
  stableKey: string;
  name: string;
  description: string;
  versionId: string;
  version: string;
  stylePrompt: string;
  defaultProvider: string;
  defaultModel: string;
  defaultParams: Record<string, unknown>;
};

function hashPresetContent(input: { stylePrompt: string; defaultProvider: string; defaultModel: string; defaultParams: Record<string, unknown> }) {
  return crypto.createHash("sha256").update(JSON.stringify(input)).digest("hex");
}

function nextVersionTag(current?: string | null) {
  const n = current ? Number(current.replace(/^v/, "")) || 0 : 0;
  return `v${n + 1}`;
}

async function upsertPresetVersionAtomic(db: typeof prisma, presetId: string, payload: { stylePrompt: string; defaultProvider: string; defaultModel: string; defaultParamsJson: string; contentHash: string }) {
  const existing = await db.presetVersion.findUnique({ where: { presetId_contentHash: { presetId, contentHash: payload.contentHash } } });
  if (existing) return existing;

  const latest = await db.presetVersion.findFirst({ where: { presetId }, orderBy: { createdAt: "desc" } });
  const version = nextVersionTag(latest?.version);
  try {
    return await db.presetVersion.create({ data: { presetId, version, ...payload } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const found = await db.presetVersion.findUnique({ where: { presetId_contentHash: { presetId, contentHash: payload.contentHash } } });
      if (found) return found;
    }
    throw error;
  }
}

export async function seedPresetsFromConfig(db: typeof prisma = prisma): Promise<void> {
  for (const item of presets as Array<Record<string, any>>) {
    const stableKey = String(item.id);
    const preset = await db.preset.upsert({
      where: { stableKey },
      update: { name: String(item.name), description: String(item.description) },
      create: { stableKey, name: String(item.name), description: String(item.description), isArchived: false }
    });

    const defaultProvider = assertSupportedProvider(String(item.defaultProvider));
    if (defaultProvider === "openai" && !isSupportedOpenAIModel(String(item.defaultModel))) {
      throw new Error("Preset default model is not supported by this app configuration.");
    }

    const contentHash = hashPresetContent({
      stylePrompt: String(item.stylePrompt),
      defaultProvider,
      defaultModel: String(item.defaultModel),
      defaultParams: (item.defaultParams ?? {}) as Record<string, unknown>
    });

    await upsertPresetVersionAtomic(db, preset.id, {
      stylePrompt: String(item.stylePrompt),
      defaultProvider,
      defaultModel: String(item.defaultModel),
      defaultParamsJson: JSON.stringify(item.defaultParams ?? {}),
      contentHash
    });
  }
}

export async function getActivePresets(db: typeof prisma = prisma): Promise<DbPresetView[]> {
  const rows = await db.preset.findMany({ where: { isArchived: false }, include: { versions: { orderBy: { createdAt: "desc" }, take: 1 } }, orderBy: { name: "asc" } });
  return rows.filter((p) => p.versions[0]).map((p) => ({
    id: p.stableKey,
    stableKey: p.stableKey,
    name: p.name,
    description: p.description,
    versionId: p.versions[0].id,
    version: p.versions[0].version,
    stylePrompt: p.versions[0].stylePrompt,
    defaultProvider: p.versions[0].defaultProvider,
    defaultModel: p.versions[0].defaultModel,
    defaultParams: JSON.parse(p.versions[0].defaultParamsJson)
  }));
}

export async function getPresetByStableKey(stableKey: string, db: typeof prisma = prisma): Promise<DbPresetView | null> {
  const list = await getActivePresets(db);
  return list.find((p) => p.stableKey === stableKey) ?? null;
}

export { hashPresetContent, upsertPresetVersionAtomic };
