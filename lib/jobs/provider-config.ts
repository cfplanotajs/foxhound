import { assertProviderConfigured } from "@/lib/env";

export function ensureJobProviderConfigured(provider: "openai" | "mock"): void {
  assertProviderConfigured(provider);
}
