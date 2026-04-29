import { OpenAIProvider } from "@/lib/providers/openai";
import { ImageProvider } from "@/lib/providers/types";

export function getProvider(provider: string): ImageProvider {
  if (provider === "openai") {
    return new OpenAIProvider();
  }

  throw new Error(`Unsupported provider: ${provider}`);
}
