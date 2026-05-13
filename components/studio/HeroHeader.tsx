import { softCard } from "./ui";

export function HeroHeader({ provider, showManager, onToggleManager }: { provider: string; showManager: boolean; onToggleManager: () => void }) {
  const strip = [
    { label: "1) Choose preset", active: true },
    { label: "2) Generate", active: true },
    { label: "3) Edit", active: true },
    { label: "4) Review", active: true },
    { label: "5) Export", active: true }
  ];

  return <header className={softCard}><h1 className="text-3xl font-bold text-slate-900">Foxhound Studio Console</h1><p className="mt-2 text-slate-600">Create, edit, review, and export studio-ready AI visuals.</p><div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold"><span className={`rounded-full px-3 py-1 ${provider === "mock" ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-500"}`}>Demo Mode</span><span className={`rounded-full px-3 py-1 ${provider === "openai" ? "bg-violet-100 text-violet-700" : "bg-slate-100 text-slate-500"}`}>OpenAI</span><span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-700">Worker Queue</span></div><div className="mt-4"><p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Guided demo flow</p><div className="grid grid-cols-2 gap-2 text-sm md:grid-cols-5">{strip.map((step) => <div key={step.label} className={`rounded-xl px-3 py-2 ${step.active ? "bg-blue-50 text-blue-800" : "bg-slate-100 text-slate-600"}`}>{step.label}</div>)}</div></div><div className="mt-4"><button className="rounded-xl bg-slate-800 px-4 py-2 text-white" onClick={onToggleManager}>{showManager ? "Hide Preset Manager" : "Manage Presets"}</button></div></header>;
}
