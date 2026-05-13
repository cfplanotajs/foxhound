import { CreateJobInput } from "@/lib/jobs/validation";

export function canEditTask(input: { status: string; imageUrl: string | null }) {
  return input.status === "completed" && !!input.imageUrl;
}

export function appendEditChip(current: string, chip: string) {
  const base = current.trim();
  if (!base) return chip;
  return `${base}. ${chip}`;
}

export function buildEditRequestPayload(input: {
  presetId: string;
  provider: "openai" | "mock";
  model: string;
  editInstruction: string;
  constraints?: string;
  aspectRatio?: string;
  variationCount: 1 | 2 | 4;
  quality?: CreateJobInput["quality"];
  projectId?: string;
  folderId?: string;
}) {
  return {
    presetId: input.presetId,
    provider: input.provider,
    model: input.model,
    editInstruction: input.editInstruction,
    constraints: input.constraints || undefined,
    aspectRatio: input.aspectRatio || undefined,
    variationCount: input.variationCount,
    quality: input.quality,
    projectId: input.projectId || undefined,
    folderId: input.folderId || undefined
  };
}
