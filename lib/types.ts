export type ProviderName = "openai";

export interface Preset {
  id: string;
  name: string;
  version: string;
  description: string;
  stylePrompt: string;
  defaultProvider: ProviderName;
  defaultModel: string;
  defaultParams: Record<string, unknown>;
}
