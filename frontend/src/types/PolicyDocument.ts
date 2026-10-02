export interface PolicyDocument {
  id: number;
  title: string;
  version_label: string;
  raw_text: string;
  normalized_sections: string;
  imported_at: string;
  /**
   * 文档版本号（乐观锁）。
   * - 每次保存成功后 +1，用于多标签页并发保存时判断先后。
   * - 历史数据可能缺少该字段，读取时按兼容模式打开（version 视为 0）。
   */
  version: number;
}

/** 兼容模式：缺少版本号的历史数据打开时视为版本 0 */
export const LEGACY_DOCUMENT_VERSION = 0;

/** 打开文档时归一化版本号，缺失版本号按兼容模式处理 */
export function resolveDocumentVersion(doc: Partial<PolicyDocument>): number {
  return typeof doc.version === "number" && Number.isFinite(doc.version) ? doc.version : LEGACY_DOCUMENT_VERSION;
}

/** 该文档是否为缺少版本号的历史数据（兼容模式打开） */
export function isLegacyDocument(doc: Partial<PolicyDocument>): boolean {
  return !doc.version || doc.version <= LEGACY_DOCUMENT_VERSION;
}
