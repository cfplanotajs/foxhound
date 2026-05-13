import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { hashPresetContent } from "@/lib/presets";
import { isPresetManageValidationError, normalizePresetDefaultParams, normalizePresetProviderModel, parseDefaultParams, requiredText, validatePresetStableKey } from "@/lib/presets/manage-validation";
import { parseJsonBody } from "@/lib/jobs/json-body";


async function createNextPresetVersionWithRetry(input: {
  db: Prisma.TransactionClient | typeof prisma;
  presetId: string;
  stylePrompt: string;
  provider: "openai" | "mock";
  defaultModel: string;
  defaultParams: Record<string, unknown>;
  samplePrompt: string | null;
  contentHash: string;
}) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const latest = await input.db.presetVersion.findFirst({ where: { presetId: input.presetId }, orderBy: { createdAt: "desc" } });
    const next = `v${((latest && Number(latest.version.replace(/^v/, ""))) || 0) + 1}`;
    try {
      const created = await input.db.presetVersion.create({
        data: {
          presetId: input.presetId,
          version: next,
          stylePrompt: input.stylePrompt,
          defaultProvider: input.provider,
          defaultModel: input.defaultModel,
          defaultParamsJson: JSON.stringify(input.defaultParams),
          samplePrompt: input.samplePrompt,
          contentHash: input.contentHash
        }
      });
      return { version: created.version };
    } catch (error) {
      const e = error as { code?: string };
      if (e?.code !== "P2002") throw error;
      const sameContent = await input.db.presetVersion.findUnique({ where: { presetId_contentHash: { presetId: input.presetId, contentHash: input.contentHash } } });
      if (sameContent) return { version: sameContent.version, noChange: true as const };
      if (attempt === 2) throw error;
    }
  }
  throw new Error("Unable to create preset version.");
}

export async function GET() {
  const rows = await prisma.preset.findMany({ include: { versions: { orderBy: { createdAt: "desc" }, take: 1 } }, orderBy: { updatedAt: "desc" } });
  const presets = rows.filter((r: any) => r.versions[0]).map((r: any) => ({
    stableKey: r.stableKey,
    name: r.name,
    description: r.description,
    bestUseLabel: r.bestUseLabel,
    isArchived: r.isArchived,
    version: r.versions[0].version,
    stylePrompt: r.versions[0].stylePrompt,
    defaultProvider: r.versions[0].defaultProvider,
    defaultModel: r.versions[0].defaultModel,
    defaultParamsJson: r.versions[0].defaultParamsJson,
    samplePrompt: r.versions[0].samplePrompt
  }));
  return NextResponse.json({ active: presets.filter((p: any) => !p.isArchived), archived: presets.filter((p: any) => p.isArchived) });
}

