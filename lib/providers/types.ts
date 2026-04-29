export interface ProviderGenerateRequest {
  prompt: string;
  model: string;
  params?: Record<string, unknown>;
}

export interface ProviderGenerateResponse {
  imageBytes: Buffer;
  metadata: Record<string, unknown>;
}

export interface ImageProvider {
  generateImage(request: ProviderGenerateRequest): Promise<ProviderGenerateResponse>;
}
