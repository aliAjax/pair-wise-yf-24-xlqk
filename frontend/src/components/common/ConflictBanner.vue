<script setup lang="ts">
import type { ConflictDraft } from "../../types/Storage";
import { formatDate } from "../../utils/formatters";

defineProps<{ drafts: ConflictDraft[] }>();
const emit = defineEmits<{
  (e: "merge", draft: ConflictDraft): void;
  (e: "discard", draft: ConflictDraft): void;
  (e: "review"): void;
}>();
</script>

<template>
  <section v-if="drafts.length" class="conflict-banner panel">
    <header class="conflict-head">
      <strong>检测到 {{ drafts.length }} 处版本冲突</strong>
      <span class="muted">晚到的保存未覆盖新内容，改动已自动保留</span>
    </header>
    <ul class="conflict-list">
      <li v-for="draft in drafts" :key="draft.id">
        <div>
          <p>
            <code>{{ draft.collection }}#{{ draft.record_id }}</code>
            基于 v{{ draft.base_revision }} 的改动，已被其他标签页的 v{{ draft.current_revision }} 抢先
          </p>
          <span class="muted">{{ formatDate(draft.created_at) }}</span>
        </div>
        <div class="conflict-actions">
          <button class="primary-btn" @click="emit('merge', draft)">采纳我的改动</button>
          <button class="link-btn" @click="emit('discard', draft)">放弃</button>
        </div>
      </li>
    </ul>
    <button class="link-btn" @click="emit('review')">前往审阅清单处理全部 →</button>
  </section>
</template>
