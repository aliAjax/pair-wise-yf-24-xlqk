<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { ElMessage } from "element-plus";
import { usePolicyDocumentStore } from "../stores/PolicyDocumentStore";
import { usePolicySectionStore } from "../stores/PolicySectionStore";
import { useDiffResultStore } from "../stores/DiffResultStore";
import DiffViewer from "../components/common/DiffViewer.vue";
import EmptyState from "../components/common/EmptyState.vue";
import { DiffType, DiffTypeText } from "../constants/DiffType";
import { formatDiffType } from "../utils/formatters";
import { sectionStableKey } from "../services/diffRecomputeService";
import type { DiffResult } from "../types/DiffResult";
import type { PolicySection } from "../types/PolicySection";

const documentStore = usePolicyDocumentStore();
const sectionStore = usePolicySectionStore();
const diffStore = useDiffResultStore();

const oldId = ref<number | null>(null);
const newId = ref<number | null>(null);
const filterType = ref<string>("ALL");
const jumpedId = ref<number | null>(null);

onMounted(async () => {
  await Promise.all([documentStore.load(), sectionStore.load(), diffStore.load()]);
  const ordered = documentStore.ordered;
  if (ordered.length >= 2) {
    newId.value = ordered[0].id;
    oldId.value = ordered[1].id;
  } else if (ordered.length === 1) {
    newId.value = ordered[0].id;
  }
});

const oldSections = computed(() => (oldId.value ? sectionStore.byDocument(oldId.value) : []));
const newSections = computed(() => (newId.value ? sectionStore.byDocument(newId.value) : []));

const pairDiffs = computed(() =>
  oldId.value && newId.value ? diffStore.forPair(oldId.value, newId.value) : diffStore.rows
);
const visibleDiffs = computed(() =>
  filterType.value === "ALL" ? pairDiffs.value : pairDiffs.value.filter((diff) => diff.diff_type === filterType.value)
);

const findNewSection = (diff: DiffResult): PolicySection | undefined =>
  sectionStore.byId(diff.section_id) ??
  newSections.value.find((section) => sectionStableKey(section) === diff.stable_key);

const findOldSection = (newSection: PolicySection | undefined): PolicySection | undefined => {
  if (!newSection) return undefined;
  return (
    oldSections.value.find((old) => old.section_no === newSection.section_no && old.heading === newSection.heading) ??
    oldSections.value.find((old) => old.section_no === newSection.section_no)
  );
};

const recompute = async () => {
  if (!newId.value) return;
  const impact = await diffStore.recompute(newId.value, oldId.value ?? undefined);
  ElMessage.success(`已按当前段落内容重算 ${impact.diffs.length} 条差异，${impact.recheckNoteIds.length} 条备注待复核`);
};

const onJump = (sectionId: number) => {
  jumpedId.value = sectionId;
  ElMessage.info(`已定位段落 #${sectionId}（可在风险标注页调整等级）`);
};
</script>

<template>
  <div class="page-grid">
    <section class="panel wide">
      <header class="panel-head">
        <h2>选择对比版本</h2>
        <button class="primary-btn" :disabled="!newId" @click="recompute">按新内容重算差异</button>
      </header>
      <div class="form-grid compare-pickers">
        <label>
          <span>旧版</span>
          <select v-model="oldId">
            <option :value="null">（无旧版）</option>
            <option v-for="doc in documentStore.ordered" :key="doc.id" :value="doc.id">
              {{ doc.title }} {{ doc.version_label }}
            </option>
          </select>
        </label>
        <label>
          <span>新版</span>
          <select v-model="newId">
            <option v-for="doc in documentStore.ordered" :key="doc.id" :value="doc.id">
              {{ doc.title }} {{ doc.version_label }}
            </option>
          </select>
        </label>
      </div>
      <div class="filter-row">
        <button
          class="chip"
          :class="{ active: filterType === 'ALL' }"
          @click="filterType = 'ALL'"
        >
          全部
        </button>
        <button
          v-for="type in DiffType"
          :key="type"
          class="chip"
          :class="{ active: filterType === type }"
          @click="filterType = type"
        >
          {{ DiffTypeText[type] === type ? formatDiffType(type) : formatDiffType(type) }}
        </button>
      </div>
    </section>

    <section class="panel wide">
      <header class="panel-head">
        <h2>差异视图（段落改动后即时重算）</h2>
        <span class="muted">{{ visibleDiffs.length }} 条</span>
      </header>
      <EmptyState v-if="visibleDiffs.length === 0" text="当前筛选下没有差异" hint="可先在文档导入页编辑段落，差异会自动重算" />
      <div v-else class="diff-list">
        <div v-for="diff in visibleDiffs" :key="diff.id" :class="{ jumped: jumpedId === diff.section_id }">
          <p class="diff-summary">
            <span class="badge" :class="`diff-${diff.diff_type.toLowerCase()}`">{{ formatDiffType(diff.diff_type) }}</span>
            {{ diff.summary }}
          </p>
          <DiffViewer
            :old-text="findOldSection(findNewSection(diff))?.content ?? ''"
            :new-text="findNewSection(diff)?.content ?? ''"
            :diff="diff"
            @jump="onJump"
          />
        </div>
      </div>
    </section>
  </div>
</template>
