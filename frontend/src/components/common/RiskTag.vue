<script setup lang="ts">
import { computed } from "vue";
import { PrivacyRiskLevel } from "../../constants/PrivacyRiskLevel";
import { formatRisk } from "../../utils/formatters";

const props = defineProps<{ level: string }>();
const tone = computed(() => {
  if (props.level === PrivacyRiskLevel[3]) return "critical";
  if (props.level === PrivacyRiskLevel[2]) return "high";
  if (props.level === PrivacyRiskLevel[1]) return "medium";
  return "low";
});
</script>

<template>
  <span class="risk-tag" :class="`risk-${tone}`">{{ formatRisk(level) }}</span>
</template>
