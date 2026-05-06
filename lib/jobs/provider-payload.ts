export interface StoredTaskParams {
  size?: string;
  quality?: "low" | "medium" | "high" | "auto";
  count?: number;
}

export function extractTaskParams(requestPayloadJson?: string | null): StoredTaskParams {
  if (!requestPayloadJson) return {};
  try {
    const parsed = JSON.parse(requestPayloadJson) as { params?: StoredTaskParams };
    return parsed.params ?? {};
  } catch {
    return {};
  }
}

export function buildProviderRequest(input: {
  provider: "openai";
  model: string;
  prompt: string;
  params?: StoredTaskParams;
}) {
  const params = input.params ?? {};
  const requestedCount = params.count ?? 1;
  const safeCount = input.provider === "openai" && input.model.startsWith("gpt-image") ? 1 : requestedCount;
  return {
    provider: input.provider,
    model: input.model,
    prompt: input.prompt,
    size: params.size ?? "1024x1024",
    quality: params.quality ?? "high",
    count: safeCount
  } as const;
}
