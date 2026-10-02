<script setup lang="ts">
import { ref, computed } from "vue";
import { usePolicyParser } from "../../hooks/usePolicyParser";

const emit = defineEmits<{
  (e: "import", payload: { title: string; versionLabel: string; rawText: string }): void;
}>();

const { parsePolicyText } = usePolicyParser();

const title = ref("");
const versionLabel = ref("");
const rawText = ref("");

const parsedSections = computed(() => (rawText.value.trim() ? parsePolicyText(rawText.value) : []));
const longContent = computed(() => rawText.value.length > 30000);

const submit = () => {
  if (!rawText.value.trim()) return;
  emit("import", {
    title: title.value.trim() || "未命名政策",
    versionLabel: versionLabel.value.trim() || "v1.0",
    rawText: rawText.value
  });
  title.value = "";
  versionLabel.value = "";
  rawText.value = "";
};
</script>

<template>
  <el-card shadow="never" class="import-panel">
    <template #header><strong>导入政策文本</strong></template>
    <div class="form-grid">
      <el-input v-model="title" placeholder="文档标题，如：隐私政策" size="small" />
      <el-input v-model="versionLabel" placeholder="版本号，如：v2.0" size="small" />
    </div>
    <el-input
      v-model="rawText"
      type="textarea"
      :rows="10"
      placeholder="粘贴一版政策文本，支持“第 X 条 / 1. / 一、 / # 标题”等条款格式"
      class="text-area"
    />
    <div class="import-meta">
      <span v-if="parsedSections.length">已识别 {{ parsedSections.length }} 个条款</span>
      <span v-else class="hint">粘贴文本后自动分段</span>
      <el-tag v-if="longContent" type="warning" size="small">内容较长，将分批保存</el-tag>
    </div>
    <div class="import-actions">
      <el-button type="primary" size="small" :disabled="!rawText.trim()" @click="submit">导入文档</el-button>
    </div>
  </el-card>
</template>

<style scoped>
.import-panel {
  border: 1px solid #d8d6c8;
  border-radius: 8px;
  background: #fbfaf4;
}
.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-bottom: 8px;
}
.text-area {
  font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
  font-size: 13px;
}
.import-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 8px 0;
  font-size: 13px;
  color: #596257;
}
.hint {
  color: #9aa397;
}
.import-actions {
  display: flex;
  justify-content: flex-end;
}
</style>
