<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { ElMessage } from "element-plus";
import { useDiffResultStore } from "../stores/DiffResultStore";
import { useReviewNoteStore } from "../stores/ReviewNoteStore";
import { useConflictDraftStore } from "../stores/ConflictDraftStore";
import ReviewChecklist from "../components/common/ReviewChecklist.vue";
import type { ReviewNote } from "../types/ReviewNote";
import { formatDate, formatDiffType } from "../utils/formatters";

const diffStore = useDiffResultStore();
const noteStore = useReviewNoteStore();
const draftStore = useConflictDraftStore();

const filter = ref("ALL");

onMounted(async () => {
  await Promise.all([diffStore.load(), noteStore.load(), draftStore.load()]);
});

const visibleNotes = computed(() =>
  filter.value === "ALL" ? noteStore.rows : noteStore.rows.filter((note) => note.status === filter.value)
);

const onConfirm = async (note: ReviewNote) => {
  await noteStore.setStatus(note.id, "CONFIRMED");
  ElMessage.success("已复核通过（原文保留）");
};
const onIgnore = async (note: ReviewNote) => {
  await noteStore.setStatus(note.id, "IGNORED");
};
const onResolve = async (note: ReviewNote) => {
  await noteStore.setStatus(note.id, "RESOLVED");
};

const exportMarkdown = () => {
  const lines: string[] = ["# 隐私政策审阅摘要", ""];
  noteStore.rows.forEach((note) => {
    const diff = diffStore.rows.find((item) => item.id === note.diff_result_id);
    lines.push(`- **[${note.status}]** ${note.tag}（${note.reviewer}）`);
    lines.push(`  - 备注原文：${note.original_comment || note.comment}`);
    if (diff) lines.push(`  - 差异：${formatDiffType(diff.diff_type)} ${diff.summary}`);
    if (note.status === "RECHECK") lines.push(`  - ⚠️ 段落改动后待复核（${formatDate(note.recheck_at)}）`);
  });
  const blob = new Blob([lines.join("\n")], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `review-summary-${Date.now()}.md`;
  link.click();
  URL.revokeObjectURL(url);
};

const filterChips = [
  { value: "ALL", label: "全部" },
  { value: "RECHECK", label: "待复核" },
  { value: "OPEN", label: "待处理" },
  { value: "CONFIRMED", label: "已确认" },
  { value: "IGNORED", label: "已忽略" },
  { value: "RESOLVED", label: "已解决" }
];
</script>

<template>
  <div class="page-grid">
    <section class="panel wide">
      <header class="panel-head">
        <h2>审阅清单</h2>
        <button class="primary-btn" @click="exportMarkdown">导出 Markdown 摘要</button>
      </header>
      <div class="filter-row">
        <button
          v-for="chip in filterChips"
          :key="chip.value"
          class="chip"
          :class="{ active: filter === chip.value }"
          @click="filter = chip.value"
        >
          {{ chip.label }}
          <em v-if="chip.value !== 'ALL'" class="chip-count">
            {{ chip.value === "RECHECK" ? noteStore.recheckRows.length : noteStore.rows.filter((n) => n.status === chip.value).length }}
          </em>
        </button>
      </div>
      <ReviewChecklist
        :notes="visibleNotes"
        :diffs="diffStore.rows"
        @confirm="onConfirm"
        @ignore="onIgnore"
        @resolve="onResolve"
      />
    </section>

    <section class="panel wide">
      <header class="panel-head">
        <h2>冲突草稿</h2>
        <span class="muted">晚到保存的改动，确认后才会覆盖</span>
      </header>
      <p v-if="draftStore.pending.length === 0" class="muted">暂无未处理冲突。可同时在两个标签页编辑同一段落验证：后保存的一方会收到冲突提示。</p>
      <ul class="conflict-list standalone">
        <li v-for="draft in draftStore.pending" :key="draft.id">
          <div>
            <p>
              <code>{{ draft.collection }}#{{ draft.record_id }}</code>
              基于 v{{ draft.base_revision }}，当前最新 v{{ draft.current_revision }}
            </p>
            <pre class="draft-payload">{{ JSON.stringify(draft.payload, null, 2) }}</pre>
          </div>
          <div class="conflict-actions">
            <button class="primary-btn" @click="draftStore.merge(draft.id); ElMessage.success('已采纳草稿改动')">采纳我的改动</button>
            <button class="link-btn" @click="draftStore.discard(draft.id)">放弃</button>
          </div>
        </li>
      </ul>
    </section>
  </div>
</template>
