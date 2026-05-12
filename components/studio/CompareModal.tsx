type CompareTask = { sourceTaskId?: string | null; imageUrl: string | null; editInstruction?: string | null };

export function CompareModal({ task, sourceUrl, onClose }: { task: CompareTask | null; sourceUrl: string; onClose: () => void }) {
  if (!task?.sourceTaskId) return null;
  return <section className="fixed inset-0 z-20 bg-slate-900/60 p-6"><div className="mx-auto max-w-5xl rounded-2xl bg-white p-4 shadow-2xl"><div className="mb-3 flex items-center justify-between"><h3 className="text-lg font-semibold">Compare: Source vs Edit</h3><button className="rounded border px-3 py-1" onClick={onClose}>Close</button></div><p className="mb-3 text-sm text-slate-600">{task.editInstruction ?? "Edited result comparison"}</p><div className="grid gap-4 md:grid-cols-2"><img src={sourceUrl} alt="source compare" className="h-72 w-full rounded-xl border object-cover" /><img src={task.imageUrl ?? ""} alt="edited compare" className="h-72 w-full rounded-xl border object-cover" /></div></div></section>;
}
