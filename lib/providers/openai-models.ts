export type OpenAIModelFamily = "gpt-image" | "dall-e-3" | "dall-e-2";

export interface OpenAIModelSpec {
  id: string;
  family: OpenAIModelFamily;
  allowedQualities: Array<"low" | "medium" | "high" | "auto" | "standard" | "hd">;
  allowedSizes: string[];
  supportsResponseFormat: boolean;
  allowsMultiImage: boolean;
  clampCountToOne: boolean;
}

const MODEL_SPECS: Record<string, OpenAIModelSpec> = {
  "gpt-image-2": {
    id: "gpt-image-2",
    family: "gpt-image",
    allowedQualities: ["low", "medium", "high", "auto"],
    allowedSizes: ["1024x1024", "1536x1024", "1024x1536", "1536x1152", "1152x2048", "1536x864"],
    supportsResponseFormat: false,
    allowsMultiImage: false,
    clampCountToOne: true
  },
  "gpt-image-1": {
    id: "gpt-image-1",
    family: "gpt-image",
    allowedQualities: ["low", "medium", "high", "auto"],
    allowedSizes: ["1024x1024", "1536x1024", "1024x1536", "1536x1152", "1152x2048", "1536x864"],
    supportsResponseFormat: false,
    allowsMultiImage: false,
    clampCountToOne: true
  },
  "dall-e-3": {
    id: "dall-e-3",
    family: "dall-e-3",
    allowedQualities: ["standard", "hd"],
    allowedSizes: ["1024x1024", "1792x1024", "1024x1792"],
    supportsResponseFormat: true,
    allowsMultiImage: false,
    clampCountToOne: true
  },
  "dall-e-2": {
    id: "dall-e-2",
    family: "dall-e-2",
    allowedQualities: ["standard"],
    allowedSizes: ["256x256", "512x512", "1024x1024"],
    supportsResponseFormat: true,
    allowsMultiImage: false,
    clampCountToOne: true
  }
};

export function getOpenAIModelSpec(model: string): OpenAIModelSpec | null {
  return MODEL_SPECS[model] ?? null;
}

export function assertSupportedOpenAIModel(model: string): OpenAIModelSpec {
  const spec = getOpenAIModelSpec(model);
  if (!spec) throw new Error(`Unsupported OpenAI image model: ${model}`);
  return spec;
}

export function isSupportedOpenAIModel(model: string): boolean {
  return !!getOpenAIModelSpec(model);
}

export function listSupportedOpenAIModels(): string[] {
  return Object.keys(MODEL_SPECS);
}
