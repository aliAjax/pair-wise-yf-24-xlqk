<script setup lang="ts">
import type { PolicySection } from "../../types/PolicySection";
import { formatCategory, formatRevision } from "../../utils/formatters";
import RiskTag from "./RiskTag.vue";

defineProps<{
  section: PolicySection;
  /** 编辑所基于的文档版本号，随保存提交做并发判断 */
  baseRevision?: number;
  selected?: boolean;
}>();

const emit = defineEmits<{
  (e: "edit", section: PolicySection): void;
  (e: "select", section: PolicySection): void;
}>();
</script>

<template>
  <article class="section-card panel" :class="{ selected }" @click="emit('select', section)">
    <header class="section-card-head">
      <div>
        <span class="section-no">{{ section.section_no }}</span>
        <strong>{{ section.heading }}</strong>
        <span class="muted">{{ formatCategory(section.category) }}</span>
      </div>
      <RiskTag :level="section.risk_level" />
    </header>
    <p class="section-content">{{ section.content }}</p>
    <footer class="section-card-foot">
      <span class="muted">段落 {{ formatRevision(section.revision) }}</span>
      <button
        class="link-btn"
        @click.stop="emit('edit', section)"
      >
        编辑段落
      </button>
    </footer>
  </article>
</template>
