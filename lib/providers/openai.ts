import OpenAI from "openai";
import { getEnv } from "@/lib/env";
import { ImageProvider, NormalizedImageRequest, NormalizedImageResult } from "@/lib/providers/types";

export class OpenAIProvider implements ImageProvider {
  private client: OpenAI;

  constructor() {
    this.client = new OpenAI({ apiKey: getEnv().OPENAI_API_KEY });
  }

  async generateImage(request: NormalizedImageRequest): Promise<NormalizedImageResult> {
    const response = await this.client.images.generate({
      model: request.model,
      prompt: request.prompt,
      size: (request.size as "1024x1024" | "auto" | "1536x1024" | "1024x1536" | "256x256" | "512x512" | "1792x1024" | "1024x1792" | undefined) ?? "1024x1024",
      quality: request.quality ?? "high"
    });

    const imageBase64 = response.data?.[0]?.b64_json;
    if (!imageBase64) throw new Error("OpenAI response did not include image data");

    return {
      images: [{ bytes: Buffer.from(imageBase64, "base64"), mimeType: "image/png" }],
      providerMetadata: {
        created: response.created,
        revisedPrompt: response.data?.[0]?.revised_prompt ?? null
      }
    };
  }
}
