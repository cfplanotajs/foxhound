import { isSupportedOpenAIModel } from "@/lib/providers/openai-models";
import { assertSupportedProvider } from "@/lib/providers/supported";
import { getQualityOptionsForModel, resolveEffectiveQuality } from "@/lib/providers/model-quality";
import { isSizeSupportedForOpenAIModel } from "@/lib/providers/openai-models";



function validatePresetDefaultSize(input: { provider: "openai" | "mock"; model: string; size: string }) {
  if (input.provider === "mock") return;
  if (!isSizeSupportedForOpenAIModel(input.model, input.size)) {
    throw new Error(`Size ${input.size} is not supported by model ${input.model}.`);
  }
}

const STABLE_KEY_PATTERN = /^[a-z0-9_-]+$/;

export function requiredText(value: unknown, message: string): string {
  const v = String(value ?? "").trim();
  if (!v) throw new Error(message);
  return v;
}

export function validatePresetStableKey(value: unknown): string {
  const stableKey = requiredText(value, "Preset stableKey is required.");
  if (!STABLE_KEY_PATTERN.test(stableKey)) {
    throw new Error("Preset stableKey must use only lowercase letters, numbers, hyphens, or underscores.");
  }
  return stableKey;
}

export function parseDefaultParams(value: unknown): Record<string, unknown> {
  if (value == null) return {};
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as Record<string, unknown>;
    } catch {
      throw new Error("Default params must be valid JSON.");
    }
  }
  if (typeof value === "object") return value as Record<string, unknown>;
  throw new Error("Default params must be valid JSON.");
}

export function normalizePresetProviderModel(input: { defaultProvider: unknown; defaultModel: unknown }) {
  const provider = assertSupportedProvider(requiredText(input.defaultProvider, "Default provider is required."));
  const defaultModel = requiredText(input.defaultModel, "Default model is required.");
  if (provider === "openai" && !isSupportedOpenAIModel(defaultModel)) {
    throw new Error(`Unsupported OpenAI image model: ${defaultModel}`);
  }
  return { provider, defaultModel };
}

export function normalizePresetDefaultParams(input: {
  provider: "openai" | "mock";
  model: string;
  defaultParams: Record<string, unknown>;
}): Record<string, unknown> {
  const out = { ...input.defaultParams };
  const rawSize = typeof out.size === "string" ? out.size.trim() : null;
  if (rawSize) {
    validatePresetDefaultSize({ provider: input.provider, model: input.model, size: rawSize });
    out.size = rawSize;
  }

  const rawQuality = typeof out.quality === "string" ? out.quality.trim() : null;
  if (!rawQuality) return out;

  if (!getQualityOptionsForModel(input.provider, input.model).includes(rawQuality)) {
    throw new Error(`Quality ${rawQuality} is not supported for model ${input.model}.`);
  }
  out.quality = resolveEffectiveQuality({ provider: input.provider, model: input.model, requestedQuality: rawQuality });
  return out;
}

export function isPresetManageValidationError(error: unknown): error is Error {
  if (!(error instanceof Error)) return false;
  return /(required|valid JSON|must use only lowercase letters|Quality .+ is not supported for model .+\.|Size .+ is not supported by model .+\.)/.test(error.message);
}
