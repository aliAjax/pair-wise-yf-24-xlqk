export interface PolicySection {
  id: number;
  document_id: number;
  section_no: string;
  heading: string;
  content: string;
  category: string;
  risk_level: string;
  updated_at: string;
  /** 段落版本号，段落自身每次改动递增 */
  revision: number;
}
