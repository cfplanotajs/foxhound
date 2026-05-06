export interface StoredTaskParams {
  size?: string;
  quality?: "low" | "medium" | "high" | "auto" | "standard" | "hd";
  count?: number;
}

interface ParsedPayload {
  params?: StoredTaskParams;
  taskParams?: StoredTaskParams;
  providerPayload?: Record<string, unknown>;
  size?: string;
  quality?: StoredTaskParams["quality"];
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
  if (parsed.taskParams) return { ...parsed.taskParams, count: 1 };
  if (parsed.params) return { ...parsed.params, count: 1 };
  if (parsed.size || parsed.quality || parsed.count) {
    return {
      size: parsed.size,
      quality: parsed.quality,
      count: 1
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
  // MVP invariant: one task = one generated image.
  // TODO: support true multi-output assets with a dedicated Asset table.
  const safeCount = 1;
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
  return JSON.stringify({ taskParams: { ...taskParams, count: 1 }, providerPayload });
}
