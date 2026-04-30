import { z } from "zod";

const MAX_PROMPT_LINES = 50;
const MAX_TEXT_LEN = 2000;

const emptyToUndefined = (value: unknown) => {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
};

export const createJobSchema = z.object({
  presetId: z.string().trim().min(1, "Preset is required"),
  provider: z.preprocess(emptyToUndefined, z.literal("openai").optional()),
  model: z.preprocess(emptyToUndefined, z.string({ required_error: "Model is required" }).min(1, "Model is required").max(120)),
  constraints: z.preprocess(emptyToUndefined, z.string().max(MAX_TEXT_LEN).optional()),
  singlePrompt: z.preprocess(emptyToUndefined, z.string().max(MAX_TEXT_LEN).optional()),
  bulkPrompts: z.preprocess(emptyToUndefined, z.string().max(MAX_TEXT_LEN * MAX_PROMPT_LINES).optional()),
  idempotencyKey: z.preprocess(emptyToUndefined, z.string().min(8).max(128).optional())
});

export type CreateJobInput = z.infer<typeof createJobSchema>;
