"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getDefaultQualityForModel, getQualityOptionsForModel, normalizeQualityForModel } from "@/lib/providers/model-quality";
import { splitTemplatePrompts } from "@/lib/jobs/template-prompts";
import { applyJobTemplateToFormState, PRESET_DEFAULT_ASPECT_RATIO } from "@/lib/jobs/template-form";
import { appendEditChip, buildEditRequestPayload, canEditTask } from "@/lib/jobs/edit-ui";
import { filterTasksByReview, getReviewStatusLabel, ReviewStatus } from "@/lib/review-ui";
import { HeroHeader } from "@/components/studio/HeroHeader";
import { ReviewToolbar } from "@/components/studio/ReviewToolbar";
import { CompareModal } from "@/components/studio/CompareModal";
import { GalleryGrid } from "@/components/studio/GalleryGrid";
import { EditPanel } from "@/components/studio/EditPanel";
import { RecentJobsPanel } from "@/components/studio/RecentJobsPanel";
import { GenerationControls } from "@/components/studio/GenerationControls";
import { PromptComposer } from "@/components/studio/PromptComposer";
import { PresetManagerPanel } from "@/components/studio/PresetManagerPanel";
import { getStudioWorkflow } from "@/lib/studio-workflow";
import { getChecklistItemTone } from "@/components/studio/ui-helpers";
import { SelectedAssetPanel } from "@/components/studio/SelectedAssetPanel";

type Preset = { id: string; name: string; version: string; description: string; defaultProvider: string; defaultModel: string; defaultParams?: Record<string, unknown>; samplePrompt?: string | null; bestUseLabel?: string | null };
type ManagerPreset = { stableKey: string; name: string; version: string; isArchived: boolean; bestUseLabel?: string | null; defaultProvider?: string; defaultModel?: string };
import type { StudioTask as JobTask } from "@/components/studio/types";
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

function getFriendlyPrimaryError(message: string, provider: string) {
  const lower = message.toLowerCase();
  if (provider === "openai" && (lower.includes("openai_api_key") || lower.includes("api key") || lower.includes("openai"))) {
    return "OpenAI setup is needed. Use Demo Mode for now.";
  }
  return message;
}

