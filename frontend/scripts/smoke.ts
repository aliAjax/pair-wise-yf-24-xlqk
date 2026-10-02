/**
 * 端到端冒烟测试（tsx 直接运行，不进生产构建）：
 * 验证：旧数据兼容打开 / 段落改动重算差异 / 旧备注保留原文转待复核 /
 *      多标签页晚到保存冲突且改动入草稿不丢失 / 超长内容分批+分块保存。
 * 运行：npx tsx scripts/smoke.ts
 */
import { vi } from "./vitestShim";

vi.bootstrap();

import { localRepository } from "../src/utils/localRepository";
import { mockData } from "../src/mocks/seedData";
import { ensureSchema } from "../src/utils/storageMigration";
import { updateSection } from "../src/services/policySectionService";
import { listConflictDrafts } from "../src/utils/conflictDrafts";
import { resolveDraft } from "../src/services/conflictDraftService";
import { STORAGE_CONFIG } from "../src/config/storage";
import type { PolicySection } from "../src/types/PolicySection";
import type { ReviewNote } from "../src/types/ReviewNote";
import type { DiffResult } from "../src/types/DiffResult";
import { COLLECTION_NAMES, type CollectionName } from "../src/utils/storageKeys";

let failures = 0;
const assert = (cond: unknown, message: string) => {
  if (cond) {
    console.log(`  ✓ ${message}`);
  } else {
    failures += 1;
    console.error(`  ✗ ${message}`);
  }
};

const asRows = (name: CollectionName) =>
  (JSON.parse(localStorage.getItem(`policy-diff:${name}`) as string) as Array<Record<string, unknown>>) ?? [];

console.log("1) 无版本号旧数据按兼容方式打开");
{
  // 构造缺失 revision / 新字段的旧格式数据
  localStorage.setItem(
    "policy-diff:policyDocument",
    JSON.stringify([{ id: 1, title: "旧文档", version_label: "v1", raw_text: "x", normalized_sections: "", imported_at: "2026-01-01T00:00:00Z" }])
  );
  localStorage.setItem(
    "policy-diff:policySection",
    JSON.stringify([
      { id: 11, document_id: 1, section_no: "一", heading: "收集", content: "旧内容 A", category: "DATA_COLLECTION", risk_level: "LOW" }
    ])
  );
  localStorage.setItem("policy-diff:reviewNote", JSON.stringify([{ id: 21, diff_result_id: 99, tag: "t", comment: "原始备注", reviewer: "r", status: "CONFIRMED" }]));
  localStorage.removeItem("policy-diff:meta");

  const result = ensureSchema((name) => {
    const raw = localStorage.getItem(`policy-diff:${name}`);
    return raw ? (JSON.parse(raw) as Array<Record<string, unknown>>) : null;
  });
  assert(result.migrated, "识别为旧数据并执行迁移");
  const doc = result.data.policyDocument[0] as { revision: number; updated_at: string };
  assert(doc.revision === 1, "旧文档缺失 revision 时补 1");
  assert(!!doc.updated_at, "旧文档补 updated_at");
  const note = result.data.reviewNote[0] as { original_comment: string; recheck_at: string };
  assert(note.original_comment === "原始备注", "旧备注 original_comment 用现有 comment 兜底");
  assert(note.recheck_at === "", "旧备注补空 recheck_at");
}

console.log("2) 种子初始化 + 段落改动按新内容重算差异");
{
  localStorage.clear();
  localRepository.init(mockData as unknown as Record<CollectionName, unknown[]>);
  const docs = localRepository.list<{ id: number; revision: number }>("policyDocument");
  assert(docs.length === 2, "种子写入 2 个文档");

  // 种子中 doc2 的“共享”段落（id=4）对应 diff id=2，且备注 id=1 挂在 diff 2 上，状态 OPEN
  const section = localRepository.find<PolicySection>("policySection", 4);
  assert(!!section, "找到共享段落");
  const beforeDiff = localRepository.list<DiffResult>("diffResult").find((d) => d.id === 2);
  assert(beforeDiff?.source_section_content.includes("广告合作伙伴"), "差异快照为改动前内容");

  const impact = updateSection({
    section: { ...(section as PolicySection), content: "在获得明确同意后，可向广告与统计合作伙伴共享设备信息。" },
    baseRevision: 1
  });
  assert(impact.recheckNoteIds.includes(1), "受影响的旧备注 1 被标为待复核");
  assert(impact.documentRevision === 2, "文档版本号递增到 v2");

  const afterDiff = localRepository.find<DiffResult>("diffResult", 2);
  assert(
    afterDiff?.source_section_content.includes("统计合作伙伴"),
    "差异结果按新段落内容重算（不再显示旧差异）"
  );
  assert((afterDiff?.revision ?? 0) >= 2, "差异 revision 递增");
  const note = localRepository.find<ReviewNote>("reviewNote", 1);
  assert(note?.status === "RECHECK", "备注状态变为 RECHECK（待复核）");
  assert(note?.comment === "需补充广告合作伙伴清单与退出方式。", "备注原文保留不变");
  assert(!!note?.recheck_at, "记录待复核时间");

  // 无实质变化的再次保存不应重复触发待复核
  const sectionAgain = localRepository.find<PolicySection>("policySection", 4);
  const impact2 = updateSection({ section: sectionAgain as PolicySection, baseRevision: 2 });
  assert(impact2.recheckNoteIds.length === 0, "内容未再变化时不重复标记待复核");
  const noteStill = localRepository.find<ReviewNote>("reviewNote", 1);
  assert(noteStill?.status === "RECHECK", "备注维持待复核等待人工处理");
}

