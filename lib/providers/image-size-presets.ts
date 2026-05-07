import { getOpenAIModelSpec } from "@/lib/providers/openai-models";

export const IMAGE_RATIO_PRESETS = [
  { id: "1:1", label: "Square 1:1", size: "1024x1024" },
  { id: "2:3", label: "Portrait 2:3", size: "1024x1536" },
  { id: "4:6", label: "Portrait 4:6", size: "1024x1536" },
  { id: "4:3", label: "Landscape 4:3", size: "1536x1152" },
  { id: "3:2", label: "Classic 3:2", size: "1536x1024" },
  { id: "9:16", label: "Vertical 9:16", size: "1152x2048" },
  { id: "16:9", label: "Widescreen 16:9", size: "1536x864" }
] as const;

export function resolveSizeForModel(model: string, ratioId: string): string | null {
  const preset = IMAGE_RATIO_PRESETS.find((r) => r.id === ratioId);
  if (!preset) return null;
  if (model.startsWith("mock")) return preset.size;
  const spec = getOpenAIModelSpec(model);
  if (!spec) return null;
  return spec.allowedSizes.includes(preset.size) ? preset.size : null;
}
