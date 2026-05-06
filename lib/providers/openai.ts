import OpenAI from "openai";
import { getEnv } from "@/lib/env";
import { ImageProvider, NormalizedImageRequest, NormalizedImageResult } from "@/lib/providers/types";

export function buildOpenAIImagePayload(request: NormalizedImageRequest) {
  const requestedCount = request.count ?? 1;
  const isGptImage = request.model.startsWith("gpt-image");
  const safeCount = isGptImage ? 1 : requestedCount;
  return {
    model: request.model,
    prompt: request.prompt,
    size: (request.size as "1024x1024" | "auto" | "1536x1024" | "1024x1536" | "256x256" | "512x512" | "1792x1024" | "1024x1792" | undefined) ?? "1024x1024",
    quality: request.quality ?? "high",
    n: safeCount,
    ...(isGptImage ? {} : { response_format: "b64_json" as const })
  } as const;
}

export async function decodeOpenAIImage(response: OpenAI.Images.ImagesResponse): Promise<Buffer> {
  const first = response.data?.[0];
  if (!first) throw new Error("OpenAI response did not include image data");

  if (first.b64_json) {
    return Buffer.from(first.b64_json, "base64");
  }

  if (first.url) {
    const imageRes = await fetch(first.url);
    if (!imageRes.ok) {
      throw new Error(`OpenAI image URL fetch failed with status ${imageRes.status}`);
    }
    const arr = await imageRes.arrayBuffer();
    return Buffer.from(arr);
  }

  throw new Error("OpenAI response did not include b64_json or url image data");
}

export class OpenAIProvider implements ImageProvider {
  private client: OpenAI;

  constructor() {
    this.client = new OpenAI({ apiKey: getEnv().OPENAI_API_KEY });
  }

  async generateImage(request: NormalizedImageRequest): Promise<NormalizedImageResult> {
    const payload = buildOpenAIImagePayload(request);
    const response = await this.client.images.generate(payload);
    const bytes = await decodeOpenAIImage(response);

    return {
      images: [{ bytes, mimeType: "image/png" }],
      providerMetadata: {
        created: response.created,
        revisedPrompt: response.data?.[0]?.revised_prompt ?? null,
        upstreamPayload: payload
      }
    };
  }
}
