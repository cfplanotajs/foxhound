export type ReviewStatus = "unreviewed" | "favorite" | "approved" | "rejected";

export function getReviewStatusLabel(status?: string | null): string {
  if (status === "favorite") return "Favorite";
  if (status === "approved") return "Approved";
  if (status === "rejected") return "Rejected";
  return "Unreviewed";
}

export function filterTasksByReview<T extends { reviewStatus?: string | null }>(tasks: T[], filter: "all" | "favorite" | "approved" | "rejected"): T[] {
  if (filter === "all") return tasks;
  return tasks.filter((task) => task.reviewStatus === filter);
}
