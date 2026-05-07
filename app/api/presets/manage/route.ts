import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPresetContent } from "@/lib/presets";
import { normalizePresetProviderModel, parseDefaultParams, requiredText } from "@/lib/presets/manage-validation";

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
    const body = await request.json();
    const action = body?.action as string;

    if (action === "create") {
      const { provider, defaultModel } = normalizePresetProviderModel({ defaultProvider: body.defaultProvider, defaultModel: body.defaultModel });
      const name = requiredText(body.name, "Preset name is required.");
      const stylePrompt = requiredText(body.stylePrompt, "Style prompt is required.");
      const defaultParams = parseDefaultParams(body.defaultParams);
      const preset = await prisma.preset.create({
        data: {
          stableKey: body.stableKey,
          name,
          description: body.description ?? "",
          bestUseLabel: body.bestUseLabel ?? null,
          isArchived: false,
          versions: {
            create: {
              version: "v1",
              stylePrompt,
              defaultProvider: provider,
              defaultModel,
              defaultParamsJson: JSON.stringify(defaultParams),
              samplePrompt: body.samplePrompt ?? null,
              contentHash: body.contentHash ?? hashPresetContent({ stylePrompt, defaultProvider: provider, defaultModel, defaultParams })
            }
          }
        }
      });
      return NextResponse.json({ presetId: preset.id });
    }

    if (action === "edit") {
      const preset = await prisma.preset.findUnique({ where: { stableKey: body.stableKey }, include: { versions: { orderBy: { createdAt: "desc" }, take: 1 } } });
      if (!preset) return NextResponse.json({ error: "Preset not found" }, { status: 404 });
      const { provider, defaultModel } = normalizePresetProviderModel({ defaultProvider: body.defaultProvider, defaultModel: body.defaultModel });
      const name = requiredText(body.name, "Preset name is required.");
      const stylePrompt = requiredText(body.stylePrompt, "Style prompt is required.");
      const defaultParams = parseDefaultParams(body.defaultParams);
      const contentHash = body.contentHash ?? hashPresetContent({ stylePrompt, defaultProvider: provider, defaultModel, defaultParams });
      const latest = preset.versions[0];
      if (latest && latest.contentHash === contentHash) return NextResponse.json({ presetId: preset.id, noChange: true });
      const next = `v${((latest && Number(latest.version.replace(/^v/, ""))) || 0) + 1}`;
      await prisma.preset.update({
        where: { id: preset.id },
        data: {
          name,
          description: body.description ?? "",
          bestUseLabel: body.bestUseLabel ?? null,
          versions: {
            create: {
              version: next,
              stylePrompt,
              defaultProvider: provider,
              defaultModel,
              defaultParamsJson: JSON.stringify(defaultParams),
              samplePrompt: body.samplePrompt ?? null,
              contentHash
            }
          }
        }
      });
      return NextResponse.json({ presetId: preset.id, version: next });
    }

    if (action === "duplicate") {
      const source = await prisma.preset.findUnique({ where: { stableKey: body.stableKey }, include: { versions: { orderBy: { createdAt: "desc" }, take: 1 } } });
      if (!source || !source.versions[0]) return NextResponse.json({ error: "Preset not found" }, { status: 404 });
      const latest = source.versions[0];
      const created = await prisma.preset.create({
        data: {
          stableKey: body.newStableKey,
          name: body.newName,
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
              contentHash: `${latest.contentHash}-${Date.now()}`
            }
          }
        }
      });
      return NextResponse.json({ presetId: created.id });
    }

    if (action === "archive") {
      await prisma.preset.update({ where: { stableKey: body.stableKey }, data: { isArchived: !!body.isArchived } });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Unsupported provider:")) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof Error && error.message.startsWith("Unsupported OpenAI image model:")) return NextResponse.json({ error: error.message }, { status: 400 });
    if (error instanceof Error && /(required|valid JSON)/.test(error.message)) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
