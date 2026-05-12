import test from "node:test";
import assert from "node:assert/strict";
import { POST as createProject } from "../app/api/projects/route.ts";
import { POST as createFolder } from "../app/api/projects/[projectId]/folders/route.ts";
import { prisma } from "../lib/db.ts";

test("create project succeeds with valid name", async () => {
  const orig = prisma.project.create;
  (prisma.project as any).create = async () => ({ id: "p1" });
  const res = await createProject(new Request("http://x", { method: "POST", body: JSON.stringify({ name: "Project One" }) }));
  assert.equal(res.status, 200);
  assert.equal((await res.json()).projectId, "p1");
  (prisma.project as any).create = orig;
});

test("create project requires non-blank name", async () => {
  const res = await createProject(new Request("http://x", { method: "POST", body: JSON.stringify({ name: "   " }) }));
  assert.equal(res.status, 400);
  assert.equal((await res.json()).error, "Project name is required.");
});

test("create project maps duplicate stableKey conflicts to 400", async () => {
  const orig = prisma.project.create;
  (prisma.project as any).create = async () => { const err = new Error("dup") as any; err.code = "P2002"; throw err; };
  const res = await createProject(new Request("http://x", { method: "POST", body: JSON.stringify({ name: "Project One", stableKey: "project_one" }) }));
  assert.equal(res.status, 400);
  assert.equal((await res.json()).error, "Project stableKey already exists.");
  (prisma.project as any).create = orig;
});

test("create folder rejects archived project", async () => {
  const op = prisma.project.findUnique;
  const of = prisma.projectFolder.create;
  let called = false;
  (prisma.project as any).findUnique = async () => ({ id: "p1", isArchived: true });
  (prisma.projectFolder as any).create = async () => { called = true; return { id: "f1" }; };
  const res = await createFolder(new Request("http://x", { method: "POST", body: JSON.stringify({ name: "Folder" }) }), { params: Promise.resolve({ projectId: "p1" }) });
  assert.equal(res.status, 400);
  assert.equal((await res.json()).error, "Archived project cannot be used for new folders.");
  assert.equal(called, false);
  (prisma.project as any).findUnique = op;
  (prisma.projectFolder as any).create = of;
});

test("create folder returns 404 for missing project", async () => {
  const op = prisma.project.findUnique;
  (prisma.project as any).findUnique = async () => null;
  const res = await createFolder(new Request("http://x", { method: "POST", body: JSON.stringify({ name: "Folder" }) }), { params: Promise.resolve({ projectId: "missing" }) });
  assert.equal(res.status, 404);
  assert.equal((await res.json()).error, "Project not found.");
  (prisma.project as any).findUnique = op;
});
