import { buttonSecondary, card, helperText, sectionHeader } from "./ui";
import { AssetImage } from "./AssetImage";

type CompareTask = { sourceTaskId?: string | null; imageUrl: string | null; editInstruction?: string | null };

export function CompareModal({ task, sourceUrl, onClose }: { task: CompareTask | null; sourceUrl: string; onClose: () => void }) {
  if (!task?.sourceTaskId) return null;
  const snippet = (task.editInstruction ?? "No edit instruction recorded.").slice(0, 140);

  return (
    <section className="fixed inset-0 z-20 bg-slate-900/60 p-4 md:p-6">
      <div className={`mx-auto max-w-5xl md:p-5 ${card} shadow-2xl`}>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className={sectionHeader}>Compare Edit</h3>
          <button className={buttonSecondary} onClick={onClose}>Close</button>
        </div>
        <p className={`mb-3 rounded-lg bg-slate-50 px-3 py-2 ${helperText}`}><span className="font-medium">Instruction:</span> {snippet}</p>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-600">Original</p>
            <div className="relative h-72 w-full overflow-hidden rounded-xl border border-slate-200"><AssetImage src={sourceUrl} alt="original" fill className="object-cover" sizes="(min-width: 768px) 50vw, 100vw" /></div>
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-600">Edited result</p>
            <div className="relative h-72 w-full overflow-hidden rounded-xl border border-slate-200"><AssetImage src={task.imageUrl ?? ""} alt="edited result" fill className="object-cover" sizes="(min-width: 768px) 50vw, 100vw" /></div>
          </div>
        </div>
      </div>
    </section>
  );
}
