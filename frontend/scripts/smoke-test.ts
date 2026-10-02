/**
 * 核心逻辑冒烟测试：差异重算、分批存储、兼容打开、待复核翻转。
 * 运行：npx tsx scripts/smoke-test.ts
 */
import assert from "node:assert";
import { diffLines, classifySectionDiff } from "../src/hooks/useTextDiff";
import { parsePolicyText } from "../src/hooks/usePolicyParser";
import {
  STORAGE_KEYS,
  readCollection,
  writeCollection,
  CHUNK_CHAR_LIMIT,
  nextId
} from "../src/utils/storage";
import { mockData } from "../src/mocks/seedData";
import { recomputeDiffsForPair } from "../src/api/DiffResult";
import { markNotesPendingReview } from "../src/api/ReviewNote";
import { savePolicyDocument, forceSavePolicyDocument } from "../src/api/PolicyDocument";
import { resolveDocumentVersion, isLegacyDocument } from "../src/types/PolicyDocument";
import type { PolicyDocument } from "../src/types/PolicyDocument";
import type { PolicySection } from "../src/types/PolicySection";
import type { DiffResult } from "../src/types/DiffResult";
import type { ReviewNote } from "../src/types/ReviewNote";

// ---- localStorage mock ----
const store = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (key: string) => store.get(key) ?? null,
  setItem: (key: string, value: string) => void store.set(key, value),
  removeItem: (key: string) => void store.delete(key),
  clear: () => store.clear()
};

let passed = 0;
function test(name: string, fn: () => void) {
  fn();
  passed += 1;
  console.log(`  ✓ ${name}`);
}

// 1. 文本差异
console.log("\n[1] useTextDiff 差异计算");
test("相同内容为 UNCHANGED", () => {
  const r = classifySectionDiff("a\nb\nc", "a\nb\nc");
  assert.equal(r.diffType, "UNCHANGED");
  assert.equal(r.addedLines, 0);
  assert.equal(r.removedLines, 0);
});
test("新增行为 MODIFIED 且行数正确", () => {
  const r = classifySectionDiff("a\nb", "a\nb\nc\nd");
  assert.equal(r.diffType, "MODIFIED");
  assert.equal(r.addedLines, 2);
  assert.equal(r.removedLines, 0);
});
test("空旧内容为 ADDED", () => {
  const r = classifySectionDiff("", "x\ny");
  assert.equal(r.diffType, "ADDED");
  assert.equal(r.addedLines, 2);
});
test("空新内容为 REMOVED", () => {
  const r = classifySectionDiff("x\ny", "");
  assert.equal(r.diffType, "REMOVED");
  assert.equal(r.removedLines, 2);
});
test("diffLines 片段包含 add/del/keep", () => {
  const segs = diffLines("a\nb\nc", "a\nb2\nc");
  assert.ok(segs.some((s) => s.type === "add"));
  assert.ok(segs.some((s) => s.type === "del"));
  assert.ok(segs.some((s) => s.type === "keep"));
});

// 2. 条款解析
console.log("\n[2] usePolicyParser 条款解析");
test("按第 X 条分段", () => {
  const text = ["1. 总则", "适用范围", "", "2. 数据收集", "收集个人信息", "", "3. 附则", "生效日期"].join("\n");
  const sections = parsePolicyText(text);
  assert.equal(sections.length, 3);
  assert.equal(sections[0].heading, "总则");
  assert.equal(sections[1].heading, "数据收集");
  assert.ok(sections[1].content.includes("收集个人信息"));
});
test("无标题时归入单段", () => {
  const sections = parsePolicyText("只有一段正文\n没有标题");
  assert.equal(sections.length, 1);
});

// 3. 分批存储
console.log("\n[3] 分批存储");
test("小数据单 key 写入", () => {
  store.clear();
  const rows = [{ id: 1, v: "x" }];
  const res = writeCollection(STORAGE_KEYS.documents, rows);
  assert.equal(res.batches, 1);
  assert.deepEqual(readCollection(STORAGE_KEYS.documents), rows);
});
test("超长按批写入并能拼回", () => {
  store.clear();
  const rows = Array.from({ length: 500 }, (_, i) => ({ id: i + 1, v: "x".repeat(200) }));
  const res = writeCollection(STORAGE_KEYS.documents, rows);
  assert.ok(res.batches > 1, `应分批，实际 ${res.batches}`);
  assert.ok(store.has(STORAGE_KEYS.documents + ":manifest"));
  assert.deepEqual(readCollection(STORAGE_KEYS.documents), rows);
});
test("单值写入会清理旧分片", () => {
  const small = [{ id: 1, v: "y" }];
  writeCollection(STORAGE_KEYS.documents, small);
  assert.ok(!store.has(STORAGE_KEYS.documents + ":manifest"));
  assert.deepEqual(readCollection(STORAGE_KEYS.documents), small);
});
test("旧版本 key 兼容回退", () => {
  store.clear();
  const legacy = [{ id: 99, title: "旧数据" }];
  store.set("policy-diff:documents", JSON.stringify(legacy));
  assert.deepEqual(readCollection(STORAGE_KEYS.documents), legacy);
});
test("nextId 取最大 id +1", () => {
  assert.equal(nextId([{ id: 3 }, { id: 7 }, { id: 1 }]), 8);
});

