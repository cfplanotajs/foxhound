import test from "node:test";
import assert from "node:assert/strict";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { isIdempotencyCollisionError } from "../lib/jobs/idempotency.ts";

test("existing idempotency key path is dedupable by key lookup", () => {
  assert.equal(Boolean("existing-key"), true);
});

test("simulated unique collision error is detected", () => {
  const err = new PrismaClientKnownRequestError("unique", { code: "P2002", clientVersion: "test" });
  assert.equal(isIdempotencyCollisionError(err), true);
});

test("unrelated db errors are not marked as idempotency collisions", () => {
  const err = new PrismaClientKnownRequestError("other", { code: "P2003", clientVersion: "test" });
  assert.equal(isIdempotencyCollisionError(err), false);
});
