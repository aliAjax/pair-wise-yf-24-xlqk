import { DiffType } from "../constants/DiffType";

/** 行级差异片段 */
export interface DiffToken {
  type: Extract<DiffType, "ADDED" | "REMOVED" | "UNCHANGED">;
  text: string;
}

export interface DiffSummary {
  type: DiffType;
  tokens: DiffToken[];
  /** 用于判断“差异是否真的变化”的稳定签名 */
  signature: string;
  /** 变化摘要（新增/删除的关键片段） */
  summaryText: string;
  addedCount: number;
  removedCount: number;
}

const splitLines = (text: string): string[] =>
  text
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

/** 基于 LCS 的行级文本差异，供 DiffViewer 与差异重算共用 */
export function diffLines(oldText: string, newText: string): DiffToken[] {
  const oldLines = splitLines(oldText);
  const newLines = splitLines(newText);
  const m = oldLines.length;
  const n = newLines.length;
  // lcs[i][j]：old 前 i 行与 new 前 j 行的最长公共子序列长度
  const lcs: number[][] = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0));
  for (let i = 1; i <= m; i += 1) {
    for (let j = 1; j <= n; j += 1) {
      lcs[i][j] = oldLines[i - 1] === newLines[j - 1]
        ? lcs[i - 1][j - 1] + 1
        : Math.max(lcs[i - 1][j], lcs[i][j - 1]);
    }
  }
  const tokens: DiffToken[] = [];
  let i = m;
  let j = n;
  while (i > 0 && j > 0) {
    if (oldLines[i - 1] === newLines[j - 1]) {
      tokens.push({ type: "UNCHANGED", text: newLines[j - 1] });
      i -= 1;
      j -= 1;
    } else if (lcs[i - 1][j] >= lcs[i][j - 1]) {
      tokens.push({ type: "REMOVED", text: oldLines[i - 1] });
      i -= 1;
    } else {
      tokens.push({ type: "ADDED", text: newLines[j - 1] });
      j -= 1;
    }
  }
  while (i > 0) {
    tokens.push({ type: "REMOVED", text: oldLines[i - 1] });
    i -= 1;
  }
  while (j > 0) {
    tokens.push({ type: "ADDED", text: newLines[j - 1] });
    j -= 1;
  }
  return tokens.reverse();
}

const compactSnippet = (text: string, max = 24): string => {
  const oneLine = text.replace(/\s+/g, " ").trim();
  return oneLine.length > max ? `${oneLine.slice(0, max)}…` : oneLine;
};

/** 对比同一条款的新旧正文，输出差异类型、行级片段与变化摘要 */
export function summarizeDiff(oldText: string, newText: string): DiffSummary {
  const tokens = diffLines(oldText, newText);
  const added = tokens.filter((token) => token.type === "ADDED");
  const removed = tokens.filter((token) => token.type === "REMOVED");
  const signature = JSON.stringify(tokens.map((token) => [token.type[0], token.text]));
  const parts: string[] = [];
  if (added.length > 0) parts.push(`新增表述“${compactSnippet(added.map((t) => t.text).join("；"))}”`);
  if (removed.length > 0) parts.push(`删除表述“${compactSnippet(removed.map((t) => t.text).join("；"))}”`);
  return {
    type: added.length === 0 && removed.length === 0 ? "UNCHANGED" : "MODIFIED",
    tokens,
    signature,
    summaryText: parts.length > 0 ? parts.join("，") : "内容未变化",
    addedCount: added.length,
    removedCount: removed.length
  };
}
