import { NextResponse } from "next/server";
import { getActivePresets, seedPresetsFromConfig } from "@/lib/presets";
import { getEnv } from "@/lib/env";

export async function GET() {
  try {
    await seedPresetsFromConfig();
    const presets = await getActivePresets();
    const envModel = getEnv().OPENAI_IMAGE_MODEL?.trim();
    const normalized = presets.map((preset) => ({
      ...preset,
      defaultModel: preset.defaultProvider === "openai" && envModel ? envModel : preset.defaultModel
    }));
    return NextResponse.json({ presets: normalized });
  } catch (error) {
    if (error instanceof Error && error.message === "Preset default model is not supported by this app configuration.") {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
