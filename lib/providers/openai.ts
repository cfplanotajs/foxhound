import OpenAI from "openai";
import { getOpenAIConfig } from "@/lib/env";
import { assertSupportedOpenAIModel } from "@/lib/providers/openai-models";
import { ImageProvider, NormalizedImageRequest, NormalizedImageResult } from "@/lib/providers/types";

type Payload = Record<string, unknown>;

export function buildOpenAIImagePayload(request: NormalizedImageRequest): Payload {
  const safeCount = 1;
  const spec = assertSupportedOpenAIModel(request.model);
  const safeSize = spec.allowedSizes.includes(request.size ?? "") ? request.size : spec.allowedSizes[0];

  if (spec.family === "gpt-image") {
    return {
      model: spec.id,
      prompt: request.prompt,
      size: safeSize,
      quality: spec.allowedQualities.includes(request.quality ?? "low") ? request.quality : "high",
      n: safeCount
    };
  }

  if (spec.family === "dall-e-3") {
    return {
      model: spec.id,
      prompt: request.prompt,
      size: safeSize,
      quality: request.quality === "hd" ? "hd" : "standard",
      response_format: "b64_json",
      n: safeCount
    };
  }

  return {
    model: spec.id,
    prompt: request.prompt,
    size: safeSize,
    response_format: "b64_json",
    n: safeCount
  };
}

export async function decodeOpenAIImage(response: OpenAI.Images.ImagesResponse): Promise<Buffer> {
  const first = response.data?.[0];
  if (!first) throw new Error("OpenAI response did not include image data");
  if ((response.data?.length ?? 0) > 1) {
    throw new Error("OpenAI returned multiple images for one task; MVP currently supports one image per task.");
  }

  if (first.b64_json) return Buffer.from(first.b64_json, "base64");

  if (first.url) {
    const imageRes = await fetch(first.url);
    if (!imageRes.ok) throw new Error(`OpenAI image URL fetch failed with status ${imageRes.status}`);
    const arr = await imageRes.arrayBuffer();
    return Buffer.from(arr);
  }

  throw new Error("OpenAI response did not include b64_json or url image data");
}

export class OpenAIProvider implements ImageProvider {
  private client: OpenAI;

  constructor() {
    const { apiKey } = getOpenAIConfig();
    this.client = new OpenAI({ apiKey });
  }

  async generateImage(request: NormalizedImageRequest): Promise<NormalizedImageResult> {
    const payload = buildOpenAIImagePayload(request);
    const response = await this.client.images.generate(payload as never);
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
