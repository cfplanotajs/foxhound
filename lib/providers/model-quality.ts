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
