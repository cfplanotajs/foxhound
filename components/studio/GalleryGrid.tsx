import { GalleryCard } from "./GalleryCard";
import type { ReactNode } from "react";

type JobTask = any;

export function GalleryGrid(props: { filteredTasks: JobTask[]; tasks: JobTask[]; reviewUpdatingId: string | null; setEditSourceTask: (task: JobTask) => void; setEditInstruction: (value: string) => void; setEditConstraints: (value: string) => void; setCompareTask: (task: JobTask) => void; updateReview: (taskId: string, reviewStatus: "favorite"|"approved"|"rejected"|"unreviewed") => void; statusChip: (status: string) => ReactNode }) {
  const { filteredTasks, tasks, ...rest } = props;
  if (filteredTasks.length === 0) return <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">Generate your first image in Demo Mode, then edit and approve your favorite.</div>;
  return <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">{filteredTasks.map((task) => <GalleryCard key={task.id} task={task} sourceTask={task.sourceTaskId ? tasks.find((x) => x.id === task.sourceTaskId) ?? null : null} {...rest} />)}</div>;
}
