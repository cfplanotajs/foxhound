import { resolveSizeForModel } from "@/lib/providers/image-size-presets";
import { isSizeSupportedForOpenAIModel } from "@/lib/providers/openai-models";

function isSizeSupportedByModel(model: string, size: string): boolean {
  if (model.startsWith("mock")) return true;
  return isSizeSupportedForOpenAIModel(model, size);
}

export function resolveFinalTaskSize(input: { model: string; aspectRatio?: string; presetDefaultSize?: string | null }) {
  const explicitAspectRatio = typeof input.aspectRatio === "string" && input.aspectRatio.length > 0 ? input.aspectRatio : null;
  const hasExplicitAspectRatio = !!explicitAspectRatio;
  const resolvedFromAspectRatio = explicitAspectRatio ? resolveSizeForModel(input.model, explicitAspectRatio) : null;
  if (hasExplicitAspectRatio && !resolvedFromAspectRatio) return { ok: false as const, finalSize: null };
  const finalSize = resolvedFromAspectRatio ?? input.presetDefaultSize ?? resolveSizeForModel(input.model, "1:1");
  if (!finalSize) return { ok: false as const, finalSize: null, reason: "unresolved" as const };
  if (!isSizeSupportedByModel(input.model, finalSize)) return { ok: false as const, finalSize: null, reason: "unsupported-size" as const, attemptedSize: finalSize };
  return { ok: true as const, finalSize };
}

export function inferAspectRatioFromSize(size?: string | null): string | null {
  const map: Record<string, string> = {
    "1536x1024": "3:2",
    "1536x1152": "4:3",
    "1024x1536": "2:3",
    "1152x2048": "9:16",
    "1536x864": "16:9",
    "1792x1024": "16:9",
    "1024x1792": "9:16"
  };
  if (!size) return null;
  const trimmed = size.trim();
  const match = /^(\d+)x(\d+)$/.exec(trimmed);
  if (!match) return null;
  const width = Number.parseInt(match[1], 10);
  const height = Number.parseInt(match[2], 10);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return null;
  if (width === height) return "1:1";
  return map[trimmed] ?? null;
}
