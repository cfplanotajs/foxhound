export interface TaskForClient {
  id: string;
  jobId: string;
  status: string;
  subjectPrompt: string;
  finalPrompt: string;
  presetName: string;
  presetVersion: string;
  provider: string;
  model: string;
  errorMessage: string | null;
  requestPayloadJson?: string | null;
  responseMetadataJson: string | null;
  createdAt: Date;
  completedAt: Date | null;
  outputPath: string | null;
  reviewStatus?: string | null;
}

export function toClientTaskDto(task: TaskForClient) {
  let providerError: unknown = null;
  let taskMeta: any = null;
  if (task.responseMetadataJson) {
    try {
      providerError = JSON.parse(task.responseMetadataJson)?.providerError ?? null;
    } catch {
      providerError = null;
    }
  }
  if (task.requestPayloadJson) {
    try {
      const parsed = JSON.parse(task.requestPayloadJson);
      taskMeta = { ...(parsed?.providerPayload ?? {}), ...(parsed?.metadata ?? {}) };
    } catch {
      taskMeta = null;
    }
  }

  return {
    id: task.id,
    jobId: task.jobId,
    status: task.status,
    subjectPrompt: task.subjectPrompt,
    finalPrompt: task.finalPrompt,
    presetName: task.presetName,
    presetVersion: task.presetVersion,
    provider: task.provider,
    model: task.model,
    errorMessage: task.errorMessage,
    reviewStatus: task.reviewStatus ?? "unreviewed",
    variationIndex: taskMeta?.variationIndex ?? null,
    variationCount: taskMeta?.variationCount ?? null,
    aspectRatio: taskMeta?.aspectRatio ?? null,
    size: taskMeta?.size ?? null,
    providerError,
    createdAt: task.createdAt,
    completedAt: task.completedAt,
    imageUrl: task.outputPath ? `/api/images/${task.jobId}/${task.id}` : null
  };
}
