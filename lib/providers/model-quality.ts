import { getOpenAIModelSpec } from "@/lib/providers/openai-models";

export function getQualityOptionsForModel(provider: "openai" | "mock", model: string): string[] {
  if (provider === "mock") return ["high"];
  const spec = getOpenAIModelSpec(model);
  return spec?.allowedQualities ?? ["high"];
}

export function normalizeQualityForModel(provider: "openai" | "mock", model: string, quality?: string | null): string {
  const options = getQualityOptionsForModel(provider, model);
  if (!quality || !options.includes(quality)) return options[0];
  return quality;
}

export function getDefaultQualityForModel(provider: "openai" | "mock", model: string): string {
  const options = getQualityOptionsForModel(provider, model);
  if (provider === "mock") return "high";
  if (model.startsWith("gpt-image") && options.includes("auto")) return "auto";
  if (options.includes("standard")) return "standard";
  return options[0] ?? "high";
}

export function resolveEffectiveQuality(input: {
  provider: "openai" | "mock";
  model: string;
  requestedQuality?: string | null;
  presetDefaultQuality?: string | null;
}): string {
  const options = getQualityOptionsForModel(input.provider, input.model);
  const requested = input.requestedQuality?.trim() || null;
  const presetDefault = input.presetDefaultQuality?.trim() || null;
  if (requested) {
    if (!options.includes(requested)) throw new Error(`Quality ${requested} is not supported for model ${input.model}.`);
    return requested;
  }
  if (presetDefault) {
    if (!options.includes(presetDefault)) throw new Error(`Quality ${presetDefault} is not supported for model ${input.model}.`);
    return presetDefault;
  }
  return getDefaultQualityForModel(input.provider, input.model);
}

export function getCompatiblePresetDefaultQuality(input: {
  provider: "openai" | "mock";
  model: string;
  presetDefaultQuality?: string | null;
}): string | null {
  const presetDefault = input.presetDefaultQuality?.trim() || null;
  if (!presetDefault) return null;
  return getQualityOptionsForModel(input.provider, input.model).includes(presetDefault) ? presetDefault : null;
}
