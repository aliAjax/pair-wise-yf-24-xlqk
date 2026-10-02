export interface DiffResult {
  id: number;
  old_document_id: number;
  new_document_id: number;
  section_id: number;
  diff_type: string;
  summary: string;
  created_at: string;
  /** 段落稳定身份（同一条款改内容不变，移动时锚定旧编号），重算时按它原位更新而非显示旧差异 */
  stable_key: string;
  /** 重算时刻对应的段落正文快照，用于判断差异是否真的变化 */
  source_section_content: string;
  /** 最近一次按新段落内容重算的时间；空串表示尚未重算过 */
  recomputed_at: string;
  /** 差异结果版本号，每次重算递增 */
  revision: number;
}