export default function DashboardPage() {
  // state declarations
  const [presets, setPresets] = useState<Preset[]>([]);
  const [presetId, setPresetId] = useState("");
  const [singlePrompt, setSinglePrompt] = useState("");
  const [bulkPrompts, setBulkPrompts] = useState("");
  const [constraints, setConstraints] = useState("");
  const [provider, setProvider] = useState("openai");
  const [model, setModel] = useState("gpt-image-2");
  const [aspectRatio, setAspectRatio] = useState("1:1");
  const [aspectRatioSelection, setAspectRatioSelection] = useState(PRESET_DEFAULT_ASPECT_RATIO);
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
  const [compareOpened, setCompareOpened] = useState(false);
  const [showNextTip, setShowNextTip] = useState(true);
  const [showChecklistTip, setShowChecklistTip] = useState(true);
  const [showGalleryTip, setShowGalleryTip] = useState(true);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  // derived state
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

  useEffect(() => {
    if (selectedTaskId) return;
    const firstCompleted = tasks.find((task) => task.status === "completed");
    if (firstCompleted) setSelectedTaskId(firstCompleted.id);
  }, [tasks, selectedTaskId]);

  // generate/edit submit handlers
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
      setError(getFriendlyPrimaryError(data.error ?? "Failed to submit job", provider));
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
  // review/download/compare handlers
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
  // duplicate/rerun/preset/project handlers
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
    setAspectRatioSelection(appliedTemplate.aspectRatioSelection);
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

  // derived state
  const filteredTasks = filterTasksByReview(tasks, reviewFilter);
  const counts = {
    complete: tasks.filter((t) => t.status === "completed").length,
    failed: tasks.filter((t) => t.status === "failed").length,
    queued: tasks.filter((t) => t.status === "queued" || t.status === "processing").length
  };


  const workflow = getStudioWorkflow({ presetId, singlePrompt, bulkPrompts, jobId, tasks, compareOpened });
  const selectedTask = tasks.find((task) => task.id === selectedTaskId) ?? null;
  const selectedSourceTask = tasks.find((task) => task.id === selectedTask?.sourceTaskId) ?? null;
  const nextActionTip = selectedTask
    ? selectedTask.mode === "edit"
      ? "Compare it with the original, then approve the best result."
      : "Edit this image or approve it."
    : counts.complete > 0
      ? "Select your best image."
      : workflow.nextActionHint;

  // local render helpers
  function renderShowTipsButton() {
    if (showNextTip || showChecklistTip || showGalleryTip) return null;
    return (
      <div className="-mt-3">
        <button className="rounded-lg border border-slate-300 bg-white px-3 py-1 text-xs text-slate-600" onClick={() => { setShowNextTip(true); setShowChecklistTip(true); setShowGalleryTip(true); }}>
          Show tips
        </button>
      </div>
    );
  }

  function renderNextActionCard() {
    if (!showNextTip) return null;
    return (
      <section className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Next Best Action</p>
          <button className="rounded-lg border border-blue-200 bg-white px-2 py-1 text-xs text-blue-700" onClick={() => setShowNextTip(false)}>Dismiss</button>
        </div>
        <p className="mt-1 text-sm font-semibold text-blue-900">Next up: {workflow.nextAction}</p>
        <p className="mt-1 text-sm text-blue-800">{workflow.helper}</p>
        <p className="mt-2 text-xs font-medium text-blue-700">Try this: {nextActionTip}</p>
        {workflow.isProcessing ? <p className="mt-1 text-xs text-blue-700">If this takes too long, make sure the worker is running.</p> : null}
        {workflow.successMessage ? <p className="mt-1 text-xs text-emerald-700">{workflow.successMessage}</p> : null}
      </section>
    );
  }

  function renderDownloadActions() {
    return (
      <div className={`flex flex-wrap gap-2 ${workflow.focusKey === "export" ? "rounded-xl ring-1 ring-emerald-200 p-1" : ""}`}>
        <button className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700" onClick={() => refreshJob()}>Refresh Status</button>
        <button className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700" onClick={() => refreshImages()}>Refresh Gallery</button>
        <button className="rounded-xl bg-emerald-700 px-3 py-2 text-sm font-semibold text-white" onClick={downloadZip}>Download ZIP</button>
        <button className="rounded-xl bg-emerald-900 px-3 py-2 text-sm font-semibold text-white" onClick={downloadApprovedZip}>Download Approved</button>
      </div>
    );
  }

  function renderChecklistSection() {
    if (!showChecklistTip) return null;
    const checklistItems: Array<[string, boolean]> = [
      ["Generate variations", workflow.checklist.generated],
      ["Edit one result", workflow.checklist.edited],
      ["Compare original and edited", workflow.checklist.compared],
      ["Approve one image", workflow.checklist.approved],
      ["Download Approved", workflow.checklist.exported]
    ];
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Demo Checklist</p>
          <button className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-600" onClick={() => setShowChecklistTip(false)}>Dismiss</button>
        </div>
        <div className="mt-2 grid gap-1 text-sm">
          {checklistItems.map(([label, done], idx) => {
            const tone = getChecklistItemTone(done, !done && idx === 1 && !workflow.checklist.edited);
            return (
              <p key={label} className={tone === "done" ? "rounded-md bg-emerald-50 px-2 py-1 font-medium text-emerald-700" : tone === "active" ? "rounded-md bg-blue-50 px-2 py-1 text-blue-700" : "px-2 py-1 text-slate-500"}>
                {done ? "✓" : "○"} {label}
              </p>
            );
          })}
        </div>
      </section>
    );
  }

  const heroHeaderProps = {
    provider,
    showManager,
    onToggleManager: () => setShowManager((v) => !v),
    steps: workflow.steps.map((s) => ({ label: s.label, state: s.state })),
    nextAction: workflow.nextAction
  };

  const generationControlsProps = {
    presetId,
    setPresetId,
    presets,
    selectedPreset,
    provider,
    setProvider,
    model,
    setModel,
    aspectRatio,
    setAspectRatio,
    setAspectRatioTouched,
    variationCount,
    setVariationCount,
    quality,
    setQuality,
    aspectRatioSelection,
    setAspectRatioSelection,
    projectId,
    setProjectId,
    folderId,
    setFolderId,
    projects
  };

  const promptComposerProps = {
    presets,
    setPresetId,
    setSinglePrompt,
    error,
    singlePrompt,
    setSinglePromptValue: setSinglePrompt,
    bulkPrompts,
    setBulkPrompts,
    constraints,
    setConstraints,
    loading,
    formValid,
    submitJob
  };

  const presetManagerPanelProps = {
    managerName,
    setManagerName,
    managerPrompt,
    setManagerPrompt,
    createPresetFromManager,
    managerError,
    managerLoading,
    managerPresets,
    setPresetArchived
  };

  const openCompare = (task: JobTask) => {
    setCompareTask(task);
    setCompareOpened(true);
  };

  const galleryGridProps = {
    filteredTasks,
    tasks,
    reviewUpdatingId,
    setEditSourceTask,
    setEditInstruction,
    setEditConstraints,
    setCompareTask: openCompare,
    updateReview,
    statusChip,
    selectedTaskId,
    onSelectTask: (task: JobTask) => setSelectedTaskId(task.id)
  };

  const selectedAssetPanelProps = {
    task: selectedTask,
    sourceTask: selectedSourceTask,
    reviewUpdatingId,
    setEditSourceTask,
    setEditInstruction,
    setEditConstraints,
    setCompareTask: openCompare,
    updateReview
  };

  const recentJobsPanelProps = {
    recentJobs,
    toast,
    jobId,
    rowLoadingId,
    statusChip,
    onOpen: async (targetId: string) => {
      setJobId(targetId);
      await refreshJob(targetId);
      await refreshImages(targetId);
    },
    onDuplicate: duplicateJobIntoForm,
    onRerun: rerunJobFromRow
  };

  const editPanelProps = editSourceTask ? {
    editSourceTask,
    provider,
    editInstruction,
    editConstraints,
    editSubmitting,
    onEditInstructionChange: setEditInstruction,
    onEditConstraintsChange: setEditConstraints,
    onAppendChip: (chip: string) => setEditInstruction((c) => appendEditChip(c, chip)),
    onSubmitEdit: submitEdit,
    onClose: () => setEditSourceTask(null)
  } : null;

  const compareModalProps = {
    task: compareTask,
    sourceUrl: tasks.find((t) => t.id === compareTask?.sourceTaskId)?.imageUrl ?? "",
    onClose: () => setCompareTask(null)
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-100 via-zinc-50 to-white">
      <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-6">
        <HeroHeader {...heroHeaderProps} />
        {renderShowTipsButton()}

        <section className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div className="space-y-6">
            <section className={`grid gap-6 lg:grid-cols-2 ${workflow.focusKey === "generate" ? "rounded-2xl ring-1 ring-blue-200 p-2" : ""}`}>
              <GenerationControls {...generationControlsProps} />
              <PromptComposer {...promptComposerProps} />
            </section>

            {renderNextActionCard()}
            {showManager ? <PresetManagerPanel {...presetManagerPanelProps} /> : null}

            {jobId && (
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold">Gallery & Review</h2>
                    <p className="text-sm text-slate-600">Run ID: {jobId}</p>
                    <p className="text-sm text-slate-600">Run status: {jobStatus}</p>
                    <p className="text-sm text-slate-600">Complete: {counts.complete} · Failed: {counts.failed} · In progress: {counts.queued}</p>
                    {workflow.isProcessing ? <p className="text-sm text-indigo-700">Worker is creating your images…</p> : null}
                    {workflow.hasEdited && workflow.approvedCount === 0 ? <p className="text-sm text-slate-600">Compare edited results, then approve one final image.</p> : null}
                    {showGalleryTip ? <><div className="mt-1"><button className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs text-slate-600" onClick={() => setShowGalleryTip(false)}>Hide tips</button></div>{workflow.approvedCount === 0 ? <p className="text-sm text-slate-600">Approve one completed image to download approved assets.</p> : <p className="text-sm text-emerald-700">Finish step unlocked: Approved ZIP is ready to download.</p>}</> : null}
                  </div>
                  {renderDownloadActions()}
                </div>
                <div className={workflow.focusKey === "review" ? "rounded-xl ring-1 ring-indigo-200 p-2" : ""}><ReviewToolbar reviewFilter={reviewFilter} setReviewFilter={setReviewFilter} reviewError={reviewError} /></div>
                <div className="mt-3 grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]"><GalleryGrid {...galleryGridProps} /><SelectedAssetPanel {...selectedAssetPanelProps} /></div>
              </section>
            )}
          </div>

          <aside className="space-y-6">
            {renderChecklistSection()}
            <RecentJobsPanel {...recentJobsPanelProps} />
          </aside>
        </section>

        {editPanelProps ? <EditPanel {...editPanelProps} /> : null}
        <CompareModal {...compareModalProps} />
      </div>
    </main>
  );
}
