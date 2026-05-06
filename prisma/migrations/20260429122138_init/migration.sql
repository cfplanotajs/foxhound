-- CreateTable
CREATE TABLE "GenerationJob" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "idempotencyKey" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" DATETIME,
    "completedAt" DATETIME
);

-- CreateTable
CREATE TABLE "GenerationTask" (
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" DATETIME,
    "completedAt" DATETIME,
    CONSTRAINT "GenerationTask_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "GenerationJob" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "GenerationJob_idempotencyKey_key" ON "GenerationJob"("idempotencyKey");
