import test from "node:test";
import assert from "node:assert/strict";
import { filterTasksByReview, getReviewStatusLabel } from "../lib/review-ui.ts";

test("review filter helper returns matching cards", () => {
  const tasks = [
    { id: "1", reviewStatus: "favorite" },
    { id: "2", reviewStatus: "approved" },
    { id: "3", reviewStatus: "rejected" },
    { id: "4", reviewStatus: "unreviewed" }
  ];
  assert.equal(filterTasksByReview(tasks, "all").length, 4);
  assert.equal(filterTasksByReview(tasks, "favorite").length, 1);
  assert.equal(filterTasksByReview(tasks, "approved").length, 1);
  assert.equal(filterTasksByReview(tasks, "rejected").length, 1);
});

test("review status label mapping works", () => {
  assert.equal(getReviewStatusLabel("favorite"), "Favorite");
  assert.equal(getReviewStatusLabel("approved"), "Approved");
  assert.equal(getReviewStatusLabel("rejected"), "Rejected");
  assert.equal(getReviewStatusLabel("unreviewed"), "Unreviewed");
  assert.equal(getReviewStatusLabel(null), "Unreviewed");
});
