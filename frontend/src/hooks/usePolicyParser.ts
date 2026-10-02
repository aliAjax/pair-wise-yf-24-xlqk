/**
 * 政策文本解析：把粘贴的原始文本按条款标题切分为结构化段落。
 * 支持的标题形态：
 * - 第 X 条 / 第 X 章（中文数字或阿拉伯数字）
 * - 1. / 1、 / 1.1 编号
 * - 一、 二、 中文序号
 * - Markdown 标题（# ~ ####）
 */

export interface ParsedSection {
  section_no: string;
  heading: string;
  content: string;
}

const HEADING_PATTERNS = [
  /^第[一二三四五六七八九十百千零〇两\d]+[条章节编]\s*(.*)$/,
  /^\d+(?:\.\d+)*[\s、.．]\s*(.*)$/,
  /^[一二三四五六七八九十]+[、.．]\s*(.*)$/,
  /^#{1,4}\s+(.*)$/
];

function matchHeading(line: string): { heading: string } | null {
  const trimmed = line.trim();
  if (!trimmed) return null;
  for (const pattern of HEADING_PATTERNS) {
    const m = trimmed.match(pattern);
    if (m) return { heading: (m[1] ?? "").trim() };
  }
  return null;
}

/** 归一化文本：去首尾空白，连续空行压缩为一个空行 */
export function normalizePolicyText(raw: string): string {
  return raw
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function parsePolicyText(raw: string): ParsedSection[] {
  const text = normalizePolicyText(raw);
  const lines = text.split("\n");
  const sections: ParsedSection[] = [];

  let current: ParsedSection | null = null;
  let no = 0;

  const pushCurrent = () => {
    if (!current) return;
    current.content = current.content.trim();
    sections.push(current);
    current = null;
  };

  for (const line of lines) {
    const hit = matchHeading(line);
    if (hit) {
      pushCurrent();
      no += 1;
      const headingText = hit.heading || line.trim();
      current = {
        section_no: String(no),
        heading: headingText,
        content: ""
      };
    } else if (current) {
      current.content += (current.content ? "\n" : "") + line;
    } else {
      // 标题前的引言文字，归入第 0 号段落
      no = 0;
      current = { section_no: "0", heading: "引言", content: line };
    }
  }
  pushCurrent();

  if (sections.length === 0) {
    return [{ section_no: "1", heading: "正文", content: text }];
  }
  return sections;
}

/** 把解析结果转为文档大纲（存 normalized_sections 字段） */
export function serializeOutline(sections: ParsedSection[]): string {
  return JSON.stringify(
    sections.map((section) => ({ section_no: section.section_no, heading: section.heading }))
  );
}

export function usePolicyParser() {
  return { parsePolicyText, normalizePolicyText, serializeOutline };
}
