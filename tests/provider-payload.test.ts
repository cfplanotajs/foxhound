import test from "node:test";
import assert from "node:assert/strict";
import { buildProviderRequest, extractTaskParams } from "../lib/jobs/provider-payload.ts";

test("preset default size/quality flow into provider request", () => {
  const params = extractTaskParams(JSON.stringify({ params: { size: "1536x1024", quality: "medium" } }));
  const req = buildProviderRequest({ provider: "openai", model: "gpt-image-2", prompt: "cat", params });
  assert.equal(req.size, "1536x1024");
  assert.equal(req.quality, "medium");
});

test("fallback defaults apply only when params are missing", () => {
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
