import { STORAGE_KEYS, readCollection, writeCollection, nextId } from "../utils/storage";
import { delay } from "./localDb";
import { LOG_TEMPLATES } from "../constants/logTemplates";
import type { PolicySection } from "../types/PolicySection";

function log(template: string, payload: unknown): void {
  console.info(`[PolicySection] ${template}`, payload);
}

export async function listPolicySections(): Promise<PolicySection[]> {
  await delay();
  return readCollection<PolicySection>(STORAGE_KEYS.sections);
}

export async function listSectionsByDocument(documentId: number): Promise<PolicySection[]> {
  await delay(60);
  return readCollection<PolicySection>(STORAGE_KEYS.sections)
    .filter((section) => section.document_id === documentId)
    .sort((a, b) => Number(a.section_no) - Number(b.section_no));
}

/** 批量保存段落（导入长文本时分批写入） */
export async function savePolicySections(sections: PolicySection[]): Promise<{ batches: number }> {
  await delay();
  const rows = readCollection<PolicySection>(STORAGE_KEYS.sections);
  const map = new Map(rows.map((row) => [row.id, row]));
  for (const section of sections) {
    if (!section.id) section.id = nextId(Array.from(map.values()));
    map.set(section.id, section);
  }
  const merged = Array.from(map.values());
  const result = writeCollection(STORAGE_KEYS.sections, merged);
  log(LOG_TEMPLATES.PolicySection[0], { count: sections.length, batches: result.batches });
  return { batches: result.batches };
}

/** 更新单个段落内容（段落改动后触发差异重算） */
export async function updatePolicySection(section: PolicySection): Promise<PolicySection> {
  await delay(60);
  const rows = readCollection<PolicySection>(STORAGE_KEYS.sections);
  const idx = rows.findIndex((row) => row.id === section.id);
  if (idx < 0) throw new Error(`section not found: ${section.id}`);
  rows[idx] = section;
  const result = writeCollection(STORAGE_KEYS.sections, rows);
  log(LOG_TEMPLATES.PolicySection[1], { id: section.id, batches: result.batches });
  return section;
}

export async function deleteSectionsByDocument(documentId: number): Promise<void> {
  await delay(60);
  const rows = readCollection<PolicySection>(STORAGE_KEYS.sections).filter(
    (section) => section.document_id !== documentId
  );
  writeCollection(STORAGE_KEYS.sections, rows);
  log(LOG_TEMPLATES.PolicySection[2], { documentId });
}