// 4. 版本兼容
console.log("\n[4] 版本号兼容");
test("缺失版本号按 0 处理且标记为旧版", () => {
  const doc = { id: 1 } as PolicyDocument;
  assert.equal(resolveDocumentVersion(doc), 0);
  assert.equal(isLegacyDocument(doc), true);
});
test("有版本号时正常识别", () => {
  const doc = { id: 1, version: 2 } as PolicyDocument;
  assert.equal(resolveDocumentVersion(doc), 2);
  assert.equal(isLegacyDocument(doc), false);
});

// 5. 差异重算 + 待复核翻转
console.log("\n[5] 差异重算与待复核联动");
async function runRecomputeFlow() {
  store.clear();
  writeCollection(STORAGE_KEYS.documents, mockData.policyDocument as unknown as PolicyDocument[]);
  writeCollection(STORAGE_KEYS.sections, mockData.policySection as unknown as PolicySection[]);
  writeCollection(STORAGE_KEYS.diffs, mockData.diffResult as unknown as DiffResult[]);
  writeCollection(STORAGE_KEYS.notes, mockData.reviewNote as unknown as ReviewNote[]);

  const result = await recomputeDiffsForPair(1, 2);
  test("重算后差异数量与类型分布正确", () => {
    assert.equal(result.diffs.length, 7);
    assert.equal(result.added, 1);
    assert.equal(result.removed, 1);
    assert.equal(result.modified, 4);
    assert.equal(result.unchanged, 1);
  });

  // 修改新版第 2 条（数据收集）内容
  const sections = readCollection<PolicySection>(STORAGE_KEYS.sections);
  const target = sections.find((s) => s.id === 8)!;
  const originalContent = target.content;
  target.content = "我们仅收集您主动提供的信息，不再收集设备信息。";
  writeCollection(STORAGE_KEYS.sections, sections);

  const result2 = await recomputeDiffsForPair(1, 2);
  test("段落改动后差异重算：受影响差异被识别", () => {
    const changed = result2.diffs.find((d) => d.id === 2)!;
    assert.equal(changed.diff_type, "MODIFIED");
    assert.ok(changed.summary.includes("新增") || changed.summary.includes("删除"));
    assert.ok(result2.affectedDiffIds.includes(2));
  });

  const touched = await markNotesPendingReview(result2.affectedDiffIds);
  test("受影响差异上的备注保留原文并翻转为待复核", () => {
    const note = touched.find((n) => n.id === 2);
    assert.ok(note);
    assert.equal(note!.status, "PENDING_REVIEW");
    assert.equal(note!.comment, "新增受托处理者清单需法务复核"); // 原文保留
    assert.equal(note!.tag, "共享清单");
    // 未受影响差异上的备注保持原状态
    const allNotes = readCollection<ReviewNote>(STORAGE_KEYS.notes);
    const untouched = allNotes.find((n) => n.id === 3)!;
    assert.notEqual(untouched.status, "PENDING_REVIEW");
  });

  test("未改动段落后重算不产生受影响差异", () => {
    // 内容未变的段落（保存期限）重算后不在受影响列表
    assert.ok(!result2.affectedDiffIds.includes(4));
  });

  console.log(`\n全部 ${passed} 项断言通过 ✓`);
}

// 6. 并发保存冲突
async function runConflictFlow() {
  console.log("\n[6] 版本冲突检测（两个标签页同时保存）");
  store.clear();
  writeCollection(STORAGE_KEYS.documents, mockData.policyDocument as unknown as PolicyDocument[]);

  // 标签页 A、B 同时打开同一文档（种子数据无版本号，baseVersion=0）
  const [docA] = readCollection<PolicyDocument>(STORAGE_KEYS.documents);
  const docB = { ...docA };

  // 标签页 B 先保存（升级到 v1）
  const resultB = await savePolicyDocument({ ...docB, title: "隐私政策（B 已改）" });
  test("先保存的一方成功并升级版本", () => {
    assert.equal(resultB.ok, true);
    assert.equal(resultB.doc?.version, 1);
  });

  // 标签页 A 基于旧内容保存 → 应返回冲突，且改动内容保留
  const resultA = await savePolicyDocument({ ...docA, title: "隐私政策（A 也改了）" });
  test("后保存的一方收到冲突提示", () => {
    assert.equal(resultA.ok, false);
    assert.ok(resultA.conflict);
    assert.equal(resultA.conflict!.baseVersion, 0);
    assert.equal(resultA.conflict!.serverVersion, 1);
    assert.equal(resultA.conflict!.pendingDoc.title, "隐私政策（A 也改了）"); // 改动不丢
  });

  // A 选择强制覆盖
  const force = await forceSavePolicyDocument(resultA.conflict!.pendingDoc);
  test("强制覆盖后版本号压过对方", () => {
    assert.equal(force.ok, true);
    assert.equal(force.doc?.version, 2);
    assert.equal(force.doc?.title, "隐私政策（A 也改了）");
  });

  // 兼容模式：无版本号数据保存后升级为 v1
  store.clear();
  writeCollection(STORAGE_KEYS.documents, [{ id: 50, title: "旧文档" } as PolicyDocument]);
  const legacy = await savePolicyDocument({ id: 50, title: "旧文档首次保存" } as PolicyDocument);
  test("无版本号文档首次保存升级为 v1", () => {
    assert.equal(legacy.ok, true);
    assert.equal(legacy.doc?.version, 1);
  });
}

runRecomputeFlow()
  .then(runConflictFlow)
  .catch((err) => {
    console.error("测试失败：", err);
    process.exit(1);
  });
