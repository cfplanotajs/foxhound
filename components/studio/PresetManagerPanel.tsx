import { buttonPrimary, buttonSubtle, card, emptyState, errorSurface, fieldLabel, helperText, inputBase, sectionHeader, textAreaBase } from "./ui";

type ManagerPreset = {
  stableKey: string;
  name: string;
  version: string;
  isArchived: boolean;
  bestUseLabel?: string | null;
  defaultProvider?: string;
  defaultModel?: string;
};

type PresetManagerPanelProps = {
  managerName: string;
  setManagerName: (v: string) => void;
  managerPrompt: string;
  setManagerPrompt: (v: string) => void;
  createPresetFromManager: () => void;
  managerError: string;
  managerLoading: boolean;
  managerPresets: { active: ManagerPreset[]; archived: ManagerPreset[] };
  setPresetArchived: (stableKey: string, isArchived: boolean) => void;
};

function PresetCard({ preset, onArchiveToggle }: { preset: ManagerPreset; onArchiveToggle: (stableKey: string, nextArchived: boolean) => void }) {
  const isArchived = preset.isArchived;
  return (
    <div className={`rounded-xl border p-3 text-sm ${isArchived ? "border-slate-200 bg-slate-50" : "border-slate-300 bg-white"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="font-medium text-slate-900">{preset.name} <span className="text-slate-500">({preset.version})</span></p>
          <p className="text-xs text-slate-600">Best use: {preset.bestUseLabel || "General"}</p>
          <p className="text-xs text-slate-600">Model: {preset.defaultProvider || "unknown"} / {preset.defaultModel || "unknown"}</p>
          <p className="text-xs text-slate-500">Status: {isArchived ? "Archived" : "Active"}</p>
        </div>
        <button
          type="button"
          className={buttonSubtle}
          onClick={() => onArchiveToggle(preset.stableKey, !isArchived)}
        >
          {isArchived ? "Unarchive" : "Archive"}
        </button>
      </div>
    </div>
  );
}

export function PresetManagerPanel({ managerName, setManagerName, managerPrompt, setManagerPrompt, createPresetFromManager, managerError, managerLoading, managerPresets, setPresetArchived }: PresetManagerPanelProps) {
  return (
    <section className={card}>
      <h2 className={sectionHeader}>Preset Manager</h2>
      <p className={helperText}>Presets keep styles consistent across projects. Editing a preset creates a new version.</p>

      <div className="mt-4 grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <label className="grid gap-1 text-sm">
          <span className="font-medium text-slate-800">Preset name</span>
          <input value={managerName} onChange={(e) => setManagerName(e.target.value)} placeholder="e.g. Product Hero Lighting" className={inputBase} />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-medium text-slate-800">Style prompt</span>
          <textarea value={managerPrompt} onChange={(e) => setManagerPrompt(e.target.value)} placeholder="Describe the reusable style instructions" className={`min-h-24 ${textAreaBase}`} />
        </label>
        <div>
          <button type="button" className={buttonPrimary} onClick={createPresetFromManager}>Create Preset</button>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {managerError ? <p className={errorSurface}>{managerError}</p> : null}

        <div>
          <h3 className="font-medium text-slate-900">Active Presets</h3>
          {managerLoading ? <p className="mt-2 text-sm text-slate-500">Loading presets...</p> : null}
          {!managerLoading && managerPresets.active.length === 0 ? <p className={emptyState}>No active presets yet. Create one to start standardizing styles.</p> : null}
          <div className="mt-2 grid gap-2">{managerPresets.active.map((p) => <PresetCard key={p.stableKey} preset={p} onArchiveToggle={setPresetArchived} />)}</div>
        </div>

        <details className="mt-3">
          <summary className="cursor-pointer text-sm font-medium text-slate-600">Archived presets</summary>
          {!managerLoading && managerPresets.archived.length === 0 ? <p className={emptyState}>No archived presets.</p> : null}
          <div className="mt-2 grid gap-2">{managerPresets.archived.map((p) => <PresetCard key={p.stableKey} preset={p} onArchiveToggle={setPresetArchived} />)}</div>
        </details>
      </div>
    </section>
  );
}
