export interface StoredTaskParams {
  size?: string;
  quality?: "low" | "medium" | "high" | "auto" | "standard" | "hd";
  count?: number;
}

interface ParsedPayload {
  params?: StoredTaskParams;
  taskParams?: StoredTaskParams;
  providerPayload?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  size?: string;
  quality?: StoredTaskParams["quality"];
  count?: number;
  model?: string;
  prompt?: string;
}

export interface CanonicalTaskPayload {
  taskParams: StoredTaskParams;
  providerPayload: Record<string, unknown>;
  metadata: Record<string, unknown>;
}

export function parseStoredPayload(requestPayloadJson?: string | null): ParsedPayload {
  if (!requestPayloadJson) return {};
  try {
    return JSON.parse(requestPayloadJson) as ParsedPayload;
  } catch {
    return {};
  }
}

export function parseTaskPayload(requestPayloadJson?: string | null): CanonicalTaskPayload {
  const parsed = parseStoredPayload(requestPayloadJson);
  const taskParams = extractTaskParams(requestPayloadJson);
  const providerPayload =
    parsed.providerPayload ??
    (parsed.model || parsed.prompt || parsed.size || parsed.quality
      ? { model: parsed.model, prompt: parsed.prompt, size: parsed.size, quality: parsed.quality }
      : {});
  const metadata = (parsed.metadata ?? {}) as Record<string, unknown>;
  return { taskParams, providerPayload, metadata };
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
  provider: "openai" | "mock";
  model: string;
  prompt: string;
  params?: StoredTaskParams;
  presetName?: string;
  mode?: "generate" | "edit";
  sourceTaskId?: string;
  sourceJobId?: string;
  sourceImagePath?: string;
  editInstruction?: string;
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
    count: safeCount,
    ...(input.presetName ? { presetName: input.presetName } : {}),
    ...(input.mode ? { mode: input.mode } : {}),
    ...(input.sourceTaskId ? { sourceTaskId: input.sourceTaskId } : {}),
    ...(input.sourceJobId ? { sourceJobId: input.sourceJobId } : {}),
    ...(input.sourceImagePath ? { sourceImagePath: input.sourceImagePath } : {}),
    ...(input.editInstruction ? { editInstruction: input.editInstruction } : {})
  } as const;
}

export function serializeTaskPayload(taskParams: StoredTaskParams, providerPayload: Record<string, unknown>) {
  return JSON.stringify({ taskParams: { ...taskParams, count: 1 }, providerPayload, metadata: {} });
}

export function serializeTaskPayloadWithMetadata(taskParams: StoredTaskParams, providerPayload: Record<string, unknown>, metadata: Record<string, unknown>) {
  return JSON.stringify({ taskParams: { ...taskParams, count: 1 }, providerPayload, metadata });
}

export function mergeProviderPayload(requestPayloadJson: string | null | undefined, providerPayload: Record<string, unknown>) {
  const parsed = parseTaskPayload(requestPayloadJson);
  return JSON.stringify({ taskParams: { ...parsed.taskParams, count: 1 }, providerPayload, metadata: parsed.metadata });
}

export function cloneTaskPayloadForRerun(requestPayloadJson: string | null | undefined, fallbackProviderPayload: Record<string, unknown>) {
  const parsed = parseTaskPayload(requestPayloadJson);
  const sourceProviderPayload = Object.keys(parsed.providerPayload).length > 0 ? parsed.providerPayload : fallbackProviderPayload;
  return JSON.stringify({ taskParams: { ...parsed.taskParams, count: 1 }, providerPayload: sourceProviderPayload, metadata: parsed.metadata });
}
