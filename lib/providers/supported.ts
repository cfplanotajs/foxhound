export const SUPPORTED_PROVIDERS = ["openai", "mock"] as const;

export type SupportedProvider = (typeof SUPPORTED_PROVIDERS)[number];

export function parseSupportedProvider(value?: string | null): SupportedProvider | null {
  const normalized = value?.trim();
  if (!normalized) return null;
  return (SUPPORTED_PROVIDERS as readonly string[]).includes(normalized) ? (normalized as SupportedProvider) : null;
}

export function assertSupportedProvider(value?: string | null): SupportedProvider {
  const provider = parseSupportedProvider(value);
  if (!provider) throw new Error(`Unsupported provider: ${String(value)}`);
  return provider;
}
