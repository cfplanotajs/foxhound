"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getDefaultQualityForModel, getQualityOptionsForModel, normalizeQualityForModel } from "@/lib/providers/model-quality";
import { splitTemplatePrompts } from "@/lib/jobs/template-prompts";
import { applyJobTemplateToFormState } from "@/lib/jobs/template-form";
import { appendEditChip, buildEditRequestPayload, canEditTask } from "@/lib/jobs/edit-ui";
import { filterTasksByReview, getReviewStatusLabel, ReviewStatus } from "@/lib/review-ui";
import { HeroHeader } from "@/components/studio/HeroHeader";
import { ReviewToolbar } from "@/components/studio/ReviewToolbar";
import { CompareModal } from "@/components/studio/CompareModal";
import { GalleryGrid } from "@/components/studio/GalleryGrid";
import { EditPanel } from "@/components/studio/EditPanel";
import { RecentJobsPanel } from "@/components/studio/RecentJobsPanel";

type Preset = { id: string; name: string; version: string; description: string; defaultProvider: string; defaultModel: string; defaultParams?: Record<string, unknown>; samplePrompt?: string | null; bestUseLabel?: string | null };
type ManagerPreset = { stableKey: string; name: string; version: string; isArchived: boolean };
type TaskStatus = "queued" | "processing" | "completed" | "failed";
type JobTask = {
  id: string;
  presetName: string;
  presetVersion: string;
  subjectPrompt: string;
  status: TaskStatus;
  errorMessage: string | null;
  lastError?: string | null;
  provider: string;
  model: string;
  providerError?: { title?: string; designerMessage?: string; technicalMessage?: string; suggestedAction?: string } | null;
  imageUrl: string | null;
  variationIndex?: number | null;
  variationCount?: number | null;
  aspectRatio?: string | null;
  size?: string | null;
  reviewStatus?: "unreviewed" | "favorite" | "approved" | "rejected";
  mode?: "generate" | "edit";
  sourceTaskId?: string | null;
  sourceJobId?: string | null;
  editInstruction?: string | null;
};
type RecentJob = { id: string; status: string; provider: string; model: string; createdAt: string; presetName: string | null; presetVersion: string | null; counts: { completed: number; failed: number; queued: number; processing: number } };
type ProjectFolder = { id: string; name: string; isArchived: boolean };
type Project = { id: string; name: string; isArchived: boolean; folders: ProjectFolder[] };

function statusChip(status: string) {
  const map: Record<string, string> = {
    queued: "bg-slate-200 text-slate-700",
    processing: "bg-amber-100 text-amber-700",
    completed: "bg-emerald-100 text-emerald-700",
    failed: "bg-rose-100 text-rose-700"
  };
  return <span className={`rounded-full px-2 py-1 text-xs font-semibold ${map[status] ?? map.queued}`}>{status}</span>;
}

