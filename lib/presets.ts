import crypto from "node:crypto";
import presets from "@/config/presets.json";
import { prisma } from "@/lib/db";

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

function toVersionTag(index: number) {
  return `v${index}`;
}

export async function seedPresetsFromConfig(): Promise<void> {
  for (const item of presets as Array<Record<string, any>>) {
    const stableKey = String(item.id);
    const preset = await prisma.preset.upsert({
      where: { stableKey },
      update: { name: String(item.name), description: String(item.description), isArchived: false },
      create: { stableKey, name: String(item.name), description: String(item.description), isArchived: false }
    });

    const contentHash = hashPresetContent({
      stylePrompt: String(item.stylePrompt),
      defaultProvider: String(item.defaultProvider),
      defaultModel: String(item.defaultModel),
      defaultParams: (item.defaultParams ?? {}) as Record<string, unknown>
    });

    const existing = await prisma.presetVersion.findUnique({ where: { presetId_contentHash: { presetId: preset.id, contentHash } } });
    if (existing) continue;
    const latest = await prisma.presetVersion.findFirst({ where: { presetId: preset.id }, orderBy: { createdAt: "desc" } });
    const nextVersion = toVersionTag(((latest && Number(latest.version.replace(/^v/, ""))) || 0) + 1);

    await prisma.presetVersion.create({
      data: {
        presetId: preset.id,
        version: nextVersion,
        stylePrompt: String(item.stylePrompt),
        defaultProvider: String(item.defaultProvider),
        defaultModel: String(item.defaultModel),
        defaultParamsJson: JSON.stringify(item.defaultParams ?? {}),
        contentHash
      }
    });
  }
}

export async function getActivePresets(): Promise<DbPresetView[]> {
  const presets = await prisma.preset.findMany({ where: { isArchived: false }, include: { versions: { orderBy: { createdAt: "desc" }, take: 1 } }, orderBy: { name: "asc" } });
  return presets
    .filter((p) => p.versions[0])
    .map((p) => ({
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

export async function getPresetByStableKey(stableKey: string): Promise<DbPresetView | null> {
  const presets = await getActivePresets();
  return presets.find((p) => p.stableKey === stableKey) ?? null;
}
