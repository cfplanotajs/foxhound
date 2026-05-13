import { GalleryCard } from "./GalleryCard";
import type { ReactNode } from "react";
import { emptyState } from "./ui";

type JobTask = any;

export function GalleryGrid(props: { filteredTasks: JobTask[]; tasks: JobTask[]; reviewUpdatingId: string | null; setEditSourceTask: (task: JobTask) => void; setEditInstruction: (value: string) => void; setEditConstraints: (value: string) => void; setCompareTask: (task: JobTask) => void; updateReview: (taskId: string, reviewStatus: "favorite"|"approved"|"rejected"|"unreviewed") => void; statusChip: (status: string) => ReactNode; selectedTaskId: string | null; onSelectTask: (task: JobTask) => void }) {
  const { filteredTasks, tasks, ...rest } = props;
  if (filteredTasks.length === 0) return <div className={`mt-4 ${emptyState}`}><p className="font-semibold text-slate-800">No images yet</p><p className="mt-1">Generate your first image in Demo Mode, then edit and approve your favorite.</p></div>;
  return <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">{filteredTasks.map((task) => <GalleryCard key={task.id} task={task} sourceTask={task.sourceTaskId ? tasks.find((x) => x.id === task.sourceTaskId) ?? null : null} selected={props.selectedTaskId === task.id} onSelect={props.onSelectTask} {...rest} />)}</div>;
}
