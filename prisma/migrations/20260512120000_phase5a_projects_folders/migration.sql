-- CreateTable
CREATE TABLE "Project" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "stableKey" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "isArchived" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);
CREATE UNIQUE INDEX "Project_stableKey_key" ON "Project"("stableKey");

CREATE TABLE "ProjectFolder" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "projectId" TEXT NOT NULL,
  "stableKey" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "isArchived" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "ProjectFolder_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ProjectFolder_projectId_stableKey_key" ON "ProjectFolder"("projectId","stableKey");

ALTER TABLE "GenerationJob" ADD COLUMN "projectId" TEXT;
ALTER TABLE "GenerationJob" ADD COLUMN "folderId" TEXT;
