import { STORAGE_KEYS, readCollection, writeCollection } from "../utils/storage";
import { mockData } from "../mocks/seedData";
import type { PolicyDocument } from "../types/PolicyDocument";
import type { PolicySection } from "../types/PolicySection";
import type { DiffResult } from "../types/DiffResult";
import type { ReviewNote } from "../types/ReviewNote";

let booted = false;

/**
 * 本地数据库引导：localStorage 为空时写入种子数据。
 * 种子数据不带版本号，首次打开按兼容模式处理。
 */
export function bootstrapLocalDb(): void {
  if (booted) return;
  booted = true;
  if (readCollection<PolicyDocument>(STORAGE_KEYS.documents).length === 0) {
    writeCollection(STORAGE_KEYS.documents, mockData.policyDocument as unknown as PolicyDocument[]);
  }
  if (readCollection<PolicySection>(STORAGE_KEYS.sections).length === 0) {
    writeCollection(STORAGE_KEYS.sections, mockData.policySection as unknown as PolicySection[]);
  }
  if (readCollection<DiffResult>(STORAGE_KEYS.diffs).length === 0) {
    writeCollection(STORAGE_KEYS.diffs, mockData.diffResult as unknown as DiffResult[]);
  }
  if (readCollection<ReviewNote>(STORAGE_KEYS.notes).length === 0) {
    writeCollection(STORAGE_KEYS.notes, mockData.reviewNote as unknown as ReviewNote[]);
  }
}

/** 模拟网络延迟，让 loading 状态可见 */
export function delay(ms = 120): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
