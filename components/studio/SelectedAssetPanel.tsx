import { canEditTask } from "@/lib/jobs/edit-ui";
import { getReviewStatusLabel } from "@/lib/review-ui";
import { AssetImage } from "./AssetImage";
import { buttonSecondary, buttonStrongSecondary, card, chipSoft } from "./ui";
import { canCompareAsset, getTaskModeLabel, getTaskProviderLabel } from "./ui-helpers";
import type { StudioTask } from "./types";

type JobTask = StudioTask;

type Props = {
  task: JobTask | null;
  sourceTask: JobTask | null;
  reviewUpdatingId: string | null;
  setEditSourceTask: (task: JobTask) => void;
  setEditInstruction: (value: string) => void;
  setEditConstraints: (value: string) => void;
  setCompareTask: (task: JobTask) => void;
  updateReview: (taskId: string, reviewStatus: "favorite" | "approved" | "rejected" | "unreviewed") => void;
};

export function SelectedAssetPanel({ task, sourceTask, reviewUpdatingId, setEditSourceTask, setEditInstruction, setEditConstraints, setCompareTask, updateReview }: Props) {
  if (!task) {
    return (
      <section className={card}>
        <p className="text-sm text-slate-600">Select an image to review, edit, compare, or approve.</p>
      </section>
    );
  }

  return (
    <section className={card}>
      <h3 className="text-lg font-semibold">Selected Image</h3>
      <p className="mt-1 text-sm text-slate-600">Review this image, then edit, compare, or approve your final pick.</p>

      <div className="mt-3 overflow-hidden rounded-xl border border-slate-100 bg-slate-50">
        {task.imageUrl ? (
          <AssetImage src={task.imageUrl} alt={`Selected image preview for: ${task.subjectPrompt.slice(0, 96)}`} width={1024} height={1024} className="h-80 w-full object-cover" sizes="(min-width: 1280px) 25vw, 100vw" />
        ) : (
          <div className="flex h-80 items-center justify-center text-slate-500">No image available yet.</div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-1">
        <span className={chipSoft}>{getTaskModeLabel(task.mode)}</span>
        <span className={chipSoft}>{getTaskProviderLabel(task.provider)}</span>
        <span className={chipSoft}>{getReviewStatusLabel(task.reviewStatus)}</span>
      </div>

      <p className="mt-2 text-sm leading-6">
        <strong>Prompt:</strong> {task.subjectPrompt.slice(0, 180)}
      </p>

      {task.mode === "edit" ? (
        <p className="text-xs text-indigo-700">Edited from previous image · {task.editInstruction?.slice(0, 120) ?? "Instruction unavailable"}</p>
      ) : null}

      {task.mode === "edit" && sourceTask?.imageUrl ? (
        <div className="mt-2 flex items-center gap-2">
          <AssetImage src={sourceTask.imageUrl} alt="source preview" width={64} height={64} className="h-16 w-16 rounded border object-cover" sizes="64px" />
          <p className="text-xs text-slate-600">Edited from previous image</p>
        </div>
      ) : null}

      {task.variationIndex && task.variationCount ? <p className="mt-1 text-xs text-slate-600">Variation {task.variationIndex} of {task.variationCount}</p> : null}
      {task.aspectRatio || task.size ? <p className="text-xs text-slate-600">Ratio/Size: {task.aspectRatio ?? "-"} · {task.size ?? "-"}</p> : null}

      <div className="mt-3 flex flex-wrap gap-1 text-xs">
        {canEditTask({ status: task.status, imageUrl: task.imageUrl }) ? (
          <button className={buttonStrongSecondary} onClick={() => { setEditSourceTask(task); setEditInstruction(""); setEditConstraints(""); }} aria-label={task.mode === "edit" ? "Continue editing selected image" : "Edit selected image"}>
            {task.mode === "edit" ? "Continue Editing" : "Edit Image"}
          </button>
        ) : null}

        {canCompareAsset(task.mode, Boolean(sourceTask?.imageUrl), Boolean(task.imageUrl)) ? (
          <button className={buttonSecondary} onClick={() => setCompareTask(task)}>Compare</button>
        ) : null}

        <button disabled={reviewUpdatingId === task.id} className="rounded bg-yellow-100 px-2 py-1 disabled:opacity-60" onClick={() => updateReview(task.id, "favorite")}>Mark Favorite</button>
        <button disabled={reviewUpdatingId === task.id} className="rounded bg-emerald-700 px-2 py-1 text-white disabled:opacity-60" onClick={() => updateReview(task.id, "approved")}>Approve</button>
        <button disabled={reviewUpdatingId === task.id} className="rounded bg-rose-100 px-2 py-1 text-rose-700 disabled:opacity-60" onClick={() => updateReview(task.id, "rejected")}>Reject</button>
      </div>
    </section>
  );
}
