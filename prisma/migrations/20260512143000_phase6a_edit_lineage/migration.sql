ALTER TABLE "GenerationJob" ADD COLUMN "mode" TEXT NOT NULL DEFAULT 'generate';
ALTER TABLE "GenerationJob" ADD COLUMN "sourceJobId" TEXT;
ALTER TABLE "GenerationJob" ADD COLUMN "sourceTaskId" TEXT;
ALTER TABLE "GenerationJob" ADD COLUMN "editInstruction" TEXT;
