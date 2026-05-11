import { inferAspectRatioFromSize } from "@/lib/jobs/task-size";
import { resolveSizeForModel } from "@/lib/providers/image-size-presets";
import { getOpenAIModelSpec } from "@/lib/providers/openai-models";
import { getDefaultQualityForModel, getQualityOptionsForModel } from "@/lib/providers/model-quality";

type SizeOrientation = "landscape" | "portrait" | "square";

function inferSizeOrientation(size: string | null): SizeOrientation | null {
  if (!size) return null;
  const [w, h] = size.split("x").map((part) => Number.parseInt(part, 10));
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return null;
  if (w === h) return "square";
  return w > h ? "landscape" : "portrait";
}

function resolveFallbackSizeByOrientation(model: string, orientation: SizeOrientation | null): string | null {
  if (!orientation) return resolveSizeForModel(model, "1:1");
  if (orientation === "square") return resolveSizeForModel(model, "1:1");

  const preferredRatios = orientation === "landscape"
    ? ["16:9", "4:3", "3:2"]
    : ["9:16", "2:3", "4:6"];

  for (const ratio of preferredRatios) {
    const resolved = resolveSizeForModel(model, ratio);
    if (resolved) return resolved;
  }
  return resolveSizeForModel(model, "1:1");
}

function resolveCompatiblePresetSizeForModel(model: string, rawSize: string | null): string | null {
  if (!rawSize) return resolveSizeForModel(model, "1:1");
  const spec = getOpenAIModelSpec(model);
  if (!spec) return rawSize;
  if (spec.allowedSizes.includes(rawSize)) return rawSize;

  const inferredRatio = inferAspectRatioFromSize(rawSize);
  if (inferredRatio) {
    const ratioRemap = resolveSizeForModel(model, inferredRatio);
    if (ratioRemap) return ratioRemap;
  }

  const orientation = inferSizeOrientation(rawSize);
  return resolveFallbackSizeByOrientation(model, orientation) ?? rawSize;
}

export function normalizePresetDefaultsForModel(input: {
  provider: string;
  model: string;
  defaultParams: Record<string, unknown>;
}) {
  const defaults = { ...input.defaultParams };
  if (input.provider !== "openai") return defaults;

  const rawSize = typeof defaults.size === "string" ? defaults.size : null;
  defaults.size = resolveCompatiblePresetSizeForModel(input.model, rawSize) ?? defaults.size;

  const options = getQualityOptionsForModel("openai", input.model);
  const rawQuality = typeof defaults.quality === "string" ? defaults.quality : null;
  defaults.quality = rawQuality && options.includes(rawQuality) ? rawQuality : getDefaultQualityForModel("openai", input.model);
  return defaults;
}
