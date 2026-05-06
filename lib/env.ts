import { z } from "zod";
import { ProviderName } from "@/lib/providers/types";

const MISSING_OPENAI_KEY_MESSAGE = "OpenAI API key is missing. Add OPENAI_API_KEY to the server .env file, or use Demo Mode.";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_IMAGE_MODEL: z.string().min(1).default("gpt-image-2")
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

export function assertProviderConfigured(provider: ProviderName): void {
  if (provider === "openai") getOpenAIConfig();
}

export { MISSING_OPENAI_KEY_MESSAGE };

export function __resetEnvCacheForTests() {
  cachedEnv = null;
}
