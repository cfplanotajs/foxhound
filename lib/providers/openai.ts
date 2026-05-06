import OpenAI from "openai";
import { getEnv } from "@/lib/env";
import { ImageProvider, NormalizedImageRequest, NormalizedImageResult } from "@/lib/providers/types";

type Payload = Record<string, unknown>;

function isGptImage(model: string): boolean {
  return model.startsWith("gpt-image");
}

function isDalle3(model: string): boolean {
  return model === "dall-e-3";
}

function isDalle2(model: string): boolean {
  return model === "dall-e-2";
}

export function buildOpenAIImagePayload(request: NormalizedImageRequest): Payload {
  const safeCount = 1;
  const model = request.model;

  if (isGptImage(model)) {
    return {
      model,
      prompt: request.prompt,
      size: request.size ?? "1024x1024",
      quality: (["low", "medium", "high", "auto"].includes(request.quality ?? "") ? request.quality : "high"),
      n: safeCount
    };
  }

  if (isDalle3(model)) {
    const safeQuality = request.quality === "hd" ? "hd" : "standard";
    const allowedSizes = new Set(["1024x1024", "1792x1024", "1024x1792"]);
    const safeSize = allowedSizes.has(request.size ?? "") ? request.size : "1024x1024";
    return {
      model,
      prompt: request.prompt,
      size: safeSize,
      quality: safeQuality,
      response_format: "b64_json",
      n: safeCount
    };
  }

  if (isDalle2(model)) {
    const allowedSizes = new Set(["256x256", "512x512", "1024x1024"]);
    const safeSize = allowedSizes.has(request.size ?? "") ? request.size : "1024x1024";
    return {
      model,
      prompt: request.prompt,
      size: safeSize,
      response_format: "b64_json",
      n: safeCount
    };
  }

  throw new Error(`Unsupported OpenAI image model: ${model}`);
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
    const apiKey = getEnv().OPENAI_API_KEY;
    if (!apiKey) throw new Error("OpenAI API key is missing. Add OPENAI_API_KEY to the server .env file, or use Demo Mode.");
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
