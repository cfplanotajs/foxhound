import { NextResponse } from "next/server";
import { getPresets } from "@/lib/presets";

export async function GET() {
  return NextResponse.json({ presets: getPresets() });
}
