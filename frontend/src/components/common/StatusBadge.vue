<script setup lang="ts">
import { computed } from "vue";
import { STATUS_TEXT } from "../../constants/statusText";

const props = defineProps<{ value: string }>();

const label = computed(() => {
  const all = {
    ...STATUS_TEXT.DiffType,
    ...STATUS_TEXT.PrivacyRiskLevel,
    ...STATUS_TEXT.ReviewStatus
  } as Record<string, string>;
  return all[props.value] ?? props.value.replace(/_/g, " ");
});

const type = computed(() => {
  switch (props.value) {
    case "ADDED":
    case "CONFIRMED":
    case "RESOLVED":
      return "success";
    case "REMOVED":
    case "HIGH":
    case "CRITICAL":
      return "danger";
    case "MODIFIED":
    case "MOVED":
    case "PENDING_REVIEW":
    case "MEDIUM":
      return "warning";
    case "OPEN":
      return "primary";
    default:
      return "info";
  }
});
</script>

<template>
  <el-tag :type="type" effect="light" round size="small">{{ label }}</el-tag>
</template>
