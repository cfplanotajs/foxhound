-- Add processing heartbeat to avoid false stalled-job reclamation during long-running requests.
ALTER TABLE "GenerationJob" ADD COLUMN "processingHeartbeatAt" DATETIME;
