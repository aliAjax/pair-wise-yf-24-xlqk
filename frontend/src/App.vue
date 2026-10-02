<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, shallowRef } from "vue";
import { ElMessage } from "element-plus";
import { routes } from "./router/routes";
import { parseHash, navigate } from "./utils/router";
import { usePolicyDocumentStore } from "./stores/PolicyDocumentStore";
import { formatVersion } from "./utils/formatters";
import DocumentsPage from "./pages/DocumentsPage.vue";
import ComparePage from "./pages/ComparePage.vue";
import RisksPage from "./pages/RisksPage.vue";
import ReviewPage from "./pages/ReviewPage.vue";
import StatCard from "./components/common/StatCard.vue";

const docStore = usePolicyDocumentStore();

const pageMap: Record<string, unknown> = {
  "/documents": DocumentsPage,
  "/compare": ComparePage,
  "/risks": RisksPage,
  "/review": ReviewPage
};

const currentPath = ref(parseHash().path);
const current = computed(() => routes.find((route) => route.route === currentPath.value) ?? routes[0]);
const currentPage = shallowRef(pageMap[currentPath.value] ?? DocumentsPage);

const onHashChange = () => {
  const location = parseHash();
  currentPath.value = location.path;
  currentPage.value = pageMap[location.path] ?? DocumentsPage;
};

onMounted(() => {
  window.addEventListener("hashchange", onHashChange);
  docStore.load();
});
onUnmounted(() => window.removeEventListener("hashchange", onHashChange));

const go = (route: string) => navigate(route);

// 版本冲突处理
const conflictVisible = computed({
  get: () => !!docStore.conflict,
  set: (value) => {
    if (!value) docStore.dismissConflict();
  }
});

const conflict = computed(() => docStore.conflict);

const onForceOverwrite = async () => {
  const result = await docStore.resolveConflictForce();
  if (result.ok) {
    ElMessage.success("已强制覆盖保存，版本号已升级");
    conflictVisible.value = false;
  }
};

const onSaveAsNew = async () => {
  const result = await docStore.resolveConflictSaveAsNew();
  if (result.ok) {
    ElMessage.success("已另存为新文档，原文档保留不变");
    conflictVisible.value = false;
  }
};
</script>

<template>
  <div class="shell">
    <aside>
      <div class="brand">隐私政策差异对比器</div>
      <nav>
        <button
          v-for="route in routes"
          :key="route.route"
          :class="{ active: currentPath === route.route }"
          @click="go(route.route)"
        >
          {{ route.name }}
        </button>
      </nav>
    </aside>
    <main class="page">
      <section class="page-head">
        <div>
          <p class="eyebrow">policy-diff</p>
          <h1>{{ current?.name }}</h1>
        </div>
        <el-tag type="info" effect="plain" size="small">本地数据 · 分批保存</el-tag>
      </section>
      <section class="metrics">
        <StatCard label="政策文档" :value="docStore.rows.length" />
        <StatCard label="共享枚举" :value="3" />
        <StatCard label="旧版兼容文档" :value="docStore.legacyDocs.length" />
      </section>
      <section class="workbench">
        <component :is="currentPage" />
      </section>
    </main>

    <el-dialog v-model="conflictVisible" title="文档版本冲突" width="480px">
      <div v-if="conflict" class="conflict-body">
        <el-alert type="warning" :closable="false" show-icon>
          <template #title>
            该文档已在其他标签页保存（{{ formatVersion(conflict.serverVersion) }}），
            您打开的是 {{ formatVersion(conflict.baseVersion) }}。
          </template>
        </el-alert>
        <p class="conflict-doc">
          文档：《{{ conflict.pendingDoc.title }} {{ conflict.pendingDoc.version_label }}》
        </p>
        <p class="conflict-tip">
          您的改动已保留在编辑内容中，可选择以下方式处理，改动不会丢失：
        </p>
        <ul class="conflict-options">
          <li><strong>强制覆盖</strong>：以您的内容为准保存，版本号压过对方。</li>
          <li><strong>另存为新文档</strong>：保留对方版本，您的内容另存为一份新文档。</li>
          <li><strong>取消</strong>：关闭提示，回到编辑状态继续修改。</li>
        </ul>
      </div>
      <template #footer>
        <el-button @click="conflictVisible = false">取消（保留我的改动）</el-button>
        <el-button type="success" plain @click="onSaveAsNew">另存为新文档</el-button>
        <el-button type="primary" @click="onForceOverwrite">强制覆盖</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.workbench {
  display: block;
}
.conflict-body {
  display: grid;
  gap: 12px;
}
.conflict-doc {
  margin: 0;
  font-weight: 700;
}
.conflict-tip {
  margin: 0;
  font-size: 13px;
  color: #596257;
}
.conflict-options {
  margin: 0;
  padding-left: 20px;
  font-size: 13px;
  line-height: 1.9;
  color: #3a3f38;
}
</style>
