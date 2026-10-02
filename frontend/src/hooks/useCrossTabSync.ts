import { onMounted, onUnmounted } from "vue";
import { localRepository } from "../utils/localRepository";
import { usePolicyDocumentStore } from "../stores/PolicyDocumentStore";
import { usePolicySectionStore } from "../stores/PolicySectionStore";
import { useDiffResultStore } from "../stores/DiffResultStore";
import { useReviewNoteStore } from "../stores/ReviewNoteStore";
import { useConflictDraftStore } from "../stores/ConflictDraftStore";

/**
 * 跨标签页协调器（整个应用只挂一个）：
 * 其他标签页提交后，本页收到 storage 事件 → 相关 store 全部重新拉取，
 * 保证继续保存时的版本判断以磁盘为准，也不会继续显示旧差异/旧备注。
 */
export function useCrossTabSync() {
  let unsubscribe: (() => void) | null = null;

  onMounted(() => {
    unsubscribe = localRepository.bindCrossTab((event) => {
      const documentStore = usePolicyDocumentStore();
      const sectionStore = usePolicySectionStore();
      const diffStore = useDiffResultStore();
      const noteStore = useReviewNoteStore();
      const draftStore = useConflictDraftStore();

      if (event.collection === "*" || event.reason.includes("draft")) {
        draftStore.load();
        return;
      }
      // 段落/文档/差异/备注在一次保存中联动落盘，任一变动都整体刷新
      void Promise.all([
        documentStore.load(),
        sectionStore.load(),
        diffStore.load(),
        noteStore.load(),
        draftStore.load()
      ]);
    });
  });

  onUnmounted(() => {
    unsubscribe?.();
  });
}
