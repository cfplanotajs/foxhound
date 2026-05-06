import { getEnv } from "@/lib/env";

export function resolveProviderAndModel(input: {
  providerFromBody?: string;
  modelFromBody?: string;
  presetDefaultProvider?: string;
  presetDefaultModel?: string;
}): { provider: "openai" | "mock"; model: string | null } {
  const provider = (input.providerFromBody ?? input.presetDefaultProvider ?? "openai") as "openai" | "mock";

  if (provider === "mock") {
    return { provider, model: input.modelFromBody?.trim() || input.presetDefaultModel || "mock-v1" };
  }

  const envDefaultModel = getEnv().OPENAI_IMAGE_MODEL?.trim();
  const model = envDefaultModel || input.modelFromBody?.trim() || input.presetDefaultModel || null;
  return { provider: "openai", model };
}
