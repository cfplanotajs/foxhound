export type ProviderName = "openai";

export interface NormalizedImageRequest {
  provider: ProviderName;
  model: string;
  prompt: string;
  size?: string;
  quality?: "low" | "medium" | "high" | "auto" | "standard" | "hd";
  count?: number;
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
