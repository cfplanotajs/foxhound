import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { extractResponsesImageResult, OpenAIProvider } from "../lib/providers/openai.ts";
import { __resetEnvCacheForTests } from "../lib/env.ts";

test("openai edit reads source image and calls images.edit", async () => {
  process.env.OPENAI_API_KEY = "test-key";
  process.env.DATABASE_URL = "file:./test.db";
  __resetEnvCacheForTests();
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "foxhound-"));
  const source = path.join(dir, "source.png");
  await fs.writeFile(source, Buffer.from("pngbytes"));

  const provider = new OpenAIProvider() as any;
  process.env.OPENAI_EDIT_ADAPTER = "images_edit";
  provider.client = {
    images: {
      edit: async (payload: any) => {
        assert.equal(payload.model, "gpt-image-2");
        assert.equal(payload.prompt, "edit this");
        return { created: 1, data: [{ b64_json: Buffer.from("edited").toString("base64") }] };
      }
    }
  };

  const out = await provider.generateImage({ provider: "openai", mode: "edit", model: "gpt-image-2", prompt: "edit this", sourceImagePath: source, sourceTaskId: "t1", sourceJobId: "j1", editInstruction: "change bg" });
  assert.equal(out.images.length, 1);
  assert.equal(out.providerMetadata.mode, "edit");
  assert.equal(out.providerMetadata.sourceTaskId, "t1");
  assert.equal((out.providerMetadata as any).sourceImagePath, undefined);
});

test("openai edit rejects unsupported model", async () => {
  process.env.OPENAI_API_KEY = "test-key";
  process.env.DATABASE_URL = "file:./test.db";
  __resetEnvCacheForTests();
  const provider = new OpenAIProvider();
  await assert.rejects(
    () => provider.generateImage({ provider: "openai", mode: "edit", model: "dall-e-3", prompt: "edit", sourceImagePath: "/tmp/x.png" }),
    /does not support image editing/
  );
});

test("openai edit can use responses adapter when available", async () => {
  process.env.OPENAI_API_KEY = "test-key";
  process.env.DATABASE_URL = "file:./test.db";
  process.env.OPENAI_EDIT_ADAPTER = "responses";
  process.env.OPENAI_RESPONSES_MODEL = "gpt-5.5";
  __resetEnvCacheForTests();
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "foxhound-"));
  const source = path.join(dir, "source.png");
  await fs.writeFile(source, Buffer.from("pngbytes"));

  const provider = new OpenAIProvider() as any;
  provider.client = {
    responses: {
      create: async (payload: any) => {
        assert.equal(payload.model, "gpt-5.5");
        assert.equal(payload.tools[0].type, "image_generation");
        return { output: [{ type: "image_generation_call", result: Buffer.from("edited2").toString("base64") }] };
      }
    },
    images: { edit: async () => { throw new Error("should not call images.edit"); } }
  };
  const out = await provider.generateImage({ provider: "openai", mode: "edit", model: "gpt-image-2", prompt: "edit this", sourceImagePath: source });
  assert.equal(out.providerMetadata.adapter, "responses");
  assert.equal((out.providerMetadata as any).responsesModel, "gpt-5.5");
  assert.equal((out.providerMetadata as any).imageModel, "gpt-image-2");
});

test("responses adapter uses default responses model when OPENAI_RESPONSES_MODEL is blank", async () => {
  process.env.OPENAI_API_KEY = "test-key";
  process.env.DATABASE_URL = "file:./test.db";
  process.env.OPENAI_EDIT_ADAPTER = "responses";
  process.env.OPENAI_RESPONSES_MODEL = "   ";
  __resetEnvCacheForTests();
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "foxhound-"));
  const source = path.join(dir, "source.png");
  await fs.writeFile(source, Buffer.from("pngbytes"));

  const provider = new OpenAIProvider() as any;
  provider.client = {
    responses: {
      create: async (payload: any) => {
        assert.equal(payload.model, "gpt-5");
        assert.notEqual(payload.model, "gpt-image-2");
        return { output: [{ type: "image_generation_call", result: Buffer.from("edited2").toString("base64") }] };
      }
    },
    images: { edit: async () => { throw new Error("should not call images.edit"); } }
  };
  const out = await provider.generateImage({ provider: "openai", mode: "edit", model: "gpt-image-2", prompt: "edit this", sourceImagePath: source });
  assert.equal(out.providerMetadata.adapter, "responses");
  assert.equal((out.providerMetadata as any).responsesModel, "gpt-5");
});

test("responses adapter falls back to images.edit when responses unavailable", async () => {
  process.env.OPENAI_API_KEY = "test-key";
  process.env.DATABASE_URL = "file:./test.db";
  process.env.OPENAI_EDIT_ADAPTER = "responses";
  __resetEnvCacheForTests();
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "foxhound-"));
  const source = path.join(dir, "source.png");
  await fs.writeFile(source, Buffer.from("pngbytes"));
  const provider = new OpenAIProvider() as any;
  provider.client = {
    responses: {},
    images: { edit: async () => ({ data: [{ b64_json: Buffer.from("fallback").toString("base64") }] }) }
  };
  const out = await provider.generateImage({ provider: "openai", mode: "edit", model: "gpt-image-2", prompt: "x", sourceImagePath: source });
  assert.equal(out.providerMetadata.adapter, "images_edit");
});

test("extractResponsesImageResult handles mixed output and errors safely", () => {
  const b64 = Buffer.from("img").toString("base64");
  assert.equal(extractResponsesImageResult({ output: [{ type: "reasoning" }, { type: "image_generation_call", result: b64 }] }), b64);
  assert.throws(() => extractResponsesImageResult({ output: [{ type: "image_generation_call", result: null }] }), /did not return image data/);
  assert.throws(() => extractResponsesImageResult({ output: [{ type: "text" }] }), /did not return image data/);
});

test("missing source image fails safely", async () => {
  process.env.OPENAI_API_KEY = "test-key";
  process.env.DATABASE_URL = "file:./test.db";
  process.env.OPENAI_EDIT_ADAPTER = "images_edit";
  __resetEnvCacheForTests();
  const provider = new OpenAIProvider();
  await assert.rejects(() => provider.generateImage({ provider: "openai", mode: "edit", model: "gpt-image-2", prompt: "x", sourceImagePath: "/nope.png" }), /Source image file not found/);
});
