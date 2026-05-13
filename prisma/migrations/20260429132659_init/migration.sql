-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_GenerationTask" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "jobId" TEXT NOT NULL,
    "presetId" TEXT NOT NULL,
    "presetName" TEXT NOT NULL,
    "presetVersion" TEXT NOT NULL,
    "stylePromptSnapshot" TEXT NOT NULL,
    "subjectPrompt" TEXT NOT NULL,
    "finalPrompt" TEXT NOT NULL,
    "constraints" TEXT,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "outputPath" TEXT,
    "errorMessage" TEXT,
    "requestPayloadJson" TEXT,
    "responseMetadataJson" TEXT,
    "seed" INTEGER,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "nextAttemptAt" DATETIME,
    "lastError" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" DATETIME,
    "completedAt" DATETIME,
    CONSTRAINT "GenerationTask_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "GenerationJob" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_GenerationTask" ("completedAt", "constraints", "createdAt", "errorMessage", "finalPrompt", "id", "jobId", "model", "outputPath", "presetId", "presetName", "presetVersion", "provider", "requestPayloadJson", "responseMetadataJson", "seed", "startedAt", "status", "stylePromptSnapshot", "subjectPrompt") SELECT "completedAt", "constraints", "createdAt", "errorMessage", "finalPrompt", "id", "jobId", "model", "outputPath", "presetId", "presetName", "presetVersion", "provider", "requestPayloadJson", "responseMetadataJson", "seed", "startedAt", "status", "stylePromptSnapshot", "subjectPrompt" FROM "GenerationTask";
DROP TABLE "GenerationTask";
ALTER TABLE "new_GenerationTask" RENAME TO "GenerationTask";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
