import { GalleryCard } from "./GalleryCard";
import type { ReactNode } from "react";

type JobTask = any;

export function GalleryGrid(props: { filteredTasks: JobTask[]; tasks: JobTask[]; reviewUpdatingId: string | null; setEditSourceTask: (task: JobTask) => void; setEditInstruction: (value: string) => void; setEditConstraints: (value: string) => void; setCompareTask: (task: JobTask) => void; updateReview: (taskId: string, reviewStatus: "favorite"|"approved"|"rejected"|"unreviewed") => void; statusChip: (status: string) => ReactNode }) {
  const { filteredTasks, tasks, ...rest } = props;
  return <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">{filteredTasks.map((task) => <GalleryCard key={task.id} task={task} sourceTask={task.sourceTaskId ? tasks.find((x) => x.id === task.sourceTaskId) ?? null : null} {...rest} />)}</div>;
}
