import { resolveSizeForModel } from "@/lib/providers/image-size-presets";
import { getOpenAIModelSpec } from "@/lib/providers/openai-models";

function isSizeSupportedByModel(model: string, size: string): boolean {
  if (model.startsWith("mock")) return true;
  const spec = getOpenAIModelSpec(model);
  if (!spec) return false;
  return spec.allowedSizes.includes(size);
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
