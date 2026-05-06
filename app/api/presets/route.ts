import { NextResponse } from "next/server";
import { getActivePresets, seedPresetsFromConfig } from "@/lib/presets";

export async function GET() {
  await seedPresetsFromConfig();
  const presets = await getActivePresets();
  return NextResponse.json({ presets });
}
