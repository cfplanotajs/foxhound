import { NextResponse } from "next/server";
import { getActivePresets, seedPresetsFromConfig } from "@/lib/presets";
import { getEnv } from "@/lib/env";

export async function GET() {
  await seedPresetsFromConfig();
  const presets = await getActivePresets();
  const envModel = getEnv().OPENAI_IMAGE_MODEL?.trim();
  const normalized = presets.map((preset) => ({
    ...preset,
    defaultModel: preset.defaultProvider === "openai" && envModel ? envModel : preset.defaultModel
  }));
  return NextResponse.json({ presets: normalized });
}
