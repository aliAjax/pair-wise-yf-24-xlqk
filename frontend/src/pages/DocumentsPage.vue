<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { storeToRefs } from "pinia";
import { usePolicyDocumentStore } from "../stores/PolicyDocumentStore";
import { usePolicySectionStore } from "../stores/PolicySectionStore";
import { useDiffResultStore } from "../stores/DiffResultStore";
import { useReviewNoteStore } from "../stores/ReviewNoteStore";
import { useConflictDraftStore } from "../stores/ConflictDraftStore";
import ImportPanel from "../components/common/ImportPanel.vue";
import SectionCard from "../components/common/SectionCard.vue";
import ConflictBanner from "../components/common/ConflictBanner.vue";
import EmptyState from "../components/common/EmptyState.vue";
import type { PolicySection } from "../types/PolicySection";
import { formatDate, formatRevision } from "../utils/formatters";

const documentStore = usePolicyDocumentStore();
const sectionStore = usePolicySectionStore();
const diffStore = useDiffResultStore();
const noteStore = useReviewNoteStore();
const draftStore = useConflictDraftStore();

const { rows: documents, lastBatchProgress } = storeToRefs(documentStore);
const importing = ref(false);
const selectedDocumentId = ref<number | null>(null);

const editing = reactive({
  visible: false,
  id: 0,
  documentId: 0,
  section_no: "",
  heading: "",
  content: "",
  risk_level: "LOW",
  /** 打开编辑器瞬间的文档版本号——保存时按它判断先后 */
  baseRevision: 1
});

onMounted(async () => {
  await Promise.all([
    documentStore.load(),
    sectionStore.load(),
    diffStore.load(),
    noteStore.load(),
    draftStore.load()
  ]);
  selectedDocumentId.value = documents.value[0]?.id ?? null;
});

const selectedDocument = computed(() => documents.value.find((doc) => doc.id === selectedDocumentId.value) ?? null);
const sectionsOfSelected = computed(() =>
  selectedDocumentId.value ? sectionStore.byDocument(selectedDocumentId.value) : []
);

const onImport = async (payload: { title: string; version_label: string; raw_text: string }) => {
  importing.value = true;
  try {
    const result = await documentStore.importDocument(payload);
    await sectionStore.load();
    selectedDocumentId.value = result.document.id;
    ElMessage.success(`导入完成：${result.sectionCount} 个段落已分批保存`);
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : "导入失败");
  } finally {
    importing.value = false;
  }
};

const openEditor = (section: PolicySection) => {
  const doc = documents.value.find((item) => item.id === section.document_id);
  Object.assign(editing, {
    visible: true,
    id: section.id,
    documentId: section.document_id,
    section_no: section.section_no,
    heading: section.heading,
    content: section.content,
    risk_level: section.risk_level,
    // 编辑开始时锚定版本号；另一标签页若先保存，这里的提交即“晚到的那次”
    baseRevision: doc?.revision ?? section.revision
  });
};

const saveEditing = async () => {
  const original = sectionStore.byId(editing.id);
  if (!original) return;
  const nextSection: PolicySection = {
    ...original,
    section_no: editing.section_no,
    heading: editing.heading,
    content: editing.content,
    risk_level: editing.risk_level
  };
  const outcome = await sectionStore.saveSection(nextSection, editing.baseRevision);
  if (outcome.ok) {
    const recheck = outcome.impact?.recheckNoteIds.length ?? 0;
    ElMessage.success(
      `段落已保存并按新内容重算差异（${outcome.impact?.changedStableKeys.length ?? 0} 条），${recheck} 条旧备注已标待复核`
    );
    editing.visible = false;
    return;
  }
  // 晚到保存：不关闭编辑器、不清空内容；提示冲突并引导去冲突草稿处理
  await ElMessageBox.alert(
    `${outcome.error?.message ?? "版本冲突"}。你刚编辑的内容仍保留在此窗口，也已自动存入冲突草稿，刷新页面不会丢失。`,
    "保存冲突",
    { confirmButtonText: "我知道了", type: "warning" }
  );
  // 同步编辑器锚定版本为当前最新，便于用户在当前内容基础上再保存
  const latest = documents.value.find((doc) => doc.id === editing.documentId);
  if (latest) editing.baseRevision = latest.revision;
  await draftStore.load();
};
</script>

<template>
  <div class="page-grid">
    <ConflictBanner
      :drafts="draftStore.pending"
      @merge="draftStore.merge($event.id)"
      @discard="draftStore.discard($event.id)"
    />
    <ImportPanel :saving="importing" :progress="lastBatchProgress" @import="onImport" />

    <section class="panel">
      <h2>文档版本</h2>
      <EmptyState v-if="documents.length === 0" text="还没有导入任何文档" />
      <ul v-else class="doc-list">
        <li
          v-for="doc in documentStore.ordered"
          :key="doc.id"
          :class="{ active: doc.id === selectedDocumentId }"
          @click="selectedDocumentId = doc.id"
        >
          <div>
            <strong>{{ doc.title }}</strong>
            <span class="muted">{{ doc.version_label }} · {{ formatDate(doc.imported_at) }}</span>
          </div>
          <span class="badge doc-revision">{{ formatRevision(doc.revision) }}</span>
        </li>
      </ul>
    </section>

    <section v-if="selectedDocument" class="panel wide">
      <header class="panel-head">
        <h2>{{ selectedDocument.title }} 的段落</h2>
        <span class="muted">编辑段落保存后会立即重算差异，旧备注转为待复核</span>
      </header>
      <EmptyState v-if="sectionsOfSelected.length === 0" text="该文档暂无段落" />
      <div v-else class="section-grid">
        <SectionCard
          v-for="section in sectionsOfSelected"
          :key="section.id"
          :section="section"
          @edit="openEditor"
        />
      </div>
    </section>

    <el-dialog v-model="editing.visible" title="编辑条款段落" width="640px">
      <div class="form-grid">
        <label>
          <span>编号</span>
          <input v-model="editing.section_no" />
        </label>
        <label>
          <span>标题</span>
          <input v-model="editing.heading" />
        </label>
      </div>
      <label class="raw-label">
        <span>正文（改动保存后按新内容重算差异）</span>
        <textarea v-model="editing.content" rows="8"></textarea>
      </label>
      <p class="muted">编辑基于文档 {{ formatRevision(editing.baseRevision) }}，保存时若发现其他标签页已提交更新版本，会提示冲突且保留你的改动。</p>
      <template #footer>
        <button class="link-btn" @click="editing.visible = false">取消</button>
        <button class="primary-btn" @click="saveEditing">保存并重算</button>
      </template>
    </el-dialog>
  </div>
</template>
