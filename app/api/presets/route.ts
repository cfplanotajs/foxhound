import { NextResponse } from "next/server";
import { getPresets } from "@/lib/presets";
import { requireApiToken } from "@/lib/env";

export async function GET(request: Request) {
  try {
    requireApiToken(request);
    return NextResponse.json({ presets: getPresets() });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
