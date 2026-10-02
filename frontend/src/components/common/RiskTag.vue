<script setup lang="ts">
import { computed } from "vue";
import { formatRisk } from "../../utils/formatters";

const props = defineProps<{ level: string }>();

const type = computed(() => {
  switch (props.level) {
    case "CRITICAL":
      return "danger";
    case "HIGH":
      return "danger";
    case "MEDIUM":
      return "warning";
    default:
      return "info";
  }
});
</script>

<template>
  <el-tag :type="type" effect="dark" size="small">{{ formatRisk(level) }}风险</el-tag>
</template>
