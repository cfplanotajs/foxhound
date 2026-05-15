import { useEffect, useRef } from "react";
import { buttonSecondary, card, helperText, sectionHeader } from "./ui";
import { AssetImage } from "./AssetImage";

type CompareTask = { sourceTaskId?: string | null; imageUrl: string | null; editInstruction?: string | null };

export function CompareModal({ task, sourceUrl, onClose }: { task: CompareTask | null; sourceUrl: string; onClose: () => void }) {
  const isOpen = Boolean(task?.sourceTaskId);
  const snippet = (task?.editInstruction ?? "No edit instruction recorded.").slice(0, 140);
  const triggerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    triggerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      if (triggerRef.current && document.contains(triggerRef.current)) triggerRef.current.focus();
    };
  }, [isOpen, onClose]);

  if (!task?.sourceTaskId) return null;

  return (
    <section className="fixed inset-0 z-20 bg-slate-900/60 p-4 md:p-6">
      <div role="dialog" aria-modal="true" aria-labelledby="compare-modal-title" className={`mx-auto max-w-5xl md:p-5 ${card} shadow-2xl`}>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 id="compare-modal-title" className={sectionHeader}>Compare</h3>
          <button className={buttonSecondary} onClick={onClose} aria-label="Close compare dialog">Close</button>
        </div>
        <p className={`mb-3 rounded-lg bg-slate-50 px-3 py-2 ${helperText}`}><span className="font-medium">Instruction:</span> {snippet}</p>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-600">Original</p>
            <div className="relative h-72 w-full overflow-hidden rounded-xl border border-slate-200"><AssetImage src={sourceUrl} alt="Original image" fill className="object-cover" sizes="(min-width: 768px) 50vw, 100vw" /></div>
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-600">Edited result</p>
            <div className="relative h-72 w-full overflow-hidden rounded-xl border border-slate-200"><AssetImage src={task.imageUrl ?? ""} alt="Edited result image" fill className="object-cover" sizes="(min-width: 768px) 50vw, 100vw" /></div>
          </div>
        </div>
      </div>
    </section>
  );
}
