-- Add review status fields for task-level asset review states
ALTER TABLE "GenerationTask" ADD COLUMN "reviewStatus" TEXT NOT NULL DEFAULT 'unreviewed';
ALTER TABLE "GenerationTask" ADD COLUMN "reviewedAt" DATETIME;
