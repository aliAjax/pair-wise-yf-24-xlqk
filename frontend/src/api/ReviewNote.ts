import { STORAGE_KEYS, readCollection, writeCollection, nextId } from "../utils/storage";
import { delay } from "./localDb";
import { LOG_TEMPLATES } from "../constants/logTemplates";
import type { ReviewNote } from "../types/ReviewNote";
import type { ReviewStatus } from "../constants/ReviewStatus";

function log(template: string, payload: unknown): void {
  console.info(`[ReviewNote] ${template}`, payload);
}

export async function listReviewNotes(): Promise<ReviewNote[]> {
  await delay();
  return readCollection<ReviewNote>(STORAGE_KEYS.notes);
}

export async function listNotesForDiffs(diffIds: number[]): Promise<ReviewNote[]> {
  await delay(60);
  const idSet = new Set(diffIds);
  return readCollection<ReviewNote>(STORAGE_KEYS.notes).filter((note) => idSet.has(note.diff_result_id));
}

/**
 * 段落改动后，把受影响差异上的审阅备注标记为待复核。
 * 备注原文（tag / comment / reviewer）完整保留，仅状态翻转为 PENDING_REVIEW。
 */
export async function markNotesPendingReview(diffResultIds: number[]): Promise<ReviewNote[]> {
  await delay(60);
  if (diffResultIds.length === 0) return [];
  const rows = readCollection<ReviewNote>(STORAGE_KEYS.notes);
  const idSet = new Set(diffResultIds);
  const touched: ReviewNote[] = [];
  const next = rows.map((note) => {
    if (!idSet.has(note.diff_result_id)) return note;
    const updated: ReviewNote = { ...note, status: "PENDING_REVIEW" };
    touched.push(updated);
    return updated;
  });
  writeCollection(STORAGE_KEYS.notes, next);
  log(LOG_TEMPLATES.ReviewNote[4], { diffResultIds, count: touched.length });
  return touched;
}

/** 直接把指定备注标记为待复核（单条） */
export async function markNotePendingReview(noteId: number): Promise<ReviewNote | undefined> {
  await delay(60);
  const rows = readCollection<ReviewNote>(STORAGE_KEYS.notes);
  const idx = rows.findIndex((note) => note.id === noteId);
  if (idx < 0) return undefined;
  const updated: ReviewNote = { ...rows[idx], status: "PENDING_REVIEW" };
  rows[idx] = updated;
  writeCollection(STORAGE_KEYS.notes, rows);
  log(LOG_TEMPLATES.ReviewNote[4], { noteId });
  return updated;
}

export async function updateReviewNoteStatus(noteId: number, status: ReviewStatus): Promise<ReviewNote | undefined> {
  await delay(60);
  const rows = readCollection<ReviewNote>(STORAGE_KEYS.notes);
  const idx = rows.findIndex((note) => note.id === noteId);
  if (idx < 0) return undefined;
  const updated: ReviewNote = { ...rows[idx], status };
  rows[idx] = updated;
  writeCollection(STORAGE_KEYS.notes, rows);
  log(LOG_TEMPLATES.ReviewNote[1], { noteId, status });
  return updated;
}

export async function addReviewNote(note: Omit<ReviewNote, "id">): Promise<ReviewNote> {
  await delay(60);
  const rows = readCollection<ReviewNote>(STORAGE_KEYS.notes);
  const created: ReviewNote = { ...note, id: nextId(rows) };
  rows.push(created);
  writeCollection(STORAGE_KEYS.notes, rows);
  log(LOG_TEMPLATES.ReviewNote[0], { id: created.id });
  return created;
}
