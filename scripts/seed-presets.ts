import { seedPresetsFromConfig } from "@/lib/presets";

seedPresetsFromConfig()
  .then(() => {
    console.log("[presets] seed complete");
    process.exit(0);
  })
  .catch((error) => {
    console.error("[presets] seed failed", error);
    process.exit(1);
  });
