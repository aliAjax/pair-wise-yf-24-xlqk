import { localRepository } from "../utils/localRepository";
import { mockData } from "../mocks/seedData";
import { ControllerError } from "../utils/errors";
import { type CollectionName } from "../utils/storageKeys";
import { patchSectionMeta, updateSection } from "../services/policySectionService";
import type { PolicySection } from "../types/PolicySection";
import type { RecheckImpact } from "../types/service";

const collection: CollectionName = "policySection";

export async function listPolicySection(): Promise<PolicySection[]> {
  try {
    localRepository.init(mockData as unknown as Record<CollectionName, unknown[]>);
    return localRepository.list<PolicySection>(collection);
  } catch (error) {
    throw new ControllerError("listPolicySection", error);
  }
}

export async function savePolicySection(payload: PolicySection): Promise<PolicySection> {
  try {
    return localRepository.save(collection, payload).record;
  } catch (error) {
    throw new ControllerError("savePolicySection", error);
  }
}

/**
 * 段落改动保存：按新内容重算差异，旧备注转待复核。
 * baseRevision 为编辑开始时的文档版本号，晚到保存会收到 ControllerError(VERSION_CONFLICT)。
 */
export async function updatePolicySection(
  payload: PolicySection,
  baseRevision: number
): Promise<RecheckImpact> {
  try {
    return updateSection({ section: payload, baseRevision });
  } catch (error) {
    // service 已完成冲突草稿登记；controller 再包一层，页面只看到统一入口
    throw new ControllerError("updatePolicySection", error);
  }
}

export async function patchPolicySectionMeta(
  sectionId: number,
  patch: Partial<Pick<PolicySection, "risk_level" | "category">>,
  baseRevision: number
): Promise<RecheckImpact> {
  try {
    return patchSectionMeta(sectionId, patch, baseRevision);
  } catch (error) {
    throw new ControllerError("updatePolicySectionMeta", error);
  }
}
