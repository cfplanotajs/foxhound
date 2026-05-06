import presets from "@/config/presets.json";
import { Preset } from "@/lib/types";

export function getPresets(): Preset[] {
  return presets as Preset[];
}

export function getPresetById(id: string): Preset | undefined {
  return getPresets().find((preset) => preset.id === id);
}
