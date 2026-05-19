import { processNextQueuedJob } from "../lib/jobs/processor";
import { getWorkerPollIntervalMs } from "../lib/jobs/worker-config";

const pollMs = getWorkerPollIntervalMs();
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
