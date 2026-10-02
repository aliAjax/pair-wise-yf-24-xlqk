<script setup lang="ts">
import { computed } from "vue";
import { useTextDiff } from "../../hooks/useTextDiff";
import { formatDiffType } from "../../utils/formatters";
import type { DiffResult } from "../../types/DiffResult";
import EmptyState from "./EmptyState.vue";

const props = defineProps<{
  oldText: string;
  newText: string;
  diff?: DiffResult;
  title?: string;
}>();

const emit = defineEmits<{ (e: "jump", sectionId: number): void }>();

// 段落内容一变即按新内容重算（useTextDiff 内部 computed 依赖新旧文本）
const { tokens, summary } = useTextDiff(() => props.oldText, () => props.newText);
const hasDiff = computed(() => summary.value.type !== "UNCHANGED");
</script>

<template>
  <div class="diff-viewer panel">
    <header class="diff-head" v-if="title || diff">
      <strong>{{ title ?? diff?.summary }}</strong>
      <span v-if="diff" class="badge" :class="`diff-${diff.diff_type.toLowerCase()}`">
        {{ formatDiffType(diff.diff_type) }}
      </span>
      <button v-if="diff?.section_id" class="link-btn" @click="emit('jump', diff.section_id)">跳转段落</button>
    </header>
    <div v-if="!hasDiff && oldText === newText" class="diff-body">
      <EmptyState text="本条款两版内容一致" />
    </div>
    <div v-else class="diff-body">
      <div v-for="(token, index) in tokens" :key="index" class="diff-line" :class="`diff-line-${token.type.toLowerCase()}`">
        <span class="diff-mark">{{ token.type === "ADDED" ? "+" : token.type === "REMOVED" ? "-" : " " }}</span>
        <span>{{ token.text || "（空行）" }}</span>
      </div>
    </div>
  </div>
</template>
