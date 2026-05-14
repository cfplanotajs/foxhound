import { isSupportedOpenAIModel } from "@/lib/providers/openai-models";

export function resolveEffectiveOpenAIModel(storedModel: string, envModelRaw?: string): string {
  const envModel = envModelRaw?.trim();
  if (!envModel) return storedModel;
  if (!isSupportedOpenAIModel(envModel)) return storedModel;
  return envModel;
}