export async function POST(request: Request) {
  try {
    const parsedBody = await parseJsonBody(request);
    if (!parsedBody.ok) return NextResponse.json({ error: "Malformed JSON request body." }, { status: 400 });
    const body = parsedBody.data as Record<string, unknown>;
    const action = typeof body.action === "string" ? body.action : "";
    const description = typeof body.description === "string" ? body.description : "";
    const bestUseLabel = typeof body.bestUseLabel === "string" ? body.bestUseLabel : null;
    const samplePrompt = typeof body.samplePrompt === "string" ? body.samplePrompt : null;

    if (action === "create") {
      const { provider, defaultModel } = normalizePresetProviderModel({ defaultProvider: body.defaultProvider, defaultModel: body.defaultModel });
      const name = requiredText(body.name, "Preset name is required.");
      const stylePrompt = requiredText(body.stylePrompt, "Style prompt is required.");
      const defaultParams = normalizePresetDefaultParams({ provider, model: defaultModel, defaultParams: parseDefaultParams(body.defaultParams) });
      const preset = await prisma.preset.create({
        data: {
          stableKey: validatePresetStableKey(body.stableKey),
          name,
          description,
          bestUseLabel,
          isArchived: false,
          versions: {
            create: {
              version: "v1",
              stylePrompt,
              defaultProvider: provider,
              defaultModel,
              defaultParamsJson: JSON.stringify(defaultParams),
              samplePrompt,
              contentHash: hashPresetContent({ stylePrompt, defaultProvider: provider, defaultModel, defaultParams, samplePrompt })
            }
          }
        }
      });
      return NextResponse.json({ presetId: preset.id });
    }

    if (action === "edit") {
      const preset = await prisma.preset.findUnique({ where: { stableKey: validatePresetStableKey(body.stableKey) }, include: { versions: { orderBy: { createdAt: "desc" }, take: 1 } } });
      if (!preset) return NextResponse.json({ error: "Preset not found" }, { status: 404 });
      const { provider, defaultModel } = normalizePresetProviderModel({ defaultProvider: body.defaultProvider, defaultModel: body.defaultModel });
      const name = requiredText(body.name, "Preset name is required.");
      const stylePrompt = requiredText(body.stylePrompt, "Style prompt is required.");
      const defaultParams = normalizePresetDefaultParams({ provider, model: defaultModel, defaultParams: parseDefaultParams(body.defaultParams) });
      const contentHash = hashPresetContent({ stylePrompt, defaultProvider: provider, defaultModel, defaultParams, samplePrompt });
      const latest = preset.versions[0];
      if (latest && latest.contentHash === contentHash) return NextResponse.json({ presetId: preset.id, noChange: true });
      const versionResult = await prisma.$transaction(async (tx) => {
        await tx.preset.update({ where: { id: preset.id }, data: { name, description, bestUseLabel } });
        return createNextPresetVersionWithRetry({
          db: tx,
          presetId: preset.id,
          stylePrompt,
          provider,
          defaultModel,
          defaultParams,
          samplePrompt,
          contentHash
        });
      });
      if (versionResult.noChange) return NextResponse.json({ presetId: preset.id, noChange: true });
      return NextResponse.json({ presetId: preset.id, version: versionResult.version });
    }

    if (action === "duplicate") {
      const sourceStableKey = validatePresetStableKey(body.stableKey);
      const newStableKey = validatePresetStableKey(body.newStableKey);
      const newName = requiredText(body.newName, "Preset name is required.");
      const source = await prisma.preset.findUnique({ where: { stableKey: sourceStableKey }, include: { versions: { orderBy: { createdAt: "desc" }, take: 1 } } });
      if (!source || !source.versions[0]) return NextResponse.json({ error: "Preset not found" }, { status: 404 });
      const latest = source.versions[0];
      const defaultParams = JSON.parse(latest.defaultParamsJson ?? "{}") as Record<string, unknown>;
      const contentHash = hashPresetContent({
        stylePrompt: latest.stylePrompt,
        defaultProvider: latest.defaultProvider,
        defaultModel: latest.defaultModel,
        defaultParams,
        samplePrompt: latest.samplePrompt
      });
      const created = await prisma.preset.create({
        data: {
          stableKey: newStableKey,
          name: newName,
          description: source.description,
          bestUseLabel: source.bestUseLabel,
          versions: {
            create: {
              version: "v1",
              stylePrompt: latest.stylePrompt,
              defaultProvider: latest.defaultProvider,
              defaultModel: latest.defaultModel,
              defaultParamsJson: latest.defaultParamsJson,
              samplePrompt: latest.samplePrompt,
              contentHash
            }
          }
        }
      });
      return NextResponse.json({ presetId: created.id });
    }

    if (action === "archive") {
      const stableKey = validatePresetStableKey(body.stableKey);
      await prisma.preset.update({ where: { stableKey }, data: { isArchived: !!body.isArchived } });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Unsupported provider:")) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof Error && error.message.startsWith("Unsupported OpenAI image model:")) return NextResponse.json({ error: error.message }, { status: 400 });
    if (isPresetManageValidationError(error)) return NextResponse.json({ error: error.message }, { status: 400 });
    if (error instanceof Error && error.message.includes("Unique constraint failed") && error.message.includes("stableKey")) {
      return NextResponse.json({ error: "Preset stableKey already exists." }, { status: 400 });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
