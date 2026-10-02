<script setup lang="ts">
import { onMounted, computed, ref } from "vue";
import { ElMessage } from "element-plus";
import { usePolicyDocumentStore } from "../stores/PolicyDocumentStore";
import { usePolicySectionStore } from "../stores/PolicySectionStore";
import SectionCard from "../components/common/SectionCard.vue";

const docStore = usePolicyDocumentStore();
const sectionStore = usePolicySectionStore();

const docId = ref<number>(0);
const riskFilter = ref<string>("ALL");

onMounted(async () => {
  await Promise.all([docStore.load(), sectionStore.load()]);
  if (docStore.rows.length > 0) docId.value = docStore.rows[0].id;
});

const sections = computed(() => {
  const list = sectionStore.byDocument(docId.value);
  if (riskFilter.value === "ALL") return list;
  return list.filter((section) => section.risk_level === riskFilter.value);
});

const riskCounts = computed(() => {
  const counts: Record<string, number> = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };
  for (const section of sectionStore.byDocument(docId.value)) {
    counts[section.risk_level] = (counts[section.risk_level] ?? 0) + 1;
  }
  return counts;
});

const onRiskChange = async (section: typeof sections.value[number], level: string) => {
  await sectionStore.updateRisk({ ...section, risk_level: level });
  ElMessage.success(`已将第 ${section.section_no} 条风险等级调整为 ${level}`);
};
</script>

<template>
  <div class="risks-page">
    <el-card shadow="never" class="risk-toolbar">
      <div class="toolbar-row">
        <el-select v-model="docId" size="small" placeholder="选择文档" style="width: 240px">
          <el-option v-for="doc in docStore.rows" :key="doc.id" :label="`${doc.title} ${doc.version_label}`" :value="doc.id" />
        </el-select>
        <el-radio-group v-model="riskFilter" size="small">
          <el-radio-button value="ALL">全部</el-radio-button>
          <el-radio-button value="LOW">低风险 {{ riskCounts.LOW }}</el-radio-button>
          <el-radio-button value="MEDIUM">中风险 {{ riskCounts.MEDIUM }}</el-radio-button>
          <el-radio-button value="HIGH">高风险 {{ riskCounts.HIGH }}</el-radio-button>
          <el-radio-button value="CRITICAL">严重 {{ riskCounts.CRITICAL }}</el-radio-button>
        </el-radio-group>
      </div>
    </el-card>

    <el-empty v-if="sections.length === 0" description="暂无条款" :image-size="80" />
    <div v-else class="section-grid">
      <SectionCard
        v-for="section in sections"
        :key="section.id"
        :section="section"
        risk-editable
        @save-risk="(level: string) => onRiskChange(section, level)"
      />
    </div>
  </div>
</template>

<style scoped>
.risks-page {
  display: grid;
  gap: 14px;
}
.risk-toolbar {
  border: 1px solid #d8d6c8;
  border-radius: 8px;
  background: #fbfaf4;
}
.toolbar-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.section-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
  gap: 14px;
}
</style>
