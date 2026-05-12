import OpenAI from "openai";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { getOpenAIConfig } from "@/lib/env";
import { assertSupportedOpenAIModel, isSizeSupportedForOpenAIModel } from "@/lib/providers/openai-models";
import { ImageProvider, NormalizedImageRequest, NormalizedImageResult } from "@/lib/providers/types";

type Payload = Record<string, unknown>;

export function extractResponsesImageResult(response: unknown): string {
  const output = Array.isArray((response as { output?: unknown[] } | null)?.output) ? (response as { output: unknown[] }).output : [];
  for (const item of output) {
    const candidate = item as { type?: string; result?: unknown };
    if (candidate?.type === "image_generation_call" && typeof candidate.result === "string" && candidate.result.length > 0) {
      return candidate.result;
    }
  }
  throw new Error("OpenAI Responses edit did not return image data");
}

export function buildOpenAIImagePayload(request: NormalizedImageRequest): Payload {
  const safeCount = 1;
  const spec = assertSupportedOpenAIModel(request.model);
  const requestedSize = request.size ?? spec.allowedSizes[0];
  if (!isSizeSupportedForOpenAIModel(spec.id, requestedSize)) {
    throw new Error(`Size ${requestedSize} is not supported by model ${spec.id}`);
  }
  const safeSize = requestedSize;

  if (spec.family === "gpt-image") {
    const requestedQuality = request.quality ?? null;
    const safeQuality = requestedQuality && spec.allowedQualities.includes(requestedQuality as any) ? requestedQuality : (spec.allowedQualities.includes("auto") ? "auto" : spec.allowedQualities[0]);
    return {
      model: spec.id,
      prompt: request.prompt,
      size: safeSize,
      quality: safeQuality,
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
    quality: "standard",
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
    if (request.mode === "edit") return this.editImage(request);
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

  private async editImage(request: NormalizedImageRequest): Promise<NormalizedImageResult> {
    const adapter = this.selectEditAdapter();
    if (adapter === "responses") return this.editImageWithResponses(request);
    return this.editImageWithImagesEdit(request);
  }

  private selectEditAdapter(): "responses" | "images_edit" {
    const preferred = (process.env.OPENAI_EDIT_ADAPTER ?? "responses").trim().toLowerCase();
    const supportsResponses = typeof (this.client as any).responses?.create === "function";
    if (preferred === "responses" && supportsResponses) return "responses";
    if (preferred === "images_edit") return "images_edit";
    return "images_edit";
  }

  private async loadSourceImage(request: NormalizedImageRequest): Promise<{ bytes: Buffer; ext: string; mimeType: string }> {
    const spec = assertSupportedOpenAIModel(request.model);
    if (spec.family !== "gpt-image") throw new Error(`Model ${request.model} does not support image editing in this adapter.`);
    if (!request.sourceImagePath) throw new Error("Source image file not found");
    let bytes: Buffer;
    try {
      bytes = await readFile(request.sourceImagePath);
    } catch {
      throw new Error("Source image file not found");
    }
    const ext = path.extname(request.sourceImagePath).toLowerCase();
    const mimeType = ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" : ext === ".webp" ? "image/webp" : "image/png";
    return { bytes, ext, mimeType };
  }

  private async editImageWithImagesEdit(request: NormalizedImageRequest): Promise<NormalizedImageResult> {
    const spec = assertSupportedOpenAIModel(request.model);
    const { bytes, ext, mimeType } = await this.loadSourceImage(request);
    const file = new File([new Uint8Array(bytes)], `source${ext || ".png"}`, { type: mimeType });
    const payload = { model: spec.id, image: file, prompt: request.prompt, size: request.size, quality: request.quality };
    const response = await this.client.images.edit(payload as never);
    const edited = await decodeOpenAIImage(response as OpenAI.Images.ImagesResponse);
    return {
      images: [{ bytes: edited, mimeType: "image/png" }],
      providerMetadata: {
        mode: "edit",
        adapter: "images_edit",
        model: spec.id,
        size: request.size ?? null,
        quality: request.quality ?? null,
        sourceTaskId: request.sourceTaskId ?? null,
        sourceJobId: request.sourceJobId ?? null,
        editInstruction: request.editInstruction?.slice(0, 200) ?? null,
        upstreamPayload: { model: spec.id, size: request.size ?? null, quality: request.quality ?? null }
      }
    };
  }

  private async editImageWithResponses(request: NormalizedImageRequest): Promise<NormalizedImageResult> {
    const spec = assertSupportedOpenAIModel(request.model);
    const { bytes, mimeType } = await this.loadSourceImage(request);
    const b64 = bytes.toString("base64");
    const imageUrl = `data:${mimeType};base64,${b64}`;
    const response = await (this.client as any).responses.create({
      model: spec.id,
      input: [
        {
          role: "user",
          content: [
            { type: "input_text", text: request.prompt },
            { type: "input_image", image_url: imageUrl }
          ]
        }
      ],
      tools: [{ type: "image_generation", size: request.size, quality: request.quality }]
    });
    const imageB64 = extractResponsesImageResult(response);
    return {
      images: [{ bytes: Buffer.from(imageB64, "base64"), mimeType: "image/png" }],
      providerMetadata: {
        mode: "edit",
        adapter: "responses",
        model: spec.id,
        size: request.size ?? null,
        quality: request.quality ?? null,
        sourceTaskId: request.sourceTaskId ?? null,
        sourceJobId: request.sourceJobId ?? null,
        editInstruction: request.editInstruction?.slice(0, 200) ?? null,
        upstreamPayload: { model: spec.id, size: request.size ?? null, quality: request.quality ?? null }
      }
    };
  }
}
