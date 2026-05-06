import test from "node:test";
import assert from "node:assert/strict";
import { buildOpenAIImagePayload } from "../lib/providers/openai.ts";

test("openai payload forwards count as n", () => {
  const payload = buildOpenAIImagePayload({ provider: "openai", model: "dall-e-2", prompt: "cat", count: 3, size: "1024x1024", quality: "high" });
  assert.equal(payload.n, 3);
});

test("gpt-image models constrain n to 1", () => {
  const payload = buildOpenAIImagePayload({ provider: "openai", model: "gpt-image-2", prompt: "cat", count: 3, size: "1024x1024", quality: "high" });
  assert.equal(payload.n, 1);
});
