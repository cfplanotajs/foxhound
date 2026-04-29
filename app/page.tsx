"use client";

import { useState } from "react";

type Preset = { id: string; name: string; version: string; description: string; defaultProvider: string; defaultModel: string };
type JobTask = {
  id: string;
  presetName: string;
  presetVersion: string;
  subjectPrompt: string;
  status: string;
  errorMessage: string | null;
  imageUrl: string | null;
};

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

  async function loadPresets() {
    const res = await fetch("/api/presets");
    const data = await res.json();
    if (!res.ok) return alert(data.error ?? "Failed to load presets");
    setPresets(data.presets);
    if (data.presets.length > 0 && !presetId) {
      setPresetId(data.presets[0].id);
      setModel(data.presets[0].defaultModel);
    }
  }

  async function submitJob() {
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
      await fetch("/api/jobs/process", { method: "POST" });
      await refreshJob(data.jobId);
      await refreshImages(data.jobId);
    } else {
      alert(data.error ?? "Failed to submit job");
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

  return (
    <main className="mx-auto max-w-6xl p-6">
      <h1 className="mb-4 text-2xl font-bold">Internal Image Generation Dashboard</h1>


      <button className="mb-4 rounded bg-slate-700 px-3 py-2 text-white" onClick={loadPresets}>Load Presets</button>

      <div className="grid gap-4 rounded bg-white p-4 shadow">
        <label className="grid gap-1">
          <span className="font-medium">Preset</span>
          <select value={presetId} onChange={(e) => setPresetId(e.target.value)} className="rounded border p-2">
            {presets.map((preset) => (
              <option key={preset.id} value={preset.id}>{preset.name} ({preset.version})</option>
            ))}
          </select>
        </label>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="grid gap-1"><span className="font-medium">Provider</span><select value={provider} onChange={(e) => setProvider(e.target.value)} className="rounded border p-2"><option value="openai">OpenAI</option></select></label>
          <label className="grid gap-1"><span className="font-medium">Model</span><input value={model} onChange={(e) => setModel(e.target.value)} className="rounded border p-2" /></label>
        </div>

        <label className="grid gap-1"><span className="font-medium">Single Prompt</span><textarea value={singlePrompt} onChange={(e) => setSinglePrompt(e.target.value)} className="min-h-24 rounded border p-2" /></label>
        <label className="grid gap-1"><span className="font-medium">Bulk Prompts (one per line)</span><textarea value={bulkPrompts} onChange={(e) => setBulkPrompts(e.target.value)} className="min-h-32 rounded border p-2" /></label>
        <label className="grid gap-1"><span className="font-medium">Production Constraints (optional)</span><textarea value={constraints} onChange={(e) => setConstraints(e.target.value)} className="min-h-20 rounded border p-2" /></label>

        <button disabled={loading} className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50" onClick={submitJob}>{loading ? "Generating..." : "Submit Job"}</button>
      </div>

      {jobId && (
        <section className="mt-6">
          <h2 className="text-xl font-semibold">Job: {jobId}</h2>
          <p>Status: {jobStatus}</p>
          <div className="mt-2 flex gap-2">
            <button className="rounded bg-slate-700 px-3 py-1 text-white" onClick={() => refreshJob()}>Refresh Status</button>
            <button className="rounded bg-slate-700 px-3 py-1 text-white" onClick={() => refreshImages()}>Refresh Gallery</button>
            <button className="rounded bg-green-700 px-3 py-1 text-white" onClick={downloadZip}>Download All as ZIP</button>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
            {tasks.map((task) => (
              <div key={task.id} className="rounded bg-white p-3 shadow">
                {task.imageUrl ? <img src={`${task.imageUrl}`} alt={task.subjectPrompt} className="mb-2 h-48 w-full rounded object-cover" /> : <div className="mb-2 flex h-48 items-center justify-center rounded bg-slate-200">No Image</div>}
                <p className="text-sm"><strong>Prompt:</strong> {task.subjectPrompt.slice(0, 80)}</p>
                <p className="text-sm"><strong>Preset:</strong> {task.presetName} ({task.presetVersion})</p>
                <p className="text-sm"><strong>Status:</strong> {task.status}</p>
                {task.errorMessage ? <p className="text-sm text-red-600">{task.errorMessage}</p> : null}
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
