import test from "node:test";
import assert from "node:assert/strict";
import { buildOpenAIImagePayload, decodeOpenAIImage } from "../lib/providers/openai.ts";

test("GPT image payload does not include response_format", () => {
  const payload = buildOpenAIImagePayload({ provider: "openai", model: "gpt-image-2", prompt: "cat", count: 3, size: "1024x1024", quality: "high" });
  assert.equal("response_format" in payload, false);
  assert.equal(payload.n, 1);
});

test("non-GPT payload requests b64_json", () => {
  const payload = buildOpenAIImagePayload({ provider: "openai", model: "dall-e-2", prompt: "cat", count: 2, size: "1024x1024", quality: "high" });
  assert.equal(payload.response_format, "b64_json");
  assert.equal(payload.n, 2);
});

test("GPT response parses b64_json correctly", async () => {
  const bytes = await decodeOpenAIImage({ data: [{ b64_json: Buffer.from("hello").toString("base64") }] } as never);
  assert.equal(bytes.toString("utf8"), "hello");
});

test("non-GPT b64_json response decodes correctly", async () => {
  const bytes = await decodeOpenAIImage({ data: [{ b64_json: Buffer.from("abc").toString("base64") }] } as never);
  assert.equal(bytes.toString("utf8"), "abc");
});

test("missing b64_json with url response returns clear error when fetch fails", async () => {
  const originalFetch = global.fetch;
  global.fetch = async () => new Response(null, { status: 500 }) as never;
  await assert.rejects(() => decodeOpenAIImage({ data: [{ url: "https://example.com/test.png" }] } as never), /OpenAI image URL fetch failed/);
  global.fetch = originalFetch;
});
