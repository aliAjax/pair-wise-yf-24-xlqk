<script setup lang="ts">
import { onMounted, computed } from "vue";
import { ElMessage } from "element-plus";
import { useReviewNoteStore } from "../stores/ReviewNoteStore";
import { useDiffResultStore } from "../stores/DiffResultStore";
import { usePolicyDocumentStore } from "../stores/PolicyDocumentStore";
import type { ReviewStatus } from "../constants/ReviewStatus";
import { formatReviewStatus, formatDate } from "../utils/formatters";
import ReviewChecklist from "../components/common/ReviewChecklist.vue";

const noteStore = useReviewNoteStore();
const diffStore = useDiffResultStore();
const docStore = usePolicyDocumentStore();

onMounted(async () => {
  await Promise.all([noteStore.load(), diffStore.load(), docStore.load()]);
});

const diffSummaries = computed(() => {
  const map: Record<number, string> = {};
  for (const diff of diffStore.rows) {
    map[diff.id] = `${diff.diff_type}：${diff.summary}`;
  }
  return map;
});

const onStatusChange = async (noteId: number, status: ReviewStatus) => {
  await noteStore.setStatus(noteId, status);
  ElMessage.success(`备注已标记为「${formatReviewStatus(status)}」`);
};

const onAdd = async (draft: {
  diff_result_id: number;
  tag: string;
  comment: string;
  reviewer: string;
  status: ReviewStatus;
}) => {
  await noteStore.add(draft);
  ElMessage.success("备注已添加");
};

const pendingNotes = computed(() => noteStore.rows.filter((note) => note.status === "PENDING_REVIEW"));

const exportMarkdown = () => {
  const lines: string[] = [];
  lines.push("# 隐私政策差异审阅摘要");
  lines.push("");
  lines.push(`导出时间：${formatDate(new Date().toISOString())}`);
  lines.push(`文档数：${docStore.rows.length}　差异数：${diffStore.rows.length}　备注数：${noteStore.rows.length}`);
  lines.push("");

  const groups: ReviewStatus[] = ["PENDING_REVIEW", "OPEN", "CONFIRMED", "IGNORED", "RESOLVED"];
  for (const status of groups) {
    const groupNotes = noteStore.rows.filter((note) => note.status === status);
    lines.push(`## ${formatReviewStatus(status)}（${groupNotes.length}）`);
    lines.push("");
    if (groupNotes.length === 0) {
      lines.push("_无_");
      lines.push("");
      continue;
    }
    for (const note of groupNotes) {
      const tag = note.tag ? `[${note.tag}] ` : "";
      lines.push(`- ${tag}${note.comment} —— ${note.reviewer || "未署名"}（关联差异 #${note.diff_result_id}）`);
    }
    lines.push("");
  }

  const blob = new Blob([lines.join("\n")], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `review-summary-${new Date().toISOString().slice(0, 10)}.md`;
  link.click();
  URL.revokeObjectURL(url);
  ElMessage.success("Markdown 摘要已导出");
};
</script>

<template>
  <div class="review-page">
    <el-card shadow="never" class="review-head">
      <div class="head-row">
        <div>
          <strong>审阅清单</strong>
          <p class="head-tip">
            段落改动后，关联差异上的备注会保留原文并自动标记为「待复核」（当前 {{ pendingNotes.length }} 条待复核）。
          </p>
        </div>
        <el-button type="primary" plain size="small" @click="exportMarkdown">导出 Markdown 摘要</el-button>
      </div>
    </el-card>

    <el-empty v-if="noteStore.rows.length === 0" description="暂无审阅备注" :image-size="80" />
    <ReviewChecklist
      v-else
      :notes="noteStore.rows"
      :diff-summaries="diffSummaries"
      :loading="noteStore.loading"
      @status-change="onStatusChange"
      @add="onAdd"
    />
  </div>
</template>

<style scoped>
.review-page {
  display: grid;
  gap: 14px;
}
.review-head {
  border: 1px solid #d8d6c8;
  border-radius: 8px;
  background: #fbfaf4;
}
.head-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.head-tip {
  margin: 6px 0 0;
  font-size: 13px;
  color: #596257;
}
</style>
