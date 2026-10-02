<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { storeToRefs } from "pinia";
import { usePolicyDocumentStore } from "../stores/PolicyDocumentStore";
import { usePolicySectionStore } from "../stores/PolicySectionStore";
import { useReviewNoteStore } from "../stores/ReviewNoteStore";
import { useConflictDraftStore } from "../stores/ConflictDraftStore";
import RiskTag from "../components/common/RiskTag.vue";
import ConflictBanner from "../components/common/ConflictBanner.vue";
import EmptyState from "../components/common/EmptyState.vue";
import { PrivacyRiskLevel } from "../constants/PrivacyRiskLevel";
import { formatCategory, formatRevision } from "../utils/formatters";
import type { PolicySection } from "../types/PolicySection";

const documentStore = usePolicyDocumentStore();
const sectionStore = usePolicySectionStore();
const noteStore = useReviewNoteStore();
const draftStore = useConflictDraftStore();
const { rows: documents } = storeToRefs(documentStore);

const selectedDocumentId = ref<number | null>(null);
const categoryFilter = ref("ALL");
const busy = ref(false);

onMounted(async () => {
  await Promise.all([documentStore.load(), sectionStore.load(), noteStore.load(), draftStore.load()]);
  selectedDocumentId.value = documents.value[0]?.id ?? null;
});

const sections = computed(() =>
  selectedDocumentId.value ? sectionStore.byDocument(selectedDocumentId.value) : []
);
const categories = computed(() => Array.from(new Set(sections.value.map((section) => section.category))));
const visible = computed(() =>
  categoryFilter.value === "ALL"
    ? sections.value
    : sections.value.filter((s) => s.category === categoryFilter.value)
);

const setRisk = async (section: PolicySection, risk_level: string) => {
  const doc = documents.value.find((item) => item.id === section.document_id);
  busy.value = true;
  const outcome = await sectionStore.saveMeta(section.id, { risk_level }, doc?.revision ?? section.revision);
  busy.value = false;
  if (outcome.ok) {
    ElMessage.success("风险等级已保存，关联差异已按新数据重算");
    return;
  }
  await ElMessageBox.alert(
    `${outcome.error?.message ?? "版本冲突"}。你的选择未覆盖他人内容，已保留为冲突草稿。`,
    "保存冲突",
    { type: "warning" }
  );
};

const recheckCount = computed(() => noteStore.recheckRows.length);
</script>

<template>
  <div class="page-grid">
    <ConflictBanner
      :drafts="draftStore.pending"
      @merge="draftStore.merge($event.id)"
      @discard="draftStore.discard($event.id)"
    />
    <section class="panel wide">
      <header class="panel-head">
        <h2>风险标注</h2>
        <span v-if="recheckCount" class="recheck-pill">{{ recheckCount }} 条备注待复核</span>
      </header>
      <div class="form-grid compare-pickers">
        <label>
          <span>文档</span>
          <select v-model="selectedDocumentId">
            <option v-for="doc in documents" :key="doc.id" :value="doc.id">
              {{ doc.title }} {{ doc.version_label }}（{{ formatRevision(doc.revision) }}）
            </option>
          </select>
        </label>
        <div class="filter-row">
          <button class="chip" :class="{ active: categoryFilter === 'ALL' }" @click="categoryFilter = 'ALL'">
            全部分类
          </button>
          <button
            v-for="category in categories"
            :key="category"
            class="chip"
            :class="{ active: categoryFilter === category }"
            @click="categoryFilter = category"
          >
            {{ formatCategory(category) }}
          </button>
        </div>
      </div>
    </section>

    <EmptyState v-if="visible.length === 0" text="该分类下暂无段落" />
    <div v-else class="section-grid">
      <article v-for="section in visible" :key="section.id" class="panel risk-editor">
        <header class="section-card-head">
          <div>
            <span class="section-no">{{ section.section_no }}</span>
            <strong>{{ section.heading }}</strong>
            <span class="muted">{{ formatCategory(section.category) }}</span>
          </div>
          <RiskTag :level="section.risk_level" />
        </header>
        <p class="section-content">{{ section.content }}</p>
        <footer class="risk-options">
          <button
            v-for="level in PrivacyRiskLevel"
            :key="level"
            class="chip"
            :class="{ active: section.risk_level === level }"
            :disabled="busy"
            @click="setRisk(section, level)"
          >
            {{ level }}
          </button>
        </footer>
      </article>
    </div>
  </div>
</template>
