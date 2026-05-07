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
  responseMetadataJson: string | null;
  createdAt: Date;
  completedAt: Date | null;
  outputPath: string | null;
}

export function toClientTaskDto(task: TaskForClient) {
  let providerError: unknown = null;
  if (task.responseMetadataJson) {
    try {
      providerError = JSON.parse(task.responseMetadataJson)?.providerError ?? null;
    } catch {
      providerError = null;
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
    providerError,
    createdAt: task.createdAt,
    completedAt: task.completedAt,
    imageUrl: task.outputPath ? `/api/images/${task.jobId}/${task.id}` : null
  };
}
