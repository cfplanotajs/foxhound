import test from "node:test";
import assert from "node:assert/strict";
import { cloneTaskPayloadForRerun, extractTaskParams, mergeProviderPayload, parseTaskPayload, serializeTaskPayloadWithMetadata } from "../lib/jobs/provider-payload.ts";

test("parseTaskPayload reads structured envelope", () => {
  const raw = serializeTaskPayloadWithMetadata({ size: "1536x864", quality: "low" }, { model: "gpt-image-2" }, { variationIndex: 2, variationCount: 4, aspectRatio: "16:9" });
  const parsed = parseTaskPayload(raw);
  assert.equal(parsed.taskParams.size, "1536x864");
  assert.equal(parsed.metadata.variationCount, 4);
});

test("mergeProviderPayload preserves params and metadata", () => {
  const raw = serializeTaskPayloadWithMetadata({ size: "1536x864", quality: "low" }, { model: "old" }, { variationIndex: 1 });
  const merged = parseTaskPayload(mergeProviderPayload(raw, { model: "new", size: "1536x864" }));
  assert.equal(merged.taskParams.quality, "low");
  assert.equal(merged.metadata.variationIndex, 1);
  assert.equal(merged.providerPayload.model, "new");
});

test("cloneTaskPayloadForRerun preserves source params/metadata", () => {
  const raw = serializeTaskPayloadWithMetadata({ size: "1536x864", quality: "low" }, { model: "gpt-image-2" }, { variationCount: 4, aspectRatio: "16:9" });
  const cloned = parseTaskPayload(cloneTaskPayloadForRerun(raw, { model: "fallback" }));
  assert.equal(extractTaskParams(JSON.stringify(cloned)).size, "1536x864");
  assert.equal(cloned.metadata.aspectRatio, "16:9");
});
