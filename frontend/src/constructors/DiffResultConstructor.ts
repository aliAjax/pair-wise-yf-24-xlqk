import type { DiffResult } from "../types/DiffResult";

const nowIso = () => new Date().toISOString();

export const createDefaultDiffResult = (overrides: Partial<DiffResult> = {}): DiffResult => ({
  id: 0,
  old_document_id: 0,
  new_document_id: 0,
  section_id: 0,
  diff_type: "UNCHANGED",
  summary: "",
  created_at: nowIso(),
  stable_key: "",
  source_section_content: "",
  recomputed_at: "",
  revision: 1,
  ...overrides
});

export const createDiffResultForm = createDefaultDiffResult;
export const createDiffResultResponse = createDefaultDiffResult;
