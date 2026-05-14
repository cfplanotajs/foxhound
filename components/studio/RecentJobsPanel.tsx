import { buttonSecondary, buttonStrongSecondary, card, emptyState, selectedRow, subtleText } from "./ui";
import type { ReactNode } from "react";

type RecentJob = { id: string; status: string; provider: string; model: string; createdAt: string; presetName: string | null; presetVersion: string | null; counts: { completed: number; failed: number; queued: number; processing: number } };

export function RecentJobsPanel({ recentJobs, toast, jobId, rowLoadingId, statusChip, onOpen, onDuplicate, onRerun }: { recentJobs: RecentJob[]; toast: string; jobId: string; rowLoadingId: string | null; statusChip: (status: string) => ReactNode; onOpen: (jobId: string) => void; onDuplicate: (jobId: string) => void; onRerun: (jobId: string) => void }) {
  return (
    <section className={card}>
      <h2 className="text-lg font-semibold">Recent Jobs</h2>
      <p className={subtleText}>Duplicate copies settings into the form. Re-run starts a new job right away.</p>
      {toast ? <p className="mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{toast}</p> : null}
      <div className="mt-3 grid gap-2">
        {recentJobs.length === 0 ? <p className={emptyState}>No jobs yet. Choose a preset, add a prompt, and click Generate Images.</p> : recentJobs.map((j) => (
          <div key={j.id} className={`rounded-xl border p-3 text-sm ${jobId === j.id ? selectedRow : "border-slate-200 bg-white"}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium">{j.id.slice(0, 8)} · {statusChip(j.status)}</p>
                <p className="text-slate-600">{j.presetName ?? "Unknown preset"} {j.presetVersion ? `(${j.presetVersion})` : ""} · {j.provider}/{j.model}</p>
                <p className={subtleText}>Done {j.counts.completed} · Failed {j.counts.failed} · Queue {j.counts.queued + j.counts.processing}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button className={buttonSecondary} onClick={() => onOpen(j.id)}>Open</button>
                <button className={buttonSecondary} disabled={rowLoadingId === j.id} onClick={() => onDuplicate(j.id)}>{rowLoadingId === j.id ? "Loading..." : "Duplicate"}</button>
                <button className={buttonStrongSecondary} disabled={rowLoadingId === j.id} onClick={() => onRerun(j.id)}>{rowLoadingId === j.id ? "Loading..." : "Re-run"}</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
