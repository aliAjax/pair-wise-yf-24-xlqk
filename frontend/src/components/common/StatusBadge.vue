<script setup lang="ts">
import { computed } from "vue";
import { formatReviewStatus } from "../../utils/formatters";

const props = defineProps<{ value: string }>();
const tone = computed(() => {
  if (props.value === "RECHECK") return "recheck";
  if (props.value === "OPEN") return "open";
  if (props.value === "CONFIRMED" || props.value === "RESOLVED") return "done";
  return "muted";
});
const text = computed(() =>
  props.value === "LOCAL_DATA" || props.value === "READY"
    ? props.value.replace(/_/g, " ")
    : formatReviewStatus(props.value)
);
</script>

<template>
  <span class="badge status-badge" :class="`status-${tone}`">
    <i v-if="value === 'RECHECK'" class="dot" />
    {{ text }}
  </span>
</template>
