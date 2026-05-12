import test from "node:test";
import assert from "node:assert/strict";
import { parseJsonBody } from "../lib/jobs/json-body.ts";

test("invalid JSON body parsing returns malformed indicator", async () => {
  const req = new Request("http://localhost/api/jobs", { method: "POST", body: "{bad", headers: { "content-type": "application/json" } });
  const out = await parseJsonBody(req);
  assert.equal(out.ok, false);
});

test("valid JSON body parsing returns data", async () => {
  const req = new Request("http://localhost/api/jobs", { method: "POST", body: JSON.stringify({ a: 1 }), headers: { "content-type": "application/json" } });
  const out = await parseJsonBody(req);
  assert.equal(out.ok, true);
});