console.log("3) 两个标签页同时保存：晚到那次提示冲突且改动不丢");
{
  const fresh = localRepository.find<PolicySection>("policySection", 3);
  // 模拟另一标签页已先把文档推进到 v3
  const doc = localRepository.find<{ id: number; revision: number }>("policyDocument", 2);
  localRepository.save("policyDocument", { ...doc, revision: 3 });

  let caught = false;
  try {
    updateSection({
      section: { ...(fresh as PolicySection), content: "标签页A的晚到改动" },
      baseRevision: 2 // A 基于 v2 编辑，磁盘已是 v3
    });
  } catch (error) {
    caught = true;
    assert((error as Error).message.includes("更新版本"), `冲突错误可提示用户：${(error as Error).message.slice(0, 40)}…`);
  }
  assert(caught, "晚到保存抛出版本冲突");
  const drafts = listConflictDrafts();
  const mine = drafts.find((d) => JSON.stringify(d.payload).includes("标签页A的晚到改动"));
  assert(!!mine, "晚到改动被保存为冲突草稿");
  assert(mine?.base_revision === 2 && mine.current_revision === 3, "草稿记录基础版本与当前版本");

  // 磁盘上的新内容没有被覆盖
  const onDisk = localRepository.find<PolicySection>("policySection", 3);
  assert(onDisk?.content !== "标签页A的晚到改动", "先保存一方的数据未被覆盖");

  // 采纳草稿后改动落地
  resolveDraft(mine!.id, true);
  const merged = localRepository.find<PolicySection & { revision: number }>("policySection", 3);
  assert(merged?.content === "标签页A的晚到改动", "人工采纳后草稿改动落地");
  assert(listConflictDrafts().every((d) => d.id !== mine!.id), "采纳后草稿从待处理列表移除");
}

console.log("4) 内容超长：分批保存 + 分块写入");
{
  const huge = "超。".repeat(STORAGE_CONFIG.CHUNK_CHAR_THRESHOLD / 2 + 10);
  const id = localRepository.nextId("policySection");
  const result = localRepository.save("policySection", {
    id,
    document_id: 2,
    section_no: "九十九",
    heading: "超长条款",
    content: huge,
    category: "OTHER",
    risk_level: "LOW",
    updated_at: new Date().toISOString(),
    revision: 1
  });
  assert(result.batched, "超长单条自动标记为分块提交");
  const rawRows = asRows("policySection");
  const marker = rawRows.find((r) => r.id === id) as { __chunked__?: boolean };
  assert(marker?.__chunked__ === true, "主集合仅保留分块占位标记");
  const chunkKeys = Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i)).filter(
    (k): k is string => !!k && k.includes(`:policySection:${id}:`) && !k.endsWith(String(id))
  );
  assert(chunkKeys.length >= 2, `正文被拆为 ${chunkKeys.length} 块存储`);
  const restored = localRepository.find<PolicySection>("policySection", id);
  assert(restored?.content === huge, "分块数据可完整读回");

  // 多条记录分批
  const many = Array.from({ length: STORAGE_CONFIG.BATCH_SIZE * 2 + 3 }, (_, i) => ({
    id: 1000 + i,
    document_id: 1,
    section_no: `${i}`,
    heading: `批${i}`,
    content: "x",
    category: "OTHER",
    risk_level: "LOW",
    updated_at: new Date().toISOString(),
    revision: 1
  }));
  const batches: number[] = [];
  const r = await localRepository.saveMany("policySection", many, {
    documentId: 1,
    baseRevision: 4,
    onProgress: (p) => batches.push(p.batch)
  });
  assert(r.stats.batches === 3, `${many.length} 条记录拆为 3 批提交`);
  assert(batches.length === 3 && r.saved.length === many.length, "分批进度回调完整且无记录丢失");
}

console.log(failures === 0 ? "\n全部冒烟断言通过 ✅" : `\n${failures} 条断言失败 ❌`);
process.exit(failures === 0 ? 0 : 1);
