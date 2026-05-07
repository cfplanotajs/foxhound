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
    return { provider, model: input.modelFromBody?.trim() || input.presetDefaultModel || "mock-v1" };
  }

  const envDefaultModel = getEnv().OPENAI_IMAGE_MODEL?.trim();
  const model = input.modelFromBody?.trim() || envDefaultModel || input.presetDefaultModel || null;
  return { provider: "openai", model };
}
