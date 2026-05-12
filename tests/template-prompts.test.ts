import test from "node:test";
import assert from "node:assert/strict";
import { splitTemplatePrompts } from "../lib/jobs/template-prompts.ts";

test("single line template uses singlePrompt and clears bulkPrompts", () => {
  const out = splitTemplatePrompts(["cat"]);
  assert.equal(out.singlePrompt, "cat");
  assert.equal(out.bulkPrompts, "");
});

test("multi line template uses bulkPrompts and clears singlePrompt", () => {
  const out = splitTemplatePrompts(["cat", "dog"]);
  assert.equal(out.singlePrompt, "");
  assert.equal(out.bulkPrompts, "cat\ndog");
});

test("empty template lines are handled safely", () => {
  const out = splitTemplatePrompts([" ", ""]);
  assert.equal(out.singlePrompt, "");
  assert.equal(out.bulkPrompts, "");
});
