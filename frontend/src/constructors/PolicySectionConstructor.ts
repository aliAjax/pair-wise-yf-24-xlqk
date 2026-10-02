import type { PolicySection } from "../types/PolicySection";

export const createDefaultPolicySection = (overrides: Partial<PolicySection> = {}): PolicySection => ({
  id: 0,
  document_id: 0,
  section_no: "",
  heading: "",
  content: "",
  category: "其他",
  risk_level: "LOW",
  ...overrides
});

export const createPolicySectionForm = createDefaultPolicySection;
export const createPolicySectionResponse = createDefaultPolicySection;
