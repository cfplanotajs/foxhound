import { resolveSizeForModel } from "@/lib/providers/image-size-presets";

export function resolveFinalTaskSize(input: { model: string; aspectRatio?: string; presetDefaultSize?: string | null }) {
  const explicitAspectRatio = typeof input.aspectRatio === "string" && input.aspectRatio.length > 0 ? input.aspectRatio : null;
  const hasExplicitAspectRatio = !!explicitAspectRatio;
  const resolvedFromAspectRatio = explicitAspectRatio ? resolveSizeForModel(input.model, explicitAspectRatio) : null;
  if (hasExplicitAspectRatio && !resolvedFromAspectRatio) return { ok: false as const, finalSize: null };
  const finalSize = resolvedFromAspectRatio ?? input.presetDefaultSize ?? resolveSizeForModel(input.model, "1:1");
  return { ok: !!finalSize, finalSize: finalSize ?? null } as const;
}
