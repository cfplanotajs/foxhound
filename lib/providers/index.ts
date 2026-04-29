import { OpenAIProvider } from "@/lib/providers/openai";
import { ImageProvider, ProviderName } from "@/lib/providers/types";

export function getProvider(provider: ProviderName): ImageProvider {
  if (provider === "openai") return new OpenAIProvider();
  throw new Error(`Unsupported provider: ${provider}`);
}
