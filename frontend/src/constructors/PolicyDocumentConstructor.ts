import type { PolicyDocument } from "../types/PolicyDocument";

const nowIso = () => new Date().toISOString();

export const createDefaultPolicyDocument = (overrides: Partial<PolicyDocument> = {}): PolicyDocument => ({
  id: 0,
  title: "",
  version_label: "",
  raw_text: "",
  normalized_sections: "",
  imported_at: nowIso(),
  updated_at: nowIso(),
  revision: 1,
  ...overrides
});

export const createPolicyDocumentForm = createDefaultPolicyDocument;
export const createPolicyDocumentResponse = createDefaultPolicyDocument;
