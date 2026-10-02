import { computed, ref, type ComputedRef } from "vue";
import { guessCategory, parsePolicyText, type ParsedSectionDraft } from "../utils/policyParser";

/**
 * 粘贴文本 → 自动分段（响应式）。
 * 文本变化后立即按新内容解析，供文档导入页生成段落草稿。
 */
export function usePolicyParser(): {
  rawText: ReturnType<typeof ref<string>>;
  sections: ComputedRef<Array<ParsedSectionDraft & { category: string }>>;
  parse: (text: string) => Array<ParsedSectionDraft & { category: string }>;
} {
  const rawText = ref("");
  const parse = (text: string) =>
    parsePolicyText(text).map((section) => ({
      ...section,
      category: guessCategory(section.heading, section.content)
    }));
  const sections = computed(() => parse(rawText.value));
  return { rawText, sections, parse };
}
