import { getEnv } from "@/lib/env";
import { assertSupportedProvider, parseSupportedProvider } from "@/lib/providers/supported";

export function resolveProviderAndModel(input: {
  providerFromBody?: string;
  modelFromBody?: string;
  presetDefaultProvider?: string;
  presetDefaultModel?: string;
}): { provider: "openai" | "mock"; model: string | null } {
  const providerFromBody = input.providerFromBody?.trim() ? assertSupportedProvider(input.providerFromBody) : null;
  const presetProvider = parseSupportedProvider(input.presetDefaultProvider);
  const provider = providerFromBody ?? presetProvider ?? "openai";

  if (provider === "mock") {
    const bodyModel = input.modelFromBody?.trim() || "";
    if (!bodyModel) return { provider, model: "mock-v1" };
    return { provider, model: bodyModel === "mock-v1" ? "mock-v1" : "mock-v1" };
  }

  const envDefaultModel = getEnv().OPENAI_IMAGE_MODEL?.trim();
  const model = input.modelFromBody?.trim() || envDefaultModel || input.presetDefaultModel || null;
  return { provider: "openai", model };
}
