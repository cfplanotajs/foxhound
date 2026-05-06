import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { MockProvider } from "../lib/providers/mock.ts";
import { saveImage } from "../lib/storage.ts";

const provider = new MockProvider();

test("mock provider creates png bytes and metadata", async () => {
  const res = await provider.generateImage({ provider: "mock", model: "mock-v1", prompt: "robot owl", presetName: "Mascot" });
  assert.equal(res.images.length, 1);
  assert.equal(res.images[0].mimeType, "image/png");
  assert.ok(res.images[0].bytes.length > 100);
  assert.equal(res.providerMetadata.kind, "mock");
  assert.equal(res.providerMetadata.banner, "MOCK GENERATED IMAGE");
});

test("mock output can be saved to local storage", async () => {
  const res = await provider.generateImage({ provider: "mock", model: "mock-v1", prompt: "fox", presetName: "Studio" });
  const out = await saveImage("job-demo", "task-demo", res.images[0].bytes);
  const stat = await fs.stat(out);
  assert.ok(stat.isFile());
  await fs.rm(path.join(process.cwd(), "generated", "job-demo"), { recursive: true, force: true });
});
