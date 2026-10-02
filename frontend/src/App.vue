<script setup lang="ts">
import { computed, onMounted } from "vue";
import { useRouter } from "./router/routes";
import { useCrossTabSync } from "./hooks/useCrossTabSync";
import { useConflictDraftStore } from "./stores/ConflictDraftStore";
import { useReviewNoteStore } from "./stores/ReviewNoteStore";
import StatusBadge from "./components/common/StatusBadge.vue";
import StatCard from "./components/common/StatCard.vue";
import DocumentsPage from "./pages/DocumentsPage.vue";
import ComparePage from "./pages/ComparePage.vue";
import RisksPage from "./pages/RisksPage.vue";
import ReviewPage from "./pages/ReviewPage.vue";

const { activeRoute, routes, navigate, current } = useRouter();
const draftStore = useConflictDraftStore();
const noteStore = useReviewNoteStore();
useCrossTabSync();

onMounted(async () => {
  await Promise.all([draftStore.load(), noteStore.load()]);
});

const pageComponent = computed(() =>
  ({
    "/documents": DocumentsPage,
    "/compare": ComparePage,
    "/risks": RisksPage,
    "/review": ReviewPage
  })[current.value] ?? DocumentsPage
);
</script>

<template>
  <div class="shell">
    <aside>
      <div class="brand">隐私政策差异对比器</div>
      <nav>
        <button
          v-for="route in routes"
          :key="route.route"
          :class="{ active: activeRoute.route === route.route }"
          @click="navigate(route.route)"
        >
          {{ route.name }}
          <i v-if="route.route === '/review' && draftStore.pendingCount" class="nav-alert">
            {{ draftStore.pendingCount }}
          </i>
        </button>
      </nav>
      <p class="side-note">数据仅存本地浏览器，多标签页按文档版本号乐观并发。</p>
    </aside>
    <main class="page">
      <section class="page-head">
        <div>
          <p class="eyebrow">policy-diff</p>
          <h1>{{ activeRoute.name }}</h1>
        </div>
        <StatusBadge value="LOCAL_DATA" />
      </section>
      <section class="metrics">
        <StatCard label="待处理/待复核备注" :value="noteStore.openCount" />
        <StatCard label="冲突草稿" :value="draftStore.pendingCount" />
        <StatCard label="待复核备注" :value="noteStore.recheckRows.length" />
      </section>
      <component :is="pageComponent" />
    </main>
  </div>
</template>
