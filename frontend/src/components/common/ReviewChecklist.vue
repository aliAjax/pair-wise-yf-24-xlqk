<script setup lang="ts">
import { computed } from "vue";
import type { ReviewNote } from "../../types/ReviewNote";
import type { DiffResult } from "../../types/DiffResult";
import StatusBadge from "./StatusBadge.vue";
import EmptyState from "./EmptyState.vue";
import { formatDate } from "../../utils/formatters";

const props = defineProps<{
  notes: ReviewNote[];
  diffs?: DiffResult[];
  /** 只看某状态；默认展示全部 */
  filter?: string;
}>();

const emit = defineEmits<{
  (e: "confirm", note: ReviewNote): void;
  (e: "ignore", note: ReviewNote): void;
  (e: "resolve", note: ReviewNote): void;
}>();

const visible = computed(() =>
  props.filter ? props.notes.filter((note) => note.status === props.filter) : props.notes
);
const diffMap = computed(() => new Map((props.diffs ?? []).map((diff) => [diff.id, diff])));
const actionsVisible = (note: ReviewNote) => note.status === "OPEN" || note.status === "RECHECK";
</script>

<template>
  <div class="review-checklist panel">
    <header class="checklist-head">
      <strong>审阅清单</strong>
      <span class="muted">{{ visible.length }} 条</span>
    </header>
    <EmptyState
      v-if="visible.length === 0"
      text="没有符合条件的备注"
      hint="段落改动后，旧备注会自动标为待复核"
    />
    <ul v-else class="note-list">
      <li v-for="note in visible" :key="note.id" class="note-item" :class="{ recheck: note.status === 'RECHECK' }">
        <div class="note-row">
          <StatusBadge :value="note.status" />
          <span class="note-tag">{{ note.tag || "未分类" }}</span>
          <span class="muted">{{ note.reviewer }}</span>
        </div>
        <p class="note-comment">{{ note.comment }}</p>
        <p v-if="note.status === 'RECHECK'" class="recheck-hint">
          段落已改动，备注原文保留待人工复核（{{ formatDate(note.recheck_at) }}）
        </p>
        <p v-if="diffMap.get(note.diff_result_id)" class="muted note-diff">
          关联差异：{{ diffMap.get(note.diff_result_id)?.summary }}
        </p>
        <div v-if="actionsVisible(note)" class="note-actions">
          <button class="link-btn" @click="emit('confirm', note)">复核通过</button>
          <button class="link-btn" @click="emit('ignore', note)">忽略</button>
          <button class="link-btn" @click="emit('resolve', note)">标记解决</button>
        </div>
      </li>
    </ul>
  </div>
</template>
