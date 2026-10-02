import { localRepository } from "../utils/localRepository";
import { mockData } from "../mocks/seedData";
import { ControllerError } from "../utils/errors";
import { type CollectionName } from "../utils/storageKeys";
import { recomputeDiffsForDocument } from "../services/diffRecomputeService";
import type { DiffResult } from "../types/DiffResult";

const collection: CollectionName = "diffResult";

export async function listDiffResult(): Promise<DiffResult[]> {
  try {
    localRepository.init(mockData as unknown as Record<CollectionName, unknown[]>);
    return localRepository.list<DiffResult>(collection);
  } catch (error) {
    throw new ControllerError("listDiffResult", error);
  }
}

export async function saveDiffResult(payload: DiffResult): Promise<DiffResult> {
  try {
    return localRepository.save(collection, payload).record;
  } catch (error) {
    throw new ControllerError("saveDiffResult", error);
  }
}

/** 手动触发某文档差异重算（页面“立即重算”按钮） */
export async function recomputeDiff(newDocumentId: number, oldDocumentId?: number) {
  try {
    return recomputeDiffsForDocument(newDocumentId, oldDocumentId);
  } catch (error) {
    throw new ControllerError("recomputeDiff", error);
  }
}
