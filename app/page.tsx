"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Preset = { id: string; name: string; version: string; description: string; defaultProvider: string; defaultModel: string; defaultParams?: Record<string, unknown> };
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
  responseMetadataJson?: string | null;
  imageUrl: string | null;
};

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
  const [jobId, setJobId] = useState("");
  const [jobStatus, setJobStatus] = useState("");
  const [tasks, setTasks] = useState<JobTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
  }, [loadPresets]);

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
      body: JSON.stringify({ presetId, provider, model, singlePrompt, bulkPrompts, constraints, idempotencyKey })
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

  const counts = {
    complete: tasks.filter((t) => t.status === "completed").length,
    failed: tasks.filter((t) => t.status === "failed").length,
    queued: tasks.filter((t) => t.status === "queued" || t.status === "processing").length
  };

  return (
    <main className="mx-auto max-w-7xl space-y-6 p-6">
      <header className="rounded-2xl bg-white p-6 shadow-sm">
        <h1 className="text-3xl font-bold text-slate-900">Studio Image Console</h1>
        <p className="mt-2 text-slate-600">Generate consistent visual assets from reusable studio presets.</p>
        <div className="mt-4 grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
          {["Select Preset", "Write Prompt", "Worker Generates", "Review & Download"].map((step) => (
            <div key={step} className="rounded-lg bg-slate-100 px-3 py-2 text-slate-700">{step}</div>
          ))}
        </div>
      </header>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl bg-white p-5 shadow-sm">
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
            <label className="grid gap-1 text-sm"><span className="font-medium">Provider</span><select value={provider} onChange={(e) => setProvider(e.target.value)} className="rounded border p-2"><option value="mock">Demo Mode (Mock)</option><option value="openai">OpenAI</option></select></label>
            <label className="grid gap-1 text-sm"><span className="font-medium">Model</span><input value={model} onChange={(e) => setModel(e.target.value)} className="rounded border p-2" /></label>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-lg font-semibold">Prompt</h2>
          {error ? <p className="mb-2 rounded bg-rose-100 p-2 text-sm text-rose-700">{error}</p> : null}
          <label className="grid gap-1 text-sm"><span className="font-medium">Single Prompt</span><textarea value={singlePrompt} onChange={(e) => setSinglePrompt(e.target.value)} className="min-h-20 rounded border p-2" /></label>
          <label className="mt-2 grid gap-1 text-sm"><span className="font-medium">Bulk Prompts (one per line)</span><textarea value={bulkPrompts} onChange={(e) => setBulkPrompts(e.target.value)} className="min-h-24 rounded border p-2" /></label>
          <label className="mt-2 grid gap-1 text-sm"><span className="font-medium">Production Constraints (optional)</span><textarea value={constraints} onChange={(e) => setConstraints(e.target.value)} className="min-h-16 rounded border p-2" /></label>
          <p className="mt-2 text-xs text-slate-500">Submit is enabled when preset, provider, model, and at least one prompt line are present.</p>
          <button disabled={loading || !formValid} className="mt-3 rounded bg-blue-600 px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-50" onClick={submitJob}>{loading ? "Submitting..." : "Submit Job"}</button>
        </div>
      </section>

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
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
            {tasks.map((task) => {
              const providerError = task.responseMetadataJson ? (() => {
                try { return JSON.parse(task.responseMetadataJson).providerError; } catch { return null; }
              })() : null;

              return (
                <div key={task.id} className="rounded-xl border bg-white p-3 shadow-sm">
                  {task.imageUrl ? (
                    <img src={task.imageUrl} alt={task.subjectPrompt} className="mb-2 h-48 w-full rounded object-cover" />
                  ) : (
                    <div className="mb-2 flex h-48 items-center justify-center rounded bg-slate-100 text-slate-500">No Image Yet</div>
                  )}
                  <div className="mb-2">{statusChip(task.status)}</div>
                  <p className="text-sm"><strong>Prompt:</strong> {task.subjectPrompt.slice(0, 96)}</p>
                  <p className="text-sm"><strong>Preset:</strong> {task.presetName} ({task.presetVersion})</p>
                  <p className="text-sm"><strong>Provider/Model:</strong> {task.provider} / {task.model}</p>{task.provider === "mock" ? <p className="text-xs font-semibold text-emerald-700">Demo/Mock Output</p> : null}

                  {task.status === "failed" ? (
                    <div className="mt-2 rounded-lg border border-rose-200 bg-rose-50 p-2 text-sm">
                      <p className="font-semibold text-rose-800">{providerError?.title ?? task.errorMessage ?? "Image generation failed"}</p>
                      <p className="text-rose-700">{providerError?.designerMessage ?? "Please check technical details and retry."}</p>
                      <details className="mt-1 text-xs text-rose-900">
                        <summary>Technical details</summary>
                        <p>{providerError?.technicalMessage ?? task.lastError ?? task.errorMessage}</p>
                      </details>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>
      )}
    </main>
  );
}
