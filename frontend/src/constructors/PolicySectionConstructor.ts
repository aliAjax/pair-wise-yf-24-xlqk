import type { PolicySection } from "../types/PolicySection";

const nowIso = () => new Date().toISOString();

export const createDefaultPolicySection = (overrides: Partial<PolicySection> = {}): PolicySection => ({
  id: 0,
  document_id: 0,
  section_no: "",
  heading: "",
  content: "",
  category: "OTHER",
  risk_level: "LOW",
  updated_at: nowIso(),
  revision: 1,
  ...overrides
});

export const createPolicySectionForm = createDefaultPolicySection;
export const createPolicySectionResponse = createDefaultPolicySection;
