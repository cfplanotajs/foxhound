import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { PNG } from "pngjs";
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

test("mock provider respects requested dimensions", async () => {
  const wide = await provider.generateImage({ provider: "mock", model: "mock-v1", prompt: "wide", size: "1536x864" });
  const widePng = PNG.sync.read(wide.images[0].bytes);
  assert.equal(widePng.width, 1536);
  assert.equal(widePng.height, 864);

  const tall = await provider.generateImage({ provider: "mock", model: "mock-v1", prompt: "tall", size: "1152x2048" });
  const tallPng = PNG.sync.read(tall.images[0].bytes);
  assert.equal(tallPng.width, 1152);
  assert.equal(tallPng.height, 2048);
});

test("mock provider falls back safely when size is missing or malformed", async () => {
  const missing = await provider.generateImage({ provider: "mock", model: "mock-v1", prompt: "missing" });
  const missingPng = PNG.sync.read(missing.images[0].bytes);
  assert.equal(missingPng.width, 1024);
  assert.equal(missingPng.height, 1024);

  const malformed = await provider.generateImage({ provider: "mock", model: "mock-v1", prompt: "bad", size: "abc" });
  const malformedPng = PNG.sync.read(malformed.images[0].bytes);
  assert.equal(malformedPng.width, 1024);
  assert.equal(malformedPng.height, 1024);
});

test("mock output can be saved to local storage", async () => {
  const res = await provider.generateImage({ provider: "mock", model: "mock-v1", prompt: "fox", presetName: "Studio" });
  const out = await saveImage("job-demo", "task-demo", res.images[0].bytes);
  const stat = await fs.stat(out);
  assert.ok(stat.isFile());
  await fs.rm(path.join(process.cwd(), "generated", "job-demo"), { recursive: true, force: true });
});
