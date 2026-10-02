<script setup lang="ts">
import { ref, watch } from "vue";
import type { PolicySection } from "../../types/PolicySection";
import type { DiffType } from "../../constants/DiffType";
import StatusBadge from "./StatusBadge.vue";
import RiskTag from "./RiskTag.vue";

const props = defineProps<{
  section: PolicySection;
  diffType?: DiffType;
  editable?: boolean;
  riskEditable?: boolean;
}>();

const emit = defineEmits<{
  (e: "save-content", content: string): void;
  (e: "save-risk", level: string): void;
}>();

const editing = ref(false);
  const draft = ref(props.section.content);

watch(
  () => props.section.content,
  (value) => {
    if (!editing.value) draft.value = value;
  }
);

const startEdit = () => {
  draft.value = props.section.content;
  editing.value = true;
};
const cancelEdit = () => {
  editing.value = false;
  draft.value = props.section.content;
};
const saveEdit = () => {
  emit("save-content", draft.value);
  editing.value = false;
};

const riskLevels = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
const onRiskChange = (level: string) => emit("save-risk", level);
</script>

<template>
  <el-card class="section-card" shadow="never">
    <template #header>
      <div class="card-head">
        <div class="head-title">
          <span class="section-no">第 {{ section.section_no }} 条</span>
          <strong>{{ section.heading }}</strong>
        </div>
        <div class="head-tags">
          <StatusBadge v-if="diffType" :value="diffType" />
          <RiskTag :level="section.risk_level" />
        </div>
      </div>
    </template>

    <div v-if="!editing" class="section-content">
      <p v-for="(line, idx) in section.content.split('\n')" :key="idx">{{ line }}</p>
    </div>
    <div v-else class="section-edit">
      <el-input v-model="draft" type="textarea" :rows="6" resize="vertical" />
      <div class="edit-actions">
        <el-button size="small" @click="cancelEdit">取消</el-button>
        <el-button size="small" type="primary" @click="saveEdit">保存并重算差异</el-button>
      </div>
    </div>

    <div class="card-foot">
      <span class="category">{{ section.category }}</span>
      <el-select
        v-if="riskEditable"
        :model-value="section.risk_level"
        size="small"
        style="width: 110px"
        @change="onRiskChange"
      >
        <el-option v-for="level in riskLevels" :key="level" :label="`风险：${level}`" :value="level" />
      </el-select>
      <el-button v-if="editable && !editing" size="small" @click="startEdit">编辑条款</el-button>
    </div>
  </el-card>
</template>

<style scoped>
.section-card {
  border: 1px solid #d8d6c8;
  border-radius: 8px;
  background: #fbfaf4;
}
.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.head-title {
  display: flex;
  align-items: baseline;
  gap: 10px;
  min-width: 0;
}
.section-no {
  font-size: 12px;
  color: #7d4d18;
  font-weight: 700;
  white-space: nowrap;
}
.head-tags {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}
.section-content p {
  margin: 0 0 6px;
  line-height: 1.7;
  color: #2c302a;
  white-space: pre-wrap;
}
.section-content p:last-child {
  margin-bottom: 0;
}
.edit-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 8px;
}
.card-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px dashed #d8d6c8;
}
.category {
  font-size: 12px;
  color: #596257;
}
</style>
