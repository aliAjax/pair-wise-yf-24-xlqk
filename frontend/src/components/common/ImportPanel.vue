<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { usePolicyParser } from "../../hooks/usePolicyParser";
import type { BatchProgress } from "../../types/Storage";

const props = defineProps<{
  modelValue?: string;
  panelTitle?: string;
  saving?: boolean;
  progress?: BatchProgress | null;
}>();

const emit = defineEmits<{
  (e: "update:modelValue", value: string): void;
  (e: "import", payload: { title: string; version_label: string; raw_text: string }): void;
}>();

const { rawText, sections } = usePolicyParser();

watch(
  () => props.modelValue,
  (value) => {
    if (value != null && value !== rawText.value) rawText.value = value;
  },
  { immediate: true }
);

const onInput = (value: string) => {
  rawText.value = value;
  emit("update:modelValue", value);
};

const title = ref("");
const versionLabel = ref("");

const progressText = computed(() =>
  props.progress
    ? `分批保存中 ${props.progress.batch}/${props.progress.totalBatches}（${props.progress.saved}/${props.progress.total}）`
    : ""
);

const submit = () => {
  emit("import", { title: title.value, version_label: versionLabel.value, raw_text: rawText.value ?? "" });
};
</script>

<template>
  <div class="import-panel panel">
    <h2 v-if="panelTitle">{{ panelTitle }}</h2>
    <div class="form-grid">
      <label>
        <span>文档标题</span>
        <input v-model="title" placeholder="例如：隐私政策（2026 版）" />
      </label>
      <label>
        <span>版本号</span>
        <input v-model="versionLabel" placeholder="例如：v2026.09" />
      </label>
    </div>
    <label class="raw-label">
      <span>粘贴政策全文（支持“一、标题 / 第一条 / 1.”自动分段）</span>
      <textarea
        :value="rawText ?? ''"
        @input="onInput(($event.target as HTMLTextAreaElement).value)"
        rows="10"
        placeholder="一、收集&#10;我们收集……&#10;二、共享&#10;……"
      ></textarea>
    </label>
    <div class="import-foot">
      <span class="muted">识别到 {{ sections.length }} 个段落</span>
      <button class="primary-btn" :disabled="saving || !(rawText ?? '').trim()" @click="submit">
        {{ saving ? "导入保存中…" : "导入并分段保存" }}
      </button>
    </div>
    <p v-if="progressText" class="batch-progress">{{ progressText }}</p>
    <ul v-if="sections.length" class="parse-preview">
      <li v-for="(section, index) in sections" :key="index">
        <span class="section-no">{{ section.section_no }}</span>{{ section.heading }}
        <em class="muted">{{ section.category }}</em>
      </li>
    </ul>
  </div>
</template>
