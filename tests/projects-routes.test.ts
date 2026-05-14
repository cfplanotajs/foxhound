import test from "node:test";
import assert from "node:assert/strict";
import { POST as createProject } from "../app/api/projects/route.ts";
import { POST as createFolder } from "../app/api/projects/[projectId]/folders/route.ts";
import { POST as archiveProject } from "../app/api/projects/[projectId]/archive/route.ts";
import { POST as archiveFolder } from "../app/api/projects/[projectId]/folders/[folderId]/archive/route.ts";
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

test("create project returns 400 for malformed JSON body", async () => {
  const res = await createProject(new Request("http://x", { method: "POST", body: "{bad", headers: { "content-type": "application/json" } }));
  assert.equal(res.status, 400);
  assert.equal((await res.json()).error, "Malformed JSON request body.");
});

test("create project maps duplicate stableKey conflicts to 400", async () => {
  const orig = prisma.project.create;
  (prisma.project as any).create = async () => { const err = new Error("dup") as any; err.code = "P2002"; throw err; };
  const res = await createProject(new Request("http://x", { method: "POST", body: JSON.stringify({ name: "Project One", stableKey: "project_one" }) }));
  assert.equal(res.status, 400);
  assert.equal((await res.json()).error, "Project stableKey already exists.");
  (prisma.project as any).create = orig;
});

test("create folder returns 400 for malformed JSON body", async () => {
  const res = await createFolder(new Request("http://x", { method: "POST", body: "{bad", headers: { "content-type": "application/json" } }), { params: Promise.resolve({ projectId: "p1" }) });
  assert.equal(res.status, 400);
  assert.equal((await res.json()).error, "Malformed JSON request body.");
});

test("create folder requires non-blank name", async () => {
  const res = await createFolder(new Request("http://x", { method: "POST", body: JSON.stringify({ name: "   " }) }), { params: Promise.resolve({ projectId: "p1" }) });
  assert.equal(res.status, 400);
  assert.equal((await res.json()).error, "Folder name is required.");
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

test("archive unknown project returns 404", async () => {
  const ou = prisma.project.update;
  (prisma.project as any).update = async () => { const err = new Error("missing") as any; err.code = "P2025"; throw err; };
  const res = await archiveProject(new Request("http://x", { method: "POST", body: JSON.stringify({ isArchived: true }) }), { params: Promise.resolve({ projectId: "missing" }) });
  assert.equal(res.status, 404);
  assert.equal((await res.json()).error, "Project not found.");
  (prisma.project as any).update = ou;
});

test("archive malformed JSON returns 400", async () => {
  const res = await archiveProject(new Request("http://x", { method: "POST", body: "{bad", headers: { "content-type": "application/json" } }), { params: Promise.resolve({ projectId: "p1" }) });
  assert.equal(res.status, 400);
  assert.equal((await res.json()).error, "Malformed JSON request body.");
});



test("archive project rejects non-boolean isArchived", async () => {
  const a = await archiveProject(new Request("http://x", { method: "POST", body: JSON.stringify({ isArchived: "false" }) }), { params: Promise.resolve({ projectId: "p1" }) });
  const b = await archiveProject(new Request("http://x", { method: "POST", body: JSON.stringify({ isArchived: "true" }) }), { params: Promise.resolve({ projectId: "p1" }) });
  const c = await archiveProject(new Request("http://x", { method: "POST", body: JSON.stringify({}) }), { params: Promise.resolve({ projectId: "p1" }) });
  assert.equal(a.status, 400);
  assert.equal(b.status, 400);
  assert.equal(c.status, 400);
  assert.equal((await a.json()).error, "isArchived must be a boolean.");
});


test("archive and unarchive existing project succeeds", async () => {
  const ou = prisma.project.update;
  (prisma.project as any).update = async () => ({ id: "p1" });
  const a = await archiveProject(new Request("http://x", { method: "POST", body: JSON.stringify({ isArchived: true }) }), { params: Promise.resolve({ projectId: "p1" }) });
  const b = await archiveProject(new Request("http://x", { method: "POST", body: JSON.stringify({ isArchived: false }) }), { params: Promise.resolve({ projectId: "p1" }) });
  assert.equal(a.status, 200);
  assert.equal(b.status, 200);
  (prisma.project as any).update = ou;
});


test("folder archive malformed JSON returns 400", async () => {
  const res = await archiveFolder(new Request("http://x", { method: "POST", body: "{bad", headers: { "content-type": "application/json" } }), { params: Promise.resolve({ projectId: "p1", folderId: "f1" }) });
  assert.equal(res.status, 400);
  assert.equal((await res.json()).error, "Malformed JSON request body.");
});



test("folder archive rejects non-boolean isArchived", async () => {
  const ofind = prisma.projectFolder.findUnique;
  (prisma.projectFolder as any).findUnique = async () => ({ id: "f1", projectId: "p1" });
  const a = await archiveFolder(new Request("http://x", { method: "POST", body: JSON.stringify({ isArchived: "false" }) }), { params: Promise.resolve({ projectId: "p1", folderId: "f1" }) });
  const b = await archiveFolder(new Request("http://x", { method: "POST", body: JSON.stringify({}) }), { params: Promise.resolve({ projectId: "p1", folderId: "f1" }) });
  assert.equal(a.status, 400);
  assert.equal(b.status, 400);
  assert.equal((await a.json()).error, "isArchived must be a boolean.");
  (prisma.projectFolder as any).findUnique = ofind;
});


test("folder archive and unarchive succeeds", async () => {
  const ofind = prisma.projectFolder.findUnique;
  const oupdate = prisma.projectFolder.update;
  (prisma.projectFolder as any).findUnique = async () => ({ id: "f1", projectId: "p1" });
  (prisma.projectFolder as any).update = async () => ({ id: "f1" });

  const a = await archiveFolder(new Request("http://x", { method: "POST", body: JSON.stringify({ isArchived: true }) }), { params: Promise.resolve({ projectId: "p1", folderId: "f1" }) });
  const b = await archiveFolder(new Request("http://x", { method: "POST", body: JSON.stringify({ isArchived: false }) }), { params: Promise.resolve({ projectId: "p1", folderId: "f1" }) });
  assert.equal(a.status, 200);
  assert.equal(b.status, 200);

  (prisma.projectFolder as any).findUnique = ofind;
  (prisma.projectFolder as any).update = oupdate;
});

test("folder archive returns 404 for missing folder or mismatched project", async () => {
  const ofind = prisma.projectFolder.findUnique;
  (prisma.projectFolder as any).findUnique = async () => null;
  const missing = await archiveFolder(new Request("http://x", { method: "POST", body: JSON.stringify({ isArchived: true }) }), { params: Promise.resolve({ projectId: "p1", folderId: "missing" }) });
  assert.equal(missing.status, 404);

  (prisma.projectFolder as any).findUnique = async () => ({ id: "f1", projectId: "other" });
  const mismatch = await archiveFolder(new Request("http://x", { method: "POST", body: JSON.stringify({ isArchived: true }) }), { params: Promise.resolve({ projectId: "p1", folderId: "f1" }) });
  assert.equal(mismatch.status, 404);

  (prisma.projectFolder as any).findUnique = ofind;
});
