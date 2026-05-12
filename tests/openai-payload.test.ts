import test from "node:test";
import assert from "node:assert/strict";
import { buildOpenAIImagePayload, decodeOpenAIImage } from "../lib/providers/openai.ts";

test("GPT image payload uses GPT-compatible quality and no response_format", () => {
  const payload = buildOpenAIImagePayload({ provider: "openai", model: "gpt-image-2", prompt: "cat", count: 4, size: "1024x1024", quality: "high" });
  assert.equal("response_format" in payload, false);
  assert.equal(payload.n, 1);
  assert.equal(payload.quality, "high");
});

test("GPT payload missing quality falls back safely and never emits undefined", () => {
  const payload = buildOpenAIImagePayload({ provider: "openai", model: "gpt-image-2", prompt: "cat", count: 1, size: "1024x1024" });
  assert.equal(payload.quality, "auto");
  assert.equal(payload.quality === undefined, false);
});

test("dall-e-3 quality normalizes to standard/hd only", () => {
  const standard = buildOpenAIImagePayload({ provider: "openai", model: "dall-e-3", prompt: "cat", count: 3, size: "1024x1024", quality: "high" });
  assert.equal(standard.quality, "standard");
  const hd = buildOpenAIImagePayload({ provider: "openai", model: "dall-e-3", prompt: "cat", count: 3, size: "1024x1024", quality: "hd" as never });
  assert.equal(hd.quality, "hd");
  assert.equal(hd.n, 1);
});

test("dall-e-2 payload normalizes to standard quality", () => {
  const payload = buildOpenAIImagePayload({ provider: "openai", model: "dall-e-2", prompt: "cat", count: 2, size: "1024x1024", quality: "high" });
  assert.equal(payload.quality, "standard");
  assert.equal(payload.response_format, "b64_json");
  assert.equal(payload.n, 1);
});

test("unsupported model rejects clearly", () => {
  assert.throws(() => buildOpenAIImagePayload({ provider: "openai", model: "weird-model", prompt: "cat", count: 1 }), /Unsupported OpenAI image model/);
});

test("unsupported model-size combination rejects clearly", () => {
  assert.throws(() => buildOpenAIImagePayload({ provider: "openai", model: "dall-e-3", prompt: "cat", count: 1, size: "1536x1024" }), /is not supported by model/);
});

test("GPT response parses b64_json correctly", async () => {
  const bytes = await decodeOpenAIImage({ data: [{ b64_json: Buffer.from("hello").toString("base64") }] } as never);
  assert.equal(bytes.toString("utf8"), "hello");
});

test("non-GPT b64_json response decodes correctly", async () => {
  const bytes = await decodeOpenAIImage({ data: [{ b64_json: Buffer.from("abc").toString("base64") }] } as never);
  assert.equal(bytes.toString("utf8"), "abc");
});

test("multiple outputs are rejected for one-task-one-image invariant", async () => {
  await assert.rejects(() => decodeOpenAIImage({ data: [{ b64_json: Buffer.from("a").toString("base64") }, { b64_json: Buffer.from("b").toString("base64") }] } as never), /one image per task/);
});

test("missing b64_json with url response returns clear error when fetch fails", async () => {
  const originalFetch = global.fetch;
  global.fetch = async () => new Response(null, { status: 500 }) as never;
  await assert.rejects(() => decodeOpenAIImage({ data: [{ url: "https://example.com/test.png" }] } as never), /OpenAI image URL fetch failed/);
  global.fetch = originalFetch;
});
