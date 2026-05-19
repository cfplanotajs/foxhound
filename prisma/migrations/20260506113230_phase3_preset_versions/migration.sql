-- AlterTable
ALTER TABLE "GenerationTask" ADD COLUMN "defaultModelSnapshot" TEXT;
ALTER TABLE "GenerationTask" ADD COLUMN "defaultParamsJsonSnapshot" TEXT;
ALTER TABLE "GenerationTask" ADD COLUMN "defaultProviderSnapshot" TEXT;
ALTER TABLE "GenerationTask" ADD COLUMN "presetVersionId" TEXT;

-- CreateTable
CREATE TABLE "Preset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "stableKey" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "bestUseLabel" TEXT,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "PresetVersion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "presetId" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "stylePrompt" TEXT NOT NULL,
    "defaultProvider" TEXT NOT NULL,
    "defaultModel" TEXT NOT NULL,
    "defaultParamsJson" TEXT NOT NULL,
    "samplePrompt" TEXT,
    "contentHash" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PresetVersion_presetId_fkey" FOREIGN KEY ("presetId") REFERENCES "Preset" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Preset_stableKey_key" ON "Preset"("stableKey");

-- CreateIndex
CREATE UNIQUE INDEX "PresetVersion_presetId_version_key" ON "PresetVersion"("presetId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "PresetVersion_presetId_contentHash_key" ON "PresetVersion"("presetId", "contentHash");
