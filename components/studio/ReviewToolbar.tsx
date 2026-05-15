import { buttonSecondary, buttonStrongSecondary } from "./ui";

export function ReviewToolbar({ reviewFilter, setReviewFilter, reviewError }: { reviewFilter: "all"|"favorite"|"approved"|"rejected"; setReviewFilter: (v: "all"|"favorite"|"approved"|"rejected") => void; reviewError: string }) {
  return (
    <>
      <p className="mt-2 text-xs text-slate-600">Approved = ready to use · Favorite = promising · Rejected = not useful</p>
      <p className="mt-1 text-xs text-slate-500">Approve completed images, then download only the approved assets.</p>
      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        {(["all", "favorite", "approved", "rejected"] as const).map((f) => (
          <button key={f} className={reviewFilter === f ? `${buttonStrongSecondary} rounded-full px-3 py-1.5 text-xs` : `${buttonSecondary} rounded-full px-3 py-1.5 text-xs`} onClick={() => setReviewFilter(f)}>
            {f === "all" ? "All" : f === "favorite" ? "Favorites" : f === "approved" ? "Approved" : "Rejected"}
          </button>
        ))}
      </div>
      {reviewError ? <p className="mt-2 rounded-lg border border-rose-200 bg-rose-50 p-2 text-sm text-rose-700">{reviewError}</p> : null}
    </>
  );
}
