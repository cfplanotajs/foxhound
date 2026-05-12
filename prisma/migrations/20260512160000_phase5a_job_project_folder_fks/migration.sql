PRAGMA foreign_keys=OFF;

CREATE TABLE "new_GenerationJob" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "status" TEXT NOT NULL DEFAULT 'queued',
  "mode" TEXT NOT NULL DEFAULT 'generate',
  "provider" TEXT NOT NULL,
  "model" TEXT NOT NULL,
  "sourceJobId" TEXT,
  "sourceTaskId" TEXT,
  "editInstruction" TEXT,
  "idempotencyKey" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "startedAt" DATETIME,
  "completedAt" DATETIME,
  "projectId" TEXT,
  "folderId" TEXT,
  CONSTRAINT "GenerationJob_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "GenerationJob_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "ProjectFolder" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

INSERT INTO "new_GenerationJob" ("id","status","mode","provider","model","sourceJobId","sourceTaskId","editInstruction","idempotencyKey","createdAt","startedAt","completedAt","projectId","folderId")
SELECT "id","status",COALESCE("mode",'generate'),"provider","model","sourceJobId","sourceTaskId","editInstruction","idempotencyKey","createdAt","startedAt","completedAt","projectId","folderId" FROM "GenerationJob";

DROP TABLE "GenerationJob";
ALTER TABLE "new_GenerationJob" RENAME TO "GenerationJob";
CREATE UNIQUE INDEX "GenerationJob_idempotencyKey_key" ON "GenerationJob"("idempotencyKey");

PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
