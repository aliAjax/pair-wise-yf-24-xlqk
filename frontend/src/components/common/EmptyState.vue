<script setup lang="ts">
defineProps<{ text?: string; hint?: string }>();
</script>

<template>
  <div class="empty">
    <p>{{ text ?? "暂无数据" }}</p>
    <span v-if="hint" class="empty-hint">{{ hint }}</span>
  </div>
</template>
