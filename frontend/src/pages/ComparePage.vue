<script setup lang="ts">
import { onMounted, computed, ref, watch } from "vue";
import { ElMessage } from "element-plus";
import { usePolicyDocumentStore } from "../stores/PolicyDocumentStore";
import { usePolicySectionStore } from "../stores/PolicySectionStore";
import { useDiffResultStore } from "../stores/DiffResultStore";
import { useReviewNoteStore } from "../stores/ReviewNoteStore";
import { formatDate } from "../utils/formatters";
import { parseHash } from "../utils/router";
import type { DiffType } from "../constants/DiffType";
import type { DiffResult } from "../types/DiffResult";
import DiffViewer from "../components/common/DiffViewer.vue";
import SectionCard from "../components/common/SectionCard.vue";
import StatusBadge from "../components/common/StatusBadge.vue";

const docStore = usePolicyDocumentStore();
const sectionStore = usePolicySectionStore();
const diffStore = useDiffResultStore();
const noteStore = useReviewNoteStore();

const oldDocId = ref<number>(0);
const newDocId = ref<number>(0);
const typeFilter = ref<DiffType | "ALL">("ALL");
const jumpTo = ref<string>("");

onMounted(async () => {
  await Promise.all([docStore.load(), sectionStore.load(), diffStore.load(), noteStore.load()]);
  const query = parseHash().query;
  const docs = docStore.rows;
  if (docs.length >= 2) {
    oldDocId.value = Number(query.old) || docs[0].id;
    newDocId.value = Number(query.new) || docs[docs.length - 1].id;
  } else if (docs.length === 1) {
    newDocId.value = docs[0].id;
  }
  await ensureDiffs();
});

const ensureDiffs = async () => {
  if (!oldDocId.value || !newDocId.value || oldDocId.value === newDocId.value) return;
  const existing = diffStore.byPair(oldDocId.value, newDocId.value);
  if (existing.length === 0) {
    await diffStore.recomputePair(oldDocId.value, newDocId.value);
  }
};

watch([oldDocId, newDocId], ensureDiffs);

const sectionMap = computed(() => new Map(sectionStore.rows.map((section) => [section.id, section])));

const oldDoc = computed(() => docStore.byId(oldDocId.value));
const newDoc = computed(() => docStore.byId(newDocId.value));

const pairDiffs = computed<DiffResult[]>(() => {
  const list = diffStore.byPair(oldDocId.value, newDocId.value);
  if (typeFilter.value === "ALL") return list;
  return list.filter((diff) => diff.diff_type === typeFilter.value);
});

const diffTypeCounts = computed(() => {
  const all = diffStore.byPair(oldDocId.value, newDocId.value);
  const counts: Record<string, number> = { ADDED: 0, REMOVED: 0, MODIFIED: 0, MOVED: 0, UNCHANGED: 0 };
  for (const diff of all) counts[diff.diff_type] = (counts[diff.diff_type] ?? 0) + 1;
  return counts;
});

const contentFor = (diff: DiffResult): { oldContent: string; newContent: string } => {
  const section = sectionMap.value.get(diff.section_id);
  if (diff.diff_type === "REMOVED") {
    return { oldContent: section?.content ?? "", newContent: "" };
  }
  if (diff.diff_type === "ADDED") {
    return { oldContent: "", newContent: section?.content ?? "" };
  }
  // MODIFIED / UNCHANGED：section_id 指向新段落，旧段落按 section_no 匹配
  const newSection = section;
  const oldSection = sectionStore.rows.find(
    (item) => item.document_id === oldDocId.value && item.section_no === newSection?.section_no
  );
  return { oldContent: oldSection?.content ?? "", newContent: newSection?.content ?? "" };
};

const sectionFor = (diff: DiffResult) => sectionMap.value.get(diff.section_id);

const pendingCountFor = (diffId: number) =>
  noteStore.rows.filter((note) => note.diff_result_id === diffId && note.status === "PENDING_REVIEW").length;

const onSaveContent = async (diff: DiffResult, content: string) => {
  const section = sectionMap.value.get(diff.section_id);
  if (!section) return;
  const { pendingCount } = await sectionStore.updateContent({ ...section, content });
  await diffStore.load();
  await noteStore.load();
  if (pendingCount > 0) {
    ElMessage.warning(`差异已按新内容重算，${pendingCount} 条审阅备注已标记为待复核`);
  } else {
    ElMessage.success("差异已按新内容重算");
  }
};

