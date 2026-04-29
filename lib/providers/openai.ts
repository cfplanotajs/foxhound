import OpenAI from "openai";
import { requireEnv } from "@/lib/env";
import { ImageProvider, ProviderGenerateRequest, ProviderGenerateResponse } from "@/lib/providers/types";

export class OpenAIProvider implements ImageProvider {
  private client: OpenAI;

  constructor() {
    this.client = new OpenAI({ apiKey: requireEnv("OPENAI_API_KEY") });
  }

  async generateImage(request: ProviderGenerateRequest): Promise<ProviderGenerateResponse> {
    const response = await this.client.images.generate({
      model: request.model,
      prompt: request.prompt,
      size: (request.params?.size as string | undefined) ?? "1024x1024",
      quality: (request.params?.quality as "low" | "medium" | "high" | "auto" | undefined) ?? "high"
    });

    const imageBase64 = response.data?.[0]?.b64_json;
    if (!imageBase64) {
      throw new Error("OpenAI response did not include image data");
    }

    return {
      imageBytes: Buffer.from(imageBase64, "base64"),
      metadata: {
        created: response.created,
        revisedPrompt: response.data?.[0]?.revised_prompt ?? null
      }
    };
  }
}
