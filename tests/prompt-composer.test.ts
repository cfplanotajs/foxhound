import test from "node:test";
import assert from "node:assert/strict";
import { composePrompt } from "../lib/prompt-composer.ts";

test("compose prompt includes style subject constraints", () => {
  const out = composePrompt("STYLE", "cat", "print safe");
  assert.match(out, /\[MASTER STYLE PROMPT\]/);
  assert.match(out, /STYLE/);
  assert.match(out, /Subject:\ncat/);
  assert.match(out, /Production constraints:\nprint safe/);
});

test("compose prompt uses None when constraints are empty", () => {
  const out = composePrompt("STYLE", "cat", "   ");
  assert.match(out, /Production constraints:\nNone/);
});
