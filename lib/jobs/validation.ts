import { z } from "zod";

const MAX_PROMPT_LINES = 50;
const MAX_TEXT_LEN = 2000;

const emptyToUndefined = (value: unknown) => {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
};

export const createJobSchema = z.object({
  presetId: z.string().trim().min(1, "Preset is required."),
  provider: z.preprocess(emptyToUndefined, z.enum(["openai", "mock"]).optional()),
  model: z.preprocess(emptyToUndefined, z.string().min(1, "Model is required.").max(120).optional()),
  constraints: z.preprocess(emptyToUndefined, z.string().max(MAX_TEXT_LEN).optional()),
  singlePrompt: z.preprocess(emptyToUndefined, z.string().max(MAX_TEXT_LEN).optional()),
  bulkPrompts: z.preprocess(emptyToUndefined, z.string().max(MAX_TEXT_LEN * MAX_PROMPT_LINES).optional()),
  idempotencyKey: z.preprocess(emptyToUndefined, z.string().min(8).max(128).optional())
  ,projectId: z.preprocess(emptyToUndefined, z.string().optional())
  ,folderId: z.preprocess(emptyToUndefined, z.string().optional())
  ,aspectRatio: z.preprocess(emptyToUndefined, z.string().optional())
  ,variationCount: z.number().int().refine((n) => [1, 2, 4].includes(n), "Variation count must be 1, 2, or 4.").optional()
  ,quality: z.preprocess(emptyToUndefined, z.enum(["low", "medium", "high", "auto", "standard", "hd"]).optional())
});

export type CreateJobInput = z.infer<typeof createJobSchema>;
