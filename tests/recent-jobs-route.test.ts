import test from "node:test";
import assert from "node:assert/strict";
import { GET } from "../app/api/jobs/recent/route.ts";
import { prisma } from "../lib/db.ts";

test("recent jobs route returns jobs with counts and no outputPath", async () => {
  const orig = prisma.generationJob.findMany;
  (prisma.generationJob as any).findMany = async () => ([
    { id: "j1", status: "completed", provider: "mock", model: "mock-v1", createdAt: new Date(), tasks: [{ status: "completed", presetName: "P", presetVersion: "v1", outputPath: "/tmp/a" }] }
  ]);
  const res = await GET(new Request("http://x/api/jobs/recent"));
  const data = await res.json();
  assert.equal(data.jobs[0].counts.completed, 1);
  assert.equal("outputPath" in data.jobs[0], false);
  (prisma.generationJob as any).findMany = orig;
});
