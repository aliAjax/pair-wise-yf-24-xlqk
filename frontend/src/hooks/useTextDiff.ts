import { computed, type ComputedRef } from "vue";
import { diffLines, summarizeDiff, type DiffSummary, type DiffToken } from "../utils/diffEngine";

/**
 * 条款新旧正文的行级差异。
 * 段落内容一变，computed 自动按新内容重算，旧差异不会继续显示。
 */
export function useTextDiff(oldText: () => string, newText: () => string): {
  tokens: ComputedRef<DiffToken[]>;
  summary: ComputedRef<DiffSummary>;
} {
  const tokens = computed(() => diffLines(oldText(), newText()));
  const summary = computed(() => summarizeDiff(oldText(), newText()));
  return { tokens, summary };
}