const jumpOptions = computed(() =>
  pairDiffs.value.map((diff) => {
    const section = sectionFor(diff);
    return { value: `diff-${diff.id}`, label: `第 ${section?.section_no ?? "?"} 条 ${section?.heading ?? ""}` };
  })
);

const doJump = () => {
  if (!jumpTo.value) return;
  document.getElementById(jumpTo.value)?.scrollIntoView({ behavior: "smooth", block: "start" });
};
</script>

<template>
  <div class="compare-page">
    <el-card shadow="never" class="pair-card">
      <div class="pair-row">
        <el-select v-model="oldDocId" size="small" placeholder="选择旧版文档" style="width: 220px">
          <el-option v-for="doc in docStore.rows" :key="doc.id" :label="`旧版：${doc.title} ${doc.version_label}`" :value="doc.id" />
        </el-select>
        <span class="arrow">→</span>
        <el-select v-model="newDocId" size="small" placeholder="选择新版文档" style="width: 220px">
          <el-option v-for="doc in docStore.rows" :key="doc.id" :label="`新版：${doc.title} ${doc.version_label}`" :value="doc.id" />
        </el-select>
        <el-tag v-if="oldDocId === newDocId && oldDocId" type="warning" size="small">同一文档的对比请选择不同版本</el-tag>
      </div>
      <div class="pair-meta" v-if="oldDoc && newDoc">
        <span>旧版导入于 {{ formatDate(oldDoc.imported_at) }}</span>
        <span>新版导入于 {{ formatDate(newDoc.imported_at) }}</span>
      </div>
    </el-card>

    <div class="toolbar">
      <el-radio-group v-model="typeFilter" size="small">
        <el-radio-button value="ALL">全部 {{ diffTypeCounts.ADDED + diffTypeCounts.REMOVED + diffTypeCounts.MODIFIED + diffTypeCounts.MOVED + diffTypeCounts.UNCHANGED }}</el-radio-button>
        <el-radio-button value="ADDED">新增 {{ diffTypeCounts.ADDED }}</el-radio-button>
        <el-radio-button value="REMOVED">删除 {{ diffTypeCounts.REMOVED }}</el-radio-button>
        <el-radio-button value="MODIFIED">修改 {{ diffTypeCounts.MODIFIED }}</el-radio-button>
        <el-radio-button value="UNCHANGED">未变化 {{ diffTypeCounts.UNCHANGED }}</el-radio-button>
      </el-radio-group>
      <el-select v-model="jumpTo" size="small" placeholder="跳转到条款" style="width: 200px" @change="doJump">
        <el-option v-for="opt in jumpOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
      </el-select>
    </div>

    <el-empty v-if="pairDiffs.length === 0 && !diffStore.loading" description="暂无差异结果" :image-size="80" />

    <div v-loading="diffStore.loading" class="diff-list">
      <section v-for="diff in pairDiffs" :id="`diff-${diff.id}`" :key="diff.id" class="diff-anchor">
        <div class="diff-summary">
          <StatusBadge :value="diff.diff_type" />
          <span class="summary-text">{{ diff.summary }}</span>
          <el-tag v-if="pendingCountFor(diff.id) > 0" type="warning" size="small" effect="plain">
            {{ pendingCountFor(diff.id) }} 条备注待复核
          </el-tag>
        </div>
        <SectionCard
          v-if="sectionFor(diff)"
          :section="sectionFor(diff)!"
          :diff-type="diff.diff_type as DiffType"
          editable
          @save-content="(content: string) => onSaveContent(diff, content)"
        />
        <DiffViewer v-if="diff.diff_type !== 'UNCHANGED'" v-bind="contentFor(diff)" />
      </section>
    </div>
  </div>
</template>

<style scoped>
.compare-page {
  display: grid;
  gap: 14px;
}
.pair-card {
  border: 1px solid #d8d6c8;
  border-radius: 8px;
  background: #fbfaf4;
}
.pair-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.arrow {
  color: #7d4d18;
  font-weight: 700;
}
.pair-meta {
  display: flex;
  gap: 18px;
  margin-top: 8px;
  font-size: 12px;
  color: #596257;
}
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
}
.diff-list {
  display: grid;
  gap: 18px;
}
.diff-anchor {
  display: grid;
  gap: 8px;
  scroll-margin-top: 12px;
}
.diff-summary {
  display: flex;
  align-items: center;
  gap: 10px;
}
.summary-text {
  font-size: 13px;
  color: #3a3f38;
}
</style>
