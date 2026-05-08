export interface AtomicTx {
  generationJob: { create(args: { data: Record<string, unknown> }): Promise<{ id: string }> };
  generationTask: { createMany(args: { data: Record<string, unknown>[] }): Promise<unknown> };
}

export async function createJobAndTasksAtomic(db: { $transaction: (fn: (tx: AtomicTx) => Promise<{ id: string }>) => Promise<{ id: string }> }, input: {
  jobData: Record<string, unknown>;
  taskData: Record<string, unknown>[];
}): Promise<{ id: string }> {
  return db.$transaction(async (tx) => {
    const createdJob = await tx.generationJob.create({ data: input.jobData });
    await tx.generationTask.createMany({ data: input.taskData.map((task) => ({ ...task, jobId: createdJob.id })) });
    return createdJob;
  });
}
