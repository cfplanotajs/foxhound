export type StudioProviderError = { title?: string; designerMessage?: string; technicalMessage?: string; suggestedAction?: string };

export type StudioTask = {
  id: string;
  status: "queued" | "processing" | "completed" | "failed";
  subjectPrompt: string;
  presetName: string;
  presetVersion: string;
  provider: string;
  model: string;
  imageUrl: string | null;
  mode?: "generate" | "edit";
  editInstruction?: string | null;
  sourceTaskId?: string | null;
  sourceJobId?: string | null;
  variationIndex?: number | null;
  variationCount?: number | null;
  aspectRatio?: string | null;
  size?: string | null;
  reviewStatus?: "unreviewed" | "favorite" | "approved" | "rejected";
  providerError?: StudioProviderError | null;
  errorMessage: string | null;
  lastError?: string | null;
};
