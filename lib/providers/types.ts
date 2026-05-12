export type ProviderName = "openai" | "mock";

export interface NormalizedImageRequest {
  mode?: "generate" | "edit";
  provider: ProviderName;
  model: string;
  prompt: string;
  size?: string;
  quality?: "low" | "medium" | "high" | "auto" | "standard" | "hd";
  count?: number;
  presetName?: string;
  sourceTaskId?: string;
  sourceJobId?: string;
  sourceImagePath?: string;
  editInstruction?: string;
}

export interface NormalizedImageResult {
  images: Array<{
    bytes: Buffer;
    mimeType: string;
  }>;
  providerMetadata: Record<string, unknown>;
}

export interface ImageProvider {
  generateImage(request: NormalizedImageRequest): Promise<NormalizedImageResult>;
}
