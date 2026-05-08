import { processNextQueuedJob } from "../lib/jobs/processor";

const pollMs = Number(process.env.WORKER_POLL_INTERVAL_MS ?? "5000");
let running = true;

console.info(`[worker] started poll=${pollMs}ms`);

process.on("SIGINT", () => {
  running = false;
  console.info("[worker] stopped (SIGINT)");
});
process.on("SIGTERM", () => {
  running = false;
  console.info("[worker] stopped (SIGTERM)");
});

async function loop() {
  while (running) {
    try {
      await processNextQueuedJob(console);
    } catch (error) {
      console.error("[worker] loop error", error);
    }
    await new Promise((resolve) => setTimeout(resolve, pollMs));
  }
}

void loop();
