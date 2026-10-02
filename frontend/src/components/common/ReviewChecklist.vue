<script setup lang="ts">
import { ref, computed } from "vue";
import type { ReviewNote } from "../../types/ReviewNote";
import type { ReviewStatus } from "../../constants/ReviewStatus";
import StatusBadge from "./StatusBadge.vue";

const props = defineProps<{
  notes: ReviewNote[];
  diffSummaries?: Record<number, string>;
  loading?: boolean;
}>();

const emit = defineEmits<{
  (e: "status-change", noteId: number, status: ReviewStatus): void;
  (e: "add", draft: { diff_result_id: number; tag: string; comment: string; reviewer: string; status: ReviewStatus }): void;
}>();

const filter = ref<"ALL" | ReviewStatus>("ALL");
const onlyPending = computed(() => filter.value === "PENDING_REVIEW");

const visibleNotes = computed(() => {
  if (filter.value === "ALL") return props.notes;
  return props.notes.filter((note) => note.status === filter.value);
});

const pendingCount = computed(() => props.notes.filter((note) => note.status === "PENDING_REVIEW").length);

const statusActions: { label: string; status: ReviewStatus; type?: "primary" | "success" | "warning" | "info" }[] = [
  { label: "确认", status: "CONFIRMED", type: "success" },
  { label: "忽略", status: "IGNORED", type: "info" },
  { label: "解决", status: "RESOLVED", type: "primary" },
  { label: "重开", status: "OPEN" }
];

// 新增备注表单
const showAdd = ref(false);
const draft = ref({ diff_result_id: 0, tag: "", comment: "", reviewer: "", status: "OPEN" as ReviewStatus });

const submitAdd = () => {
  if (!draft.value.diff_result_id || !draft.value.comment.trim()) return;
  emit("add", { ...draft.value });
  draft.value = { diff_result_id: 0, tag: "", comment: "", reviewer: "", status: "OPEN" };
  showAdd.value = false;
};
</script>

<template>
  <div class="checklist">
    <div class="checklist-toolbar">
      <el-radio-group v-model="filter" size="small">
        <el-radio-button value="ALL">全部 {{ notes.length }}</el-radio-button>
        <el-radio-button value="PENDING_REVIEW">待复核 {{ pendingCount }}</el-radio-button>
        <el-radio-button value="OPEN">待处理</el-radio-button>
        <el-radio-button value="CONFIRMED">已确认</el-radio-button>
        <el-radio-button value="IGNORED">已忽略</el-radio-button>
        <el-radio-button value="RESOLVED">已解决</el-radio-button>
      </el-radio-group>
      <el-button size="small" @click="showAdd = !showAdd">{{ showAdd ? "收起" : "+ 新增备注" }}</el-button>
    </div>

    <div v-if="showAdd" class="add-form">
      <el-input v-model.number="draft.diff_result_id" placeholder="差异结果 ID（diff_result_id）" size="small" />
      <el-input v-model="draft.tag" placeholder="标签，如：收集范围" size="small" />
      <el-input v-model="draft.reviewer" placeholder="审阅人" size="small" />
      <el-input v-model="draft.comment" type="textarea" :rows="2" placeholder="备注内容" size="small" />
      <el-button size="small" type="primary" :disabled="!draft.diff_result_id || !draft.comment.trim()" @click="submitAdd">
        保存备注
      </el-button>
    </div>

    <div v-loading="loading" class="note-list">
      <el-empty v-if="visibleNotes.length === 0" description="当前筛选下暂无备注" :image-size="60" />
      <article
        v-for="note in visibleNotes"
        :key="note.id"
        class="note-card"
        :class="{ pending: note.status === 'PENDING_REVIEW' }"
      >
        <header>
          <div class="note-tags">
            <el-tag v-if="note.tag" size="small" effect="plain" round>{{ note.tag }}</el-tag>
            <StatusBadge :value="note.status" />
          </div>
          <span class="reviewer">{{ note.reviewer || "未署名" }}</span>
        </header>
        <p class="comment">{{ note.comment }}</p>
        <p v-if="diffSummaries?.[note.diff_result_id]" class="diff-ref">
          关联差异 #{{ note.diff_result_id }}：{{ diffSummaries[note.diff_result_id] }}
        </p>
        <footer>
          <el-button
            v-for="action in statusActions"
            :key="action.status"
            size="small"
            :type="note.status === action.status ? action.type : undefined"
            plain
            @click="emit('status-change', note.id, action.status)"
          >
            {{ action.label }}
          </el-button>
        </footer>
      </article>
    </div>
  </div>
</template>

<style scoped>
.checklist {
  display: grid;
  gap: 12px;
}
.checklist-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
}
.add-form {
  display: grid;
  gap: 8px;
  padding: 12px;
  border: 1px dashed #b8b09f;
  border-radius: 8px;
  background: #fbfaf4;
}
.note-list {
  display: grid;
  gap: 10px;
}
.note-card {
  border: 1px solid #d8d6c8;
  border-radius: 8px;
  padding: 12px 14px;
  background: #fbfaf4;
  display: grid;
  gap: 8px;
}
.note-card.pending {
  border-color: #d39b46;
  background: #fdf6e7;
}
.note-card header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.note-tags {
  display: flex;
  gap: 6px;
}
.reviewer {
  font-size: 12px;
  color: #596257;
}
.comment {
  margin: 0;
  line-height: 1.6;
  color: #2c302a;
}
.diff-ref {
  margin: 0;
  font-size: 12px;
  color: #7d4d18;
}
.note-card footer {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
</style>
