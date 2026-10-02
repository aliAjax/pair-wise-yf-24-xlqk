<script setup lang="ts">
import { onMounted, computed } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { usePolicyDocumentStore } from "../stores/PolicyDocumentStore";
import { usePolicySectionStore } from "../stores/PolicySectionStore";
import { usePolicyParser } from "../hooks/usePolicyParser";
import { createDefaultPolicyDocument } from "../constructors/PolicyDocumentConstructor";
import { createDefaultPolicySection } from "../constructors/PolicySectionConstructor";
import { formatDate, formatVersion } from "../utils/formatters";
import { navigate } from "../utils/router";
import ImportPanel from "../components/common/ImportPanel.vue";

const docStore = usePolicyDocumentStore();
const sectionStore = usePolicySectionStore();
const { parsePolicyText, serializeOutline } = usePolicyParser();

onMounted(async () => {
  await Promise.all([docStore.load(), sectionStore.load()]);
});

const sectionCount = (docId: number) =>
  sectionStore.rows.filter((section) => section.document_id === docId).length;

const sortedDocs = computed(() =>
  [...docStore.rows].sort((a, b) => a.imported_at.localeCompare(b.imported_at))
);

const onImport = async (payload: { title: string; versionLabel: string; rawText: string }) => {
  const parsed = parsePolicyText(payload.rawText);
  const doc = createDefaultPolicyDocument({
    title: payload.title,
    version_label: payload.versionLabel,
    raw_text: payload.rawText,
    normalized_sections: serializeOutline(parsed)
  });
  const result = await docStore.save(doc);
  if (!result.ok || !result.doc) {
    ElMessage.warning("文档保存未完成，请处理版本冲突");
    return;
  }
  const sections = parsed.map((item) =>
    createDefaultPolicySection({
      document_id: result.doc!.id,
      section_no: item.section_no,
      heading: item.heading,
      content: item.content
    })
  );
  await sectionStore.bulkSave(sections);
  ElMessage.success(
    `导入成功：识别 ${parsed.length} 个条款${result.batches && result.batches > 1 ? `，分 ${result.batches} 批保存` : ""}`
  );
};

const onDelete = async (doc: (typeof docStore.rows)[number]) => {
  try {
    await ElMessageBox.confirm(`确认删除《${doc.title} ${doc.version_label}》及其全部条款？`, "删除确认", {
      type: "warning"
    });
  } catch {
    return;
  }
  await docStore.remove(doc.id);
  ElMessage.success("已删除");
};

const openCompare = (docId: number) => {
  // 找到该文档作为新版的最近对比，或作为旧版的对比
  navigate("/compare", { new: String(docId) });
};
</script>

<template>
  <div class="documents-page">
    <ImportPanel @import="onImport" />

    <el-card shadow="never" class="doc-list-card">
      <template #header><strong>文档列表</strong></template>
      <el-empty v-if="sortedDocs.length === 0" description="暂无文档，请先导入" :image-size="80" />
      <el-table v-else :data="sortedDocs" stripe>
        <el-table-column prop="title" label="标题" min-width="140" />
        <el-table-column prop="version_label" label="版本标签" width="100" />
        <el-table-column label="版本号" width="150">
          <template #default="{ row }">
            <el-tag :type="row.version ? 'success' : 'warning'" size="small" effect="plain">
              {{ formatVersion(row.version) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="条款数" width="90">
          <template #default="{ row }">{{ sectionCount(row.id) }}</template>
        </el-table-column>
        <el-table-column label="导入时间" width="180">
          <template #default="{ row }">{{ formatDate(row.imported_at) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="180">
          <template #default="{ row }">
            <el-button size="small" type="primary" plain @click="openCompare(row.id)">版本对比</el-button>
            <el-button size="small" type="danger" plain @click="onDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<style scoped>
.documents-page {
  display: grid;
  gap: 16px;
}
.doc-list-card {
  border: 1px solid #d8d6c8;
  border-radius: 8px;
  background: #fbfaf4;
}
</style>
