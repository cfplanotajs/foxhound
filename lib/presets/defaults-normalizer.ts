import { inferAspectRatioFromSize } from "@/lib/jobs/task-size";
import { resolveSizeForModel } from "@/lib/providers/image-size-presets";
import { getDefaultQualityForModel, getQualityOptionsForModel } from "@/lib/providers/model-quality";

export function normalizePresetDefaultsForModel(input: {
  provider: string;
  model: string;
  defaultParams: Record<string, unknown>;
}) {
  const defaults = { ...input.defaultParams };
  if (input.provider !== "openai") return defaults;

  const rawSize = typeof defaults.size === "string" ? defaults.size : null;
  const sizeSupported = !!rawSize && !!resolveSizeForModel(input.model, inferAspectRatioFromSize(rawSize) ?? "") && rawSize === resolveSizeForModel(input.model, inferAspectRatioFromSize(rawSize) ?? "");

  if (!sizeSupported) {
    const inferredRatio = inferAspectRatioFromSize(rawSize);
    const remapped = inferredRatio ? resolveSizeForModel(input.model, inferredRatio) : null;
    defaults.size = remapped ?? resolveSizeForModel(input.model, "1:1") ?? defaults.size;
  }

  const options = getQualityOptionsForModel("openai", input.model);
  const rawQuality = typeof defaults.quality === "string" ? defaults.quality : null;
  defaults.quality = rawQuality && options.includes(rawQuality) ? rawQuality : getDefaultQualityForModel("openai", input.model);
  return defaults;
}
