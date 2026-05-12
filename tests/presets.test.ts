import test from "node:test";
import assert from "node:assert/strict";
import presets from "../config/presets.json";

test("presets include required fields and defaultParams", () => {
  for (const preset of presets) {
    assert.ok(preset.id);
    assert.ok(preset.name);
    assert.ok(preset.version);
    assert.ok(preset.description);
    assert.ok(preset.stylePrompt);
    assert.equal(preset.defaultProvider, "openai");
    assert.ok(preset.defaultModel);
    assert.ok(preset.defaultParams);
    assert.equal(typeof preset.samplePrompt === "string" || preset.samplePrompt === undefined, true);
    assert.ok((preset.defaultParams as Record<string, unknown>).size);
    assert.ok((preset.defaultParams as Record<string, unknown>).quality);
  }
});
