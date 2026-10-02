import type { DiffResult } from "../types/DiffResult";

export const createDefaultDiffResult = (overrides: Partial<DiffResult> = {}): DiffResult => ({
  id: 0,
  old_document_id: 0,
  new_document_id: 0,
  section_id: 0,
  diff_type: "UNCHANGED",
  summary: "",
  created_at: new Date().toISOString(),
  ...overrides
});

export const createDiffResultForm = createDefaultDiffResult;
export const createDiffResultResponse = createDefaultDiffResult;
