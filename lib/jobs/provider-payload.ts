export interface StoredTaskParams {
  size?: string;
  quality?: "low" | "medium" | "high" | "auto";
  count?: number;
}

interface ParsedPayload {
  params?: StoredTaskParams;
  taskParams?: StoredTaskParams;
  providerPayload?: Record<string, unknown>;
  size?: string;
  quality?: "low" | "medium" | "high" | "auto";
  count?: number;
}

export function parseStoredPayload(requestPayloadJson?: string | null): ParsedPayload {
  if (!requestPayloadJson) return {};
  try {
    return JSON.parse(requestPayloadJson) as ParsedPayload;
  } catch {
    return {};
  }
}

export function extractTaskParams(requestPayloadJson?: string | null): StoredTaskParams {
  const parsed = parseStoredPayload(requestPayloadJson);
  if (parsed.taskParams) return parsed.taskParams;
  if (parsed.params) return parsed.params;

  // legacy flattened payload support
  if (parsed.size || parsed.quality || parsed.count) {
    return {
      size: parsed.size,
      quality: parsed.quality,
      count: parsed.count
    };
  }

  return {};
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

export function serializeTaskPayload(taskParams: StoredTaskParams, providerPayload: Record<string, unknown>) {
  return JSON.stringify({ taskParams, providerPayload });
}
