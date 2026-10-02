import type { ReviewNote } from "../types/ReviewNote";

export const createDefaultReviewNote = (overrides: Partial<ReviewNote> = {}): ReviewNote => ({
  id: 0,
  diff_result_id: 0,
  tag: "",
  comment: "",
  reviewer: "",
  status: "OPEN",
  original_comment: "",
  recheck_at: "",
  ...overrides
});

/** 段落改动后把旧备注转成待复核：保留原文，只改状态与复核时间 */
export const createRecheckReviewNote = (note: ReviewNote, recheckAt = new Date().toISOString()): ReviewNote => ({
  ...note,
  // 备注原文始终保留第一次审阅内容；若历史数据没有原文则用当前评论文本兜底
  original_comment: note.original_comment || note.comment,
  comment: note.original_comment || note.comment,
  status: "RECHECK",
  recheck_at: recheckAt
});

export const createReviewNoteForm = createDefaultReviewNote;
export const createReviewNoteResponse = createDefaultReviewNote;
