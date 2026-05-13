import test from "node:test";
import assert from "node:assert/strict";
import { buildProviderRequest, extractTaskParams, serializeTaskPayload } from "../lib/jobs/provider-payload.ts";

test("preset default size/quality flow into provider request", () => {
  const params = extractTaskParams(JSON.stringify({ params: { size: "1536x1024", quality: "medium", count: 1 } }));
  const req = buildProviderRequest({ provider: "openai", model: "gpt-image-2", prompt: "cat", params });
  assert.equal(req.size, "1536x1024");
  assert.equal(req.quality, "medium");
});

test("failed retry uses same params from stored task payload", () => {
  const stored = serializeTaskPayload({ size: "1536x1024", quality: "medium", count: 1 }, { model: "gpt-image-2" });
  const params = extractTaskParams(stored);
  const req = buildProviderRequest({ provider: "openai", model: "gpt-image-2", prompt: "cat", params });
  assert.equal(req.size, "1536x1024");
  assert.equal(req.quality, "medium");
});

test("flattened provider payloads do not erase task params", () => {
  const stored = JSON.stringify({ taskParams: { size: "1536x1024", quality: "high", count: 1 }, providerPayload: { size: "1024x1024" }, size: "1024x1024" });
  const params = extractTaskParams(stored);
  assert.equal(params.size, "1536x1024");
  assert.equal(params.quality, "high");
});

test("missing params fallback only when no task params were stored", () => {
  const req = buildProviderRequest({ provider: "openai", model: "gpt-image-2", prompt: "cat", params: {} });
  assert.equal(req.size, "1024x1024");
  assert.equal(req.quality, "high");
  assert.equal(req.count, 1);
});

test("logged payload shape matches actual provider request", () => {
  const req = buildProviderRequest({ provider: "openai", model: "gpt-image-2", prompt: "cat", params: { size: "1024x1024", quality: "high", count: 1 } });
  const logged = JSON.parse(JSON.stringify(req));
  assert.deepEqual(logged, req);
});
