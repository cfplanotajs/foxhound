import { z } from "zod";
import { ProviderName } from "@/lib/providers/types";

const MISSING_OPENAI_KEY_MESSAGE = "OpenAI API key is missing. Add OPENAI_API_KEY to the server .env file, or use Demo Mode.";

function normalizeOptionalTrimmedString(value?: string): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_IMAGE_MODEL: z.string().optional().transform(normalizeOptionalTrimmedString),
  OPENAI_RESPONSES_MODEL: z.string().optional().transform(normalizeOptionalTrimmedString)
});

type AppEnv = z.infer<typeof envSchema>;

let cachedEnv: AppEnv | null = null;

export function getEnv(): AppEnv {
  if (!cachedEnv) cachedEnv = envSchema.parse(process.env);
  return cachedEnv;
}

export function getOpenAIConfig(): { apiKey: string } {
  const apiKey = getEnv().OPENAI_API_KEY?.trim();
  if (!apiKey) throw new Error(MISSING_OPENAI_KEY_MESSAGE);
  return { apiKey };
}

export function getOpenAIResponsesModel(): string {
  return getEnv().OPENAI_RESPONSES_MODEL ?? "gpt-5";
}

export function assertProviderConfigured(provider: ProviderName): void {
  if (provider === "openai") getOpenAIConfig();
}

export { MISSING_OPENAI_KEY_MESSAGE };

export function __resetEnvCacheForTests() {
  cachedEnv = null;
}