export default function DashboardPage() {
  const [presets, setPresets] = useState<Preset[]>([]);
  const [presetId, setPresetId] = useState("");
  const [singlePrompt, setSinglePrompt] = useState("");
  const [bulkPrompts, setBulkPrompts] = useState("");
  const [constraints, setConstraints] = useState("");
  const [provider, setProvider] = useState("openai");
  const [model, setModel] = useState("gpt-image-2");
  const [aspectRatio, setAspectRatio] = useState("1:1");
  const [aspectRatioTouched, setAspectRatioTouched] = useState(false);
  const [variationCount, setVariationCount] = useState(1);
  const [quality, setQuality] = useState("high");
  const [jobId, setJobId] = useState("");
  const [jobStatus, setJobStatus] = useState("");
  const [tasks, setTasks] = useState<JobTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showManager, setShowManager] = useState(false);
  const [managerName, setManagerName] = useState("");
  const [managerPrompt, setManagerPrompt] = useState("");
  const [managerPresets, setManagerPresets] = useState<{active: ManagerPreset[]; archived: ManagerPreset[]}>({ active: [], archived: [] });
  const [managerLoading, setManagerLoading] = useState(false);
  const [managerError, setManagerError] = useState("");
  const [recentJobs, setRecentJobs] = useState<RecentJob[]>([]);
  const [toast, setToast] = useState("");
  const [rowLoadingId, setRowLoadingId] = useState<string | null>(null);
  const [reviewFilter, setReviewFilter] = useState<"all" | "favorite" | "approved" | "rejected">("all");
  const [reviewUpdatingId, setReviewUpdatingId] = useState<string | null>(null);
  const [reviewError, setReviewError] = useState("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState("");
  const [folderId, setFolderId] = useState("");
  const [editSourceTask, setEditSourceTask] = useState<JobTask | null>(null);
  const [editInstruction, setEditInstruction] = useState("");
  const [editConstraints, setEditConstraints] = useState("");
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [compareTask, setCompareTask] = useState<JobTask | null>(null);

  const selectedPreset = useMemo(() => presets.find((p) => p.id === presetId), [presets, presetId]);

  const loadPresets = useCallback(async () => {
    const res = await fetch("/api/presets");
    const data = await res.json();
    if (!res.ok) return alert(data.error ?? "Failed to load presets");
    setPresets(data.presets);
    if (data.presets.length > 0 && !presetId) {
      setPresetId(data.presets[0].id);
      setModel(data.presets[0].defaultModel);
    }
  }, [presetId]);

  useEffect(() => {
    void loadPresets();
    void fetch("/api/jobs/recent").then((r) => r.json()).then((d) => setRecentJobs(d.jobs ?? []));
    void fetch("/api/projects").then((r) => r.json()).then((d) => setProjects(d.projects ?? []));
  }, [loadPresets]);
  const reloadManagerPresets = useCallback(async () => {
    setManagerLoading(true);
    setManagerError("");
    const r = await fetch("/api/presets/manage");
    const d = await r.json();
    if (!r.ok) setManagerError(d.error ?? "Could not load preset manager.");
    else setManagerPresets({ active: d.active ?? [], archived: d.archived ?? [] });
    setManagerLoading(false);
  }, []);
  useEffect(() => {
    if (!showManager) return;
    void reloadManagerPresets();
  }, [showManager, reloadManagerPresets]);
  useEffect(() => {
    setQuality((current) => normalizeQualityForModel(provider as "openai" | "mock", model, current));
  }, [provider, model]);

  const promptValid = singlePrompt.trim().length > 0 || bulkPrompts.trim().length > 0;
  const formValid = Boolean(presetId && provider && model.trim() && promptValid);

  async function submitJob() {
    setError("");
    if (!presetId) return setError("Preset is required.");
    if (!provider) return setError("Provider is required.");
    if (!model.trim()) return setError("Model is required.");
    if (!promptValid) return setError("Enter at least one prompt.");

    setLoading(true);
    const idempotencyKey = crypto.randomUUID();
    const res = await fetch("/api/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ presetId, provider, model, singlePrompt, bulkPrompts, constraints, projectId: projectId || undefined, folderId: folderId || undefined, idempotencyKey, ...(aspectRatioTouched ? { aspectRatio } : {}), variationCount, quality })
    });
    const data = await res.json();
    if (res.ok) {
      setJobId(data.jobId);
      await refreshJob(data.jobId);
      await refreshImages(data.jobId);
    } else {
      setError(data.error ?? "Failed to submit job");
    }
    setLoading(false);
  }

  async function refreshJob(targetJobId = jobId) {
    if (!targetJobId) return;
    const res = await fetch(`/api/jobs/${targetJobId}`);
    const data = await res.json();
    setJobStatus(data.job?.status ?? "unknown");
  }

  async function refreshImages(targetJobId = jobId) {
    if (!targetJobId) return;
    const res = await fetch(`/api/jobs/${targetJobId}/images`);
    const data = await res.json();
    setTasks(data.tasks ?? []);
  }
  async function updateReview(taskId: string, reviewStatus: ReviewStatus) {
    setReviewError("");
    setReviewUpdatingId(taskId);
    const res = await fetch(`/api/tasks/${taskId}/review`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reviewStatus }) });
    if (!res.ok) {
      const err = await res.json();
      setReviewError(err.error ?? "Could not update review state.");
      setReviewUpdatingId(null);
      return;
    }
    setTasks((current) => current.map((task) => task.id === taskId ? { ...task, reviewStatus } : task));
    setReviewUpdatingId(null);
  }
  async function duplicateJobIntoForm(targetJobId: string) {
    setRowLoadingId(targetJobId);
    const templateRes = await fetch(`/api/jobs/${targetJobId}/template`);
    const templateData = await templateRes.json();
    if (!templateRes.ok) {
      setToast("Duplicate failed. Could not copy this job into the form.");
      setRowLoadingId(null);
      return;
    }
    const tpl = templateData.template;
    const promptFields = splitTemplatePrompts(tpl.promptLines);
    const appliedTemplate = applyJobTemplateToFormState(tpl);
    setSinglePrompt(promptFields.singlePrompt);
    setBulkPrompts(promptFields.bulkPrompts);
    setProvider(appliedTemplate.provider);
    setModel(appliedTemplate.model);
    setAspectRatio(appliedTemplate.aspectRatio);
    setAspectRatioTouched(appliedTemplate.aspectRatioTouched);
    setConstraints(appliedTemplate.constraints);
    setProjectId(tpl.projectId ?? "");
    setFolderId(tpl.folderId ?? "");
    if (appliedTemplate.variationCount) setVariationCount(appliedTemplate.variationCount);
    if (appliedTemplate.quality) setQuality(appliedTemplate.quality);
    if (tpl.presetSelectable && presets.find((p) => p.id === tpl.presetId)) setPresetId(tpl.presetId);
    if (!tpl.presetSelectable) {
      setToast("This job’s preset is archived. Choose an active preset before submitting.");
    } else {
      setToast("Duplicate success. Job copied into the form; it was not submitted.");
    }
    setRowLoadingId(null);
  }

  async function rerunJobFromRow(targetJobId: string) {
    setRowLoadingId(targetJobId);
    const res = await fetch(`/api/jobs/${targetJobId}/rerun`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) {
      setToast(data.error ?? "Re-run failed. Could not create a new job.");
      setRowLoadingId(null);
      return;
    }
    setJobId(data.jobId);
    await refreshJob(data.jobId);
    await refreshImages(data.jobId);
    setToast("Re-run submitted. A new job was created from this source.");
    void fetch("/api/jobs/recent").then((r) => r.json()).then((d) => setRecentJobs(d.jobs ?? []));
    setRowLoadingId(null);
  }

  async function downloadZip() {
    if (!jobId) return;
    const res = await fetch(`/api/jobs/${jobId}/download`);
    if (!res.ok) {
      const err = await res.json();
      return alert(err.error ?? "Download failed");
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `job-${jobId}.zip`;
    a.click();
    URL.revokeObjectURL(url);
  }
  async function downloadApprovedZip() {
    if (!jobId) return;
    const res = await fetch(`/api/jobs/${jobId}/download?approvedOnly=1`);
    if (!res.ok) {
      const err = await res.json();
      return alert(err.error ?? "Download failed");
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `job-${jobId}-approved.zip`;
    a.click();
    URL.revokeObjectURL(url);
  }
  async function submitEdit() {
    if (!editSourceTask) return;
    if (!editInstruction.trim()) return setToast("Edit instruction is required.");
    setEditSubmitting(true);
    const payload = buildEditRequestPayload({ presetId, provider: provider as "openai" | "mock", model, editInstruction, constraints: editConstraints, aspectRatio, variationCount: variationCount as 1 | 2 | 4, quality: quality as any, projectId, folderId });
    const res = await fetch(`/api/tasks/${editSourceTask.id}/edit`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const data = await res.json();
    if (!res.ok) {
      setToast(data.error ?? "Could not submit edit job.");
      setEditSubmitting(false);
      return;
    }
    setToast("Edit job submitted.");
    setEditSubmitting(false);
    setEditSourceTask(null);
    setJobId(data.jobId);
    await refreshJob(data.jobId);
    await refreshImages(data.jobId);
    void fetch("/api/jobs/recent").then((r) => r.json()).then((d) => setRecentJobs(d.jobs ?? []));
  }

  async function createPresetFromManager() {
    const stableKey = managerName.toLowerCase().replace(/[^a-z0-9]+/g, "_");
    const res = await fetch("/api/presets/manage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "create",
        stableKey,
        name: managerName,
        description: "Created from Preset Manager",
        stylePrompt: managerPrompt,
        defaultProvider: provider,
        defaultModel: model,
        defaultParams: { size: "1024x1024", quality: normalizeQualityForModel(provider as "openai" | "mock", model, quality) || getDefaultQualityForModel(provider as "openai" | "mock", model), count: 1 },
        samplePrompt: managerPrompt,
        contentHash: `${stableKey}-${Date.now()}`
      })
    });
    const data = await res.json();
    if (!res.ok) return setError(data.error ?? "Failed to create preset");
    setManagerName("");
    setManagerPrompt("");
    await loadPresets();
  }

  async function setPresetArchived(stableKey: string, isArchived: boolean) {
    const res = await fetch("/api/presets/manage", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "archive", stableKey, isArchived }) });
    const data = await res.json();
    if (!res.ok) {
      setManagerError(isArchived ? "Could not archive preset." : "Could not unarchive preset.");
      return;
    }
    await Promise.all([loadPresets(), reloadManagerPresets()]);
    if (isArchived && presetId === stableKey) setPresetId("");
    if (data?.error) setManagerError(data.error);
  }

  const filteredTasks = filterTasksByReview(tasks, reviewFilter);

  const counts = {
    complete: tasks.filter((t) => t.status === "completed").length,
    failed: tasks.filter((t) => t.status === "failed").length,
    queued: tasks.filter((t) => t.status === "queued" || t.status === "processing").length
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-100 via-zinc-50 to-white">
      <div className="mx-auto max-w-7xl space-y-6 p-6"><HeroHeader provider={provider} showManager={showManager} onToggleManager={() => setShowManager((v) => !v)} />

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-lg font-semibold">Preset & Model</h2>
          <label className="grid gap-1">
            <span className="text-sm font-medium">Preset</span>
            <select value={presetId} onChange={(e) => setPresetId(e.target.value)} className="rounded border p-2">
              <option value="">Select preset</option>
              {presets.map((preset) => <option key={preset.id} value={preset.id}>{preset.name} ({preset.version})</option>)}
            </select>
          </label>
          {selectedPreset ? (
            <div className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
              <p><strong>{selectedPreset.name}</strong> — {selectedPreset.description}</p>
              <p className="mt-1">Model: {selectedPreset.defaultModel} | Size: {String(selectedPreset.defaultParams?.size ?? "1024x1024")} | Quality: {String(selectedPreset.defaultParams?.quality ?? "high")}</p>
            </div>
          ) : null}

          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="grid gap-1 text-sm"><span className="font-medium">Provider</span><div className="inline-flex rounded-xl border border-slate-300 bg-slate-100 p-1"><button type="button" onClick={() => setProvider("mock")} className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${provider==="mock"?"bg-white text-slate-900 shadow":"text-slate-600"}`}>Demo Mode</button><button type="button" onClick={() => setProvider("openai")} className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${provider==="openai"?"bg-white text-slate-900 shadow":"text-slate-600"}`}>OpenAI</button></div></div>
            <label className="grid gap-1 text-sm"><span className="font-medium">Model</span>{provider === "mock" ? <select value={model} onChange={(e) => setModel(e.target.value)} className="rounded border p-2"><option value="mock-v1">mock-v1</option></select> : <select value={model} onChange={(e) => setModel(e.target.value)} className="rounded border p-2"><option value="gpt-image-2">gpt-image-2</option><option value="gpt-image-1">gpt-image-1</option><option value="dall-e-3">dall-e-3</option><option value="dall-e-2">dall-e-2</option></select>}</label>
            <label className="grid gap-1 text-sm"><span className="font-medium">Aspect Ratio</span><select value={aspectRatio} onChange={(e) => { setAspectRatio(e.target.value); setAspectRatioTouched(true); }} className="rounded border p-2"><option value="1:1">Square 1:1</option><option value="2:3">Portrait 2:3</option><option value="4:6">Portrait 4:6</option><option value="4:3">Landscape 4:3</option><option value="3:2">Classic 3:2</option><option value="9:16">Vertical 9:16</option><option value="16:9">Widescreen 16:9</option></select></label>
            <label className="grid gap-1 text-sm"><span className="font-medium">Variations</span><select value={variationCount} onChange={(e) => setVariationCount(Number(e.target.value))} className="rounded border p-2"><option value={1}>1</option><option value={2}>2</option><option value={4}>4</option></select></label>
            <label className="grid gap-1 text-sm"><span className="font-medium">Quality</span><select value={quality} onChange={(e) => setQuality(e.target.value)} className="rounded border p-2">{getQualityOptionsForModel(provider as "openai" | "mock", model).map((q) => <option key={q} value={q}>{q}</option>)}</select></label>
            <label className="grid gap-1 text-sm"><span className="font-medium">Project</span><select value={projectId} onChange={(e) => { setProjectId(e.target.value); setFolderId(""); }} className="rounded border p-2"><option value="">Unassigned</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
            <label className="grid gap-1 text-sm"><span className="font-medium">Folder</span><select value={folderId} onChange={(e) => setFolderId(e.target.value)} className="rounded border p-2" disabled={!projectId}><option value="">Unassigned</option>{(projects.find((p) => p.id === projectId)?.folders ?? []).map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}</select></label>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-lg font-semibold">Prompt</h2><div className="mb-2 flex flex-wrap gap-2">{presets.map((p) => <button key={p.id} type="button" className="rounded-full border border-slate-300 bg-slate-100 px-3 py-1 text-xs font-medium hover:bg-slate-200" onClick={() => { setPresetId(p.id); if (p.samplePrompt) setSinglePrompt(p.samplePrompt); }}>{p.samplePrompt ? `${p.name} sample` : `Use ${p.name}`}</button>)}</div>
          {error ? <p className="mb-2 rounded bg-rose-100 p-2 text-sm text-rose-700">{error}</p> : null}
          <label className="grid gap-1 text-sm"><span className="font-medium">Single Prompt</span><textarea value={singlePrompt} onChange={(e) => setSinglePrompt(e.target.value)} className="min-h-20 rounded border p-2" /></label>
          <label className="mt-2 grid gap-1 text-sm"><span className="font-medium">Bulk Prompts (one per line)</span><textarea value={bulkPrompts} onChange={(e) => setBulkPrompts(e.target.value)} className="min-h-24 rounded border p-2" /></label>
          <label className="mt-2 grid gap-1 text-sm"><span className="font-medium">Production Constraints (optional)</span><textarea value={constraints} onChange={(e) => setConstraints(e.target.value)} className="min-h-16 rounded border p-2" /></label>
          <p className="mt-2 text-xs text-slate-500">Submit is enabled when preset, provider, model, and at least one prompt line are present.</p>
          <button disabled={loading || !formValid} className="mt-3 rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50" onClick={submitJob}>{loading ? "Generating..." : "Generate Images"}</button>
        </div>
      </section>

      
      {showManager ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Preset Manager</h2>
          <p className="text-sm text-slate-600">Create presets and versions without editing JSON.</p>
          <div className="mt-3 grid gap-2">
            <input value={managerName} onChange={(e) => setManagerName(e.target.value)} placeholder="Preset name" className="rounded border p-2" />
            <textarea value={managerPrompt} onChange={(e) => setManagerPrompt(e.target.value)} placeholder="Style prompt" className="rounded border p-2 min-h-20" />
            <button type="button" className="rounded bg-blue-600 px-3 py-2 text-white" onClick={createPresetFromManager}>Create Preset</button>
          </div>
          <div className="mt-4 space-y-3">
            {managerError ? <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{managerError}</p> : null}
            <h3 className="font-medium">Active Presets</h3>
            {managerLoading ? <p className="text-sm text-slate-500">Loading presets...</p> : null}
            {!managerLoading && managerPresets.active.length === 0 ? <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">No active presets.</p> : null}
            <div className="mt-2 grid gap-2">{managerPresets.active.map((p) => <div key={p.stableKey} className="rounded-xl border p-3 text-sm flex items-center justify-between"><span>{p.name} <span className="text-slate-500">({p.version})</span></span><button className="rounded bg-amber-100 px-3 py-1 font-medium text-amber-800 hover:bg-amber-200" onClick={() => setPresetArchived(p.stableKey, true)}>Archive</button></div>)}</div>
            <details className="mt-3"><summary className="cursor-pointer text-sm font-medium">Archived presets</summary>{!managerLoading && managerPresets.archived.length === 0 ? <p className="mt-2 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">No archived presets.</p> : null}<div className="mt-2 grid gap-2">{managerPresets.archived.map((p) => <div key={p.stableKey} className="rounded-xl border p-3 text-sm flex items-center justify-between"><span>{p.name} <span className="text-slate-500">({p.version})</span></span><button className="rounded bg-emerald-100 px-3 py-1 font-medium text-emerald-800 hover:bg-emerald-200" onClick={() => setPresetArchived(p.stableKey, false)}>Unarchive</button></div>)}</div></details>
          </div>
        </section>
      ) : null}

      {jobId && (
        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Job Summary</h2>
              <p className="text-sm text-slate-600">Job ID: {jobId}</p>
              <p className="text-sm text-slate-600">Status: {jobStatus}</p>
              <p className="text-sm text-slate-600">Complete: {counts.complete} · Failed: {counts.failed} · Queued/Processing: {counts.queued}</p>
            </div>
            <div className="flex gap-2">
              <button className="rounded bg-slate-700 px-3 py-2 text-white" onClick={() => refreshJob()}>Refresh Status</button>
              <button className="rounded bg-slate-700 px-3 py-2 text-white" onClick={() => refreshImages()}>Refresh Gallery</button>
              <button className="rounded bg-emerald-700 px-3 py-2 text-white" onClick={downloadZip}>Download ZIP</button>
              <button className="rounded bg-emerald-900 px-3 py-2 text-white" onClick={downloadApprovedZip}>Download Approved ZIP</button>
            </div>
          </div>
          <ReviewToolbar reviewFilter={reviewFilter} setReviewFilter={setReviewFilter} reviewError={reviewError} />
          <GalleryGrid filteredTasks={filteredTasks} tasks={tasks} reviewUpdatingId={reviewUpdatingId} setEditSourceTask={setEditSourceTask} setEditInstruction={setEditInstruction} setEditConstraints={setEditConstraints} setCompareTask={setCompareTask} updateReview={updateReview} statusChip={statusChip} />
        </section>
      )}
      <RecentJobsPanel recentJobs={recentJobs} toast={toast} jobId={jobId} rowLoadingId={rowLoadingId} statusChip={statusChip} onOpen={async (targetId) => { setJobId(targetId); await refreshJob(targetId); await refreshImages(targetId); }} onDuplicate={duplicateJobIntoForm} onRerun={rerunJobFromRow} />
      {editSourceTask ? <EditPanel editSourceTask={editSourceTask} provider={provider} editInstruction={editInstruction} editConstraints={editConstraints} editSubmitting={editSubmitting} onEditInstructionChange={setEditInstruction} onEditConstraintsChange={setEditConstraints} onAppendChip={(chip) => setEditInstruction((c) => appendEditChip(c, chip))} onSubmitEdit={submitEdit} onClose={() => setEditSourceTask(null)} /> : null}
      <CompareModal task={compareTask} sourceUrl={tasks.find((t) => t.id === compareTask?.sourceTaskId)?.imageUrl ?? ""} onClose={() => setCompareTask(null)} />
    </div></main>
  );
}
