import type { PolicyDocument } from "../types/PolicyDocument";

export const createDefaultPolicyDocument = (overrides: Partial<PolicyDocument> = {}): PolicyDocument => ({
  id: 0,
  title: "",
  version_label: "",
  raw_text: "",
  normalized_sections: "[]",
  imported_at: new Date().toISOString(),
  version: 1,
  ...overrides
});

export const createPolicyDocumentForm = createDefaultPolicyDocument;
export const createPolicyDocumentResponse = createDefaultPolicyDocument;
