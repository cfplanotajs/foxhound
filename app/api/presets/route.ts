import { NextResponse } from "next/server";
import { getActivePresets, seedPresetsFromConfig } from "@/lib/presets";
import { getEnv } from "@/lib/env";
import { normalizePresetDefaultsForModel } from "@/lib/presets/defaults-normalizer";
import { resolveEffectiveOpenAIModel } from "@/lib/presets/effective-openai-model";

export async function GET() {
  try {
    await seedPresetsFromConfig();
    const presets = await getActivePresets();
    const envModel = getEnv().OPENAI_IMAGE_MODEL;
    const normalized = presets.map((preset) => {
      const effectiveModel = preset.defaultProvider === "openai"
        ? resolveEffectiveOpenAIModel(preset.defaultModel, envModel)
        : preset.defaultModel;
      const defaultParams = normalizePresetDefaultsForModel({
        provider: preset.defaultProvider,
        model: effectiveModel,
        defaultParams: (preset.defaultParams ?? {}) as Record<string, unknown>
      });
      return {
        ...preset,
        defaultModel: effectiveModel,
        defaultParams
      };
    });
    return NextResponse.json({ presets: normalized });
  } catch (error) {
    if (error instanceof Error && error.message === "Preset default model is not supported by this app configuration.") {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
