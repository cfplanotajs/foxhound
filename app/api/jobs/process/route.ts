import { NextResponse } from "next/server";
import { processNextQueuedJob } from "@/lib/jobs/processor";

export async function POST() {
  try {
    const processedJobId = await processNextQueuedJob(console);
    if (!processedJobId) return NextResponse.json({ message: "No queued jobs" });
    return NextResponse.json({ processedJobId });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
