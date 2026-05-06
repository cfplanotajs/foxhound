import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isSupportedOpenAIModel } from "@/lib/providers/openai-models";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const action = body?.action as string;

    if (action === "create") {
      if (body.defaultProvider === "openai" && !isSupportedOpenAIModel(body.defaultModel)) {
        return NextResponse.json({ error: `Unsupported OpenAI image model: ${body.defaultModel}` }, { status: 400 });
      }
      const preset = await prisma.preset.create({
        data: {
          stableKey: body.stableKey,
          name: body.name,
          description: body.description ?? "",
          bestUseLabel: body.bestUseLabel ?? null,
          isArchived: false,
          versions: {
            create: {
              version: "v1",
              stylePrompt: body.stylePrompt,
              defaultProvider: body.defaultProvider,
              defaultModel: body.defaultModel,
              defaultParamsJson: JSON.stringify(body.defaultParams ?? {}),
              samplePrompt: body.samplePrompt ?? null,
              contentHash: body.contentHash
            }
          }
        }
      });
      return NextResponse.json({ presetId: preset.id });
    }

    if (action === "edit") {
      const preset = await prisma.preset.findUnique({ where: { stableKey: body.stableKey }, include: { versions: { orderBy: { createdAt: "desc" }, take: 1 } } });
      if (!preset) return NextResponse.json({ error: "Preset not found" }, { status: 404 });
      if (body.defaultProvider === "openai" && !isSupportedOpenAIModel(body.defaultModel)) {
        return NextResponse.json({ error: `Unsupported OpenAI image model: ${body.defaultModel}` }, { status: 400 });
      }
      const latest = preset.versions[0];
      if (latest && latest.contentHash === body.contentHash) return NextResponse.json({ presetId: preset.id, noChange: true });
      const next = `v${((latest && Number(latest.version.replace(/^v/, ""))) || 0) + 1}`;
      await prisma.preset.update({
        where: { id: preset.id },
        data: {
          name: body.name,
          description: body.description ?? "",
          bestUseLabel: body.bestUseLabel ?? null,
          versions: {
            create: {
              version: next,
              stylePrompt: body.stylePrompt,
              defaultProvider: body.defaultProvider,
              defaultModel: body.defaultModel,
              defaultParamsJson: JSON.stringify(body.defaultParams ?? {}),
              samplePrompt: body.samplePrompt ?? null,
              contentHash: body.contentHash
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
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
