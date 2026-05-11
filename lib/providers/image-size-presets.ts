import { getOpenAIModelSpec } from "@/lib/providers/openai-models";

export const IMAGE_RATIO_PRESETS = [
  { id: "1:1", label: "Square 1:1" },
  { id: "2:3", label: "Portrait 2:3" },
  { id: "4:6", label: "Portrait 4:6" },
  { id: "4:3", label: "Landscape 4:3" },
  { id: "3:2", label: "Classic 3:2" },
  { id: "9:16", label: "Vertical 9:16" },
  { id: "16:9", label: "Widescreen 16:9" }
] as const;

const SIZE_BY_RATIO_GPT: Record<string, string> = {
  "1:1": "1024x1024",
  "2:3": "1024x1536",
  "4:6": "1024x1536",
  "4:3": "1536x1152",
  "3:2": "1536x1024",
  "9:16": "1152x2048",
  "16:9": "1536x864"
};

const SIZE_BY_RATIO_DALLE3: Record<string, string> = { "1:1": "1024x1024", "9:16": "1024x1792", "16:9": "1792x1024" };
const SIZE_BY_RATIO_DALLE2: Record<string, string> = { "1:1": "1024x1024" };

export function resolveSizeForModel(model: string, ratioId: string): string | null {
  const preset = IMAGE_RATIO_PRESETS.find((r) => r.id === ratioId);
  if (!preset) return null;
  if (model.startsWith("mock")) return SIZE_BY_RATIO_GPT[ratioId] ?? null;
  const spec = getOpenAIModelSpec(model);
  if (!spec) return null;

  const requestedSize = spec.family === "dall-e-3"
    ? SIZE_BY_RATIO_DALLE3[ratioId]
    : spec.family === "dall-e-2"
      ? SIZE_BY_RATIO_DALLE2[ratioId]
      : SIZE_BY_RATIO_GPT[ratioId];
  if (!requestedSize) return null;
  return spec.allowedSizes.includes(requestedSize) ? requestedSize : null;
}
