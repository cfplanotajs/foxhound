import { buttonPrimary, card, chipSoft, errorSurface, fieldLabel, helperText, sectionHeader, subtleText, textAreaBase } from "./ui";

type Preset = { id: string; name: string; samplePrompt?: string | null };

type Props = { presets: Preset[]; setPresetId: (id: string) => void; setSinglePrompt: (value: string) => void; error: string; singlePrompt: string; setSinglePromptValue: (value: string) => void; bulkPrompts: string; setBulkPrompts: (value: string) => void; constraints: string; setConstraints: (value: string) => void; loading: boolean; formValid: boolean; submitJob: () => void };

export function PromptComposer({ presets, setPresetId, setSinglePrompt, error, singlePrompt, setSinglePromptValue, bulkPrompts, setBulkPrompts, constraints, setConstraints, loading, formValid, submitJob }: Props) {
  return (
    <div className={card}>
      <h2 className={sectionHeader}>2) Write Prompt</h2>
      <div className="mt-2 rounded-xl border border-blue-200 bg-blue-50 p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Start here</p>
        <p className="mt-1 text-sm text-blue-900">Start with a preset prompt, then generate a few variations.</p>
      </div>
      <p className={`mt-3 ${helperText}`}>Describe the image or paste multiple prompts (one per line).</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {presets.map((p) => (
          <button key={p.id} type="button" className={`${chipSoft} text-left`} onClick={() => { setPresetId(p.id); if (p.samplePrompt) setSinglePrompt(p.samplePrompt); }}>
            <span className="block text-xs font-semibold text-slate-800">{p.name}</span>
            <span className="block text-[11px] text-slate-600">{p.samplePrompt ? "Use starter prompt" : "Set as active preset"}</span>
          </button>
        ))}
      </div>
      {error ? <p role="alert" className={`mt-3 ${errorSurface}`}>{error}</p> : null}
      <label className="mt-3 grid gap-1"><span className={fieldLabel}>Single Prompt</span><textarea value={singlePrompt} onChange={(e) => setSinglePromptValue(e.target.value)} className={`min-h-28 ${textAreaBase}`} placeholder="Describe subject, composition, style, and lighting..." /></label>
      <label className="mt-2 grid gap-1"><span className={fieldLabel}>Bulk Prompts (one per line)</span><textarea value={bulkPrompts} onChange={(e) => setBulkPrompts(e.target.value)} className={`min-h-24 ${textAreaBase}`} /></label>
      <label className="mt-2 grid gap-1"><span className={fieldLabel}>Production Constraints (optional)</span><textarea value={constraints} onChange={(e) => setConstraints(e.target.value)} className={`min-h-16 ${textAreaBase}`} /></label>
      <p className={`mt-2 ${subtleText}`}>Submit is enabled when preset, provider, model, and at least one prompt line are present.</p>
      <button disabled={loading || !formValid} aria-busy={loading} className={`mt-3 ${buttonPrimary}`} onClick={submitJob}>{loading ? "Generating..." : "Generate Images"}</button>
    </div>
  );
}
