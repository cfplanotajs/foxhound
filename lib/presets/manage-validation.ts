import { isSupportedOpenAIModel } from "@/lib/providers/openai-models";
import { assertSupportedProvider } from "@/lib/providers/supported";

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
