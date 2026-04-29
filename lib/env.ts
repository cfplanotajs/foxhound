import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  OPENAI_API_KEY: z.string().min(1),
  OPENAI_IMAGE_MODEL: z.string().min(1).default("gpt-image-2"),
  INTERNAL_API_TOKEN: z.string().min(1)
});

let cachedEnv: z.infer<typeof envSchema> | null = null;

export function getEnv() {
  if (!cachedEnv) {
    cachedEnv = envSchema.parse(process.env);
  }
  return cachedEnv;
}

export function requireApiToken(request: Request): void {
  const token = request.headers.get("x-internal-api-token");
  if (!token || token !== getEnv().INTERNAL_API_TOKEN) {
    throw new Error("Unauthorized");
  }
}
