import type { ReviewNote } from "../types/ReviewNote";

export const createDefaultReviewNote = (overrides: Partial<ReviewNote> = {}): ReviewNote => ({
  id: 0,
  diff_result_id: 0,
  tag: "",
  comment: "",
  reviewer: "",
  status: "OPEN",
  ...overrides
});

export const createReviewNoteForm = createDefaultReviewNote;
export const createReviewNoteResponse = createDefaultReviewNote;
