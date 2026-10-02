import { localRepository } from "../utils/localRepository";
import { mockData } from "../mocks/seedData";
import { ControllerError } from "../utils/errors";
import { STORAGE_KEYS, type CollectionName } from "../utils/storageKeys";
import { importDocument } from "../services/policySectionService";
import type { PolicyDocument } from "../types/PolicyDocument";
import type { BatchProgress } from "../types/Storage";

const endpoint = "/api/policy-document";
const collection: CollectionName = "policyDocument";

export async function listPolicyDocument(): Promise<PolicyDocument[]> {
  try {
    localRepository.init(mockData as unknown as Record<CollectionName, unknown[]>);
    if (typeof fetch !== "undefined" && endpoint.startsWith("/api") && false) {
      const res = await fetch(endpoint);
      if (res.ok) return await res.json();
    }
    return localRepository.list<PolicyDocument>(collection);
  } catch (error) {
    throw new ControllerError("listPolicyDocument", error);
  }
}

export async function savePolicyDocument(payload: PolicyDocument): Promise<PolicyDocument> {
  try {
    localRepository.init(mockData as unknown as Record<CollectionName, unknown[]>);
    return localRepository.save(collection, payload).record;
  } catch (error) {
    throw new ControllerError("savePolicyDocument", error);
  }
}

export interface ImportPolicyDocumentPayload {
  title: string;
  version_label: string;
  raw_text: string;
  onProgress?: (progress: BatchProgress) => void;
}

export async function importPolicyDocument(payload: ImportPolicyDocumentPayload) {
  try {
    localRepository.init(mockData as unknown as Record<CollectionName, unknown[]>);
    return await importDocument(payload);
  } catch (error) {
    throw new ControllerError("importPolicyDocument", error);
  }
}

/** 当前文档版本号，供页面在编辑前取 baseRevision */
export async function getDocumentRevision(documentId: number): Promise<number | undefined> {
  try {
    return localRepository.documentRevision(documentId);
  } catch (error) {
    throw new ControllerError("getDocumentRevision", error);
  }
}

export { STORAGE_KEYS };
