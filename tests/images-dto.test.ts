import test from "node:test";
import assert from "node:assert/strict";
import { toClientTaskDto } from "../lib/jobs/image-dto.ts";

test("images DTO does not include outputPath", () => {
  const dto = toClientTaskDto({
    id: "t1",
    jobId: "j1",
    status: "completed",
    subjectPrompt: "cat",
    finalPrompt: "final",
    presetName: "preset",
    presetVersion: "v1",
    provider: "openai",
    model: "gpt-image-2",
    errorMessage: null,
    responseMetadataJson: null,
    createdAt: new Date(),
    completedAt: new Date(),
    outputPath: "/secret/path/image.png"
  });
  assert.equal("outputPath" in dto, false);
  assert.equal("responseMetadataJson" in dto, false);
});

test("completed task DTO includes imageUrl", () => {
  const dto = toClientTaskDto({
    id: "t1", jobId: "j1", status: "completed", subjectPrompt: "cat", finalPrompt: "f", presetName: "p", presetVersion: "v1", provider: "openai", model: "gpt-image-2", errorMessage: null, responseMetadataJson: null, createdAt: new Date(), completedAt: new Date(), outputPath: "/tmp/x.png"
  });
  assert.equal(dto.imageUrl, "/api/images/j1/t1");
});

test("failed task includes friendly provider error metadata", () => {
  const dto = toClientTaskDto({
    id: "t1", jobId: "j1", status: "failed", subjectPrompt: "cat", finalPrompt: "f", presetName: "p", presetVersion: "v1", provider: "openai", model: "gpt-image-2", errorMessage: "fail", responseMetadataJson: JSON.stringify({ providerError: { title: "OpenAI billing limit reached" } }), createdAt: new Date(), completedAt: null, outputPath: null
  });
  assert.deepEqual(dto.providerError, { title: "OpenAI billing limit reached" });
});
