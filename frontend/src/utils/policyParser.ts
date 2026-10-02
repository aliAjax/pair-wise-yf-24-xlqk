import type { PolicySection } from "../types/PolicySection";

export interface ParsedSectionDraft {
  section_no: string;
  heading: string;
  content: string;
}

/** 中文数字（覆盖到九十九）与阿拉伯数字都支持 */
const CN_NUMBERS: Record<string, number> = { 零: 0, 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 };

const cnToNumber = (raw: string): number | null => {
  const text = raw.trim();
  if (/^\d+$/.test(text)) return Number(text);
  if (text === "十") return 10;
  const tenIndex = text.indexOf("十");
  if (tenIndex >= 0) {
    const tens = tenIndex === 0 ? 1 : CN_NUMBERS[text[tenIndex - 1]];
    const onesText = text.slice(tenIndex + 1);
    const ones = onesText ? CN_NUMBERS[onesText] ?? 0 : 0;
    if (tens == null) return null;
    return tens * 10 + ones;
  }
  return CN_NUMBERS[text] ?? null;
};

const HEADING_PATTERN = /^\s*(?:第?\s*([0-9零一两二三四五六七八九十百]+)\s*[、.．]?\s*|([0-9]+)[.．]\s*)?(.{2,30})?$/;

const SECTION_LINE = /^\s*(?:第\s*([0-9零一两二三四五六七八九十百]+)\s*[条章节]|([0-9零一两二三四五六七八九十百]+)\s*[、.．])\s*(.*)$/;

const CATEGORY_KEYWORDS: Array<[RegExp, string]> = [
  [/收集|采集|设备|标识符|cookie|个人信息/, "DATA_COLLECTION"],
  [/共享|分享|第三方|合作|转让|公开披露/, "DATA_SHARING"],
  [/保存期限|存储|留存|删除|销毁/, "DATA_RETENTION"],
  [/权利|查询|更正|撤回|注销|投诉/, "USER_RIGHTS"],
  [/联系|客服|邮箱|电话/, "CONTACT"]
];

export const guessCategory = (heading: string, content: string): string => {
  const text = `${heading} ${content}`;
  for (const [pattern, category] of CATEGORY_KEYWORDS) {
    if (pattern.test(text.toLowerCase()) || pattern.test(text)) return category;
  }
  return "OTHER";
};

/**
 * 隐私政策文本分段：
 * 识别“一、标题 / 第一条 标题 / 1. 标题”等开头，标题之后到下一条之间为正文。
 * 无法识别编号时整体作为一个段落，保证粘贴内容不丢失。
 */
export function parsePolicyText(rawText: string): ParsedSectionDraft[] {
  const lines = rawText.replace(/\r\n/g, "\n").split("\n");
  const sections: ParsedSectionDraft[] = [];
  let current: ParsedSectionDraft | null = null;
  let fallbackBuffer: string[] = [];

  const pushFallback = () => {
    const content = fallbackBuffer.join("\n").trim();
    if (content && !current) {
      sections.push({ section_no: "一", heading: "正文", content });
    }
    fallbackBuffer = [];
  };

  lines.forEach((line) => {
    const match = line.match(SECTION_LINE);
    if (match) {
      pushFallback();
      if (current) sections.push(current);
      const noRaw = match[1] ?? match[2] ?? "";
      const heading = (match[3] ?? "").trim();
      current = { section_no: noRaw, heading, content: "" };
      return;
    }
    // 形如 “一、收集” 的独立标题行
    const loose = line.trim().match(HEADING_PATTERN);
    if (loose && loose[3] && line.trim().length <= 20 && !/[。；;！？!?]/.test(line)) {
      const noRaw = loose[1] ?? loose[2] ?? "";
      const num = cnToNumber(noRaw);
      if (num != null) {
        pushFallback();
        if (current) sections.push(current);
        current = { section_no: noRaw, heading: loose[3].trim(), content: "" };
        return;
      }
    }
    if (current) {
      current.content = current.content ? `${current.content}\n${line.trim()}` : line.trim();
      // 标题可能写在编号同一行，也允许首行正文补足标题
      if (!current.heading) current.heading = line.trim().slice(0, 20);
    } else {
      fallbackBuffer.push(line);
    }
  });
  pushFallback();
  if (current) sections.push(current);
  return sections.filter((section) => section.heading || section.content);
}

export const toNormalizedSections = (sections: Array<Pick<PolicySection, "section_no" | "heading">>): string =>
  sections.map((section) => `${section.section_no}、${section.heading}`).join("|");

export { cnToNumber };
