import { DiffType } from "../constants/DiffType";

export interface DiffSegment {
  type: "add" | "del" | "keep";
  text: string;
}

export interface SectionDiffResult {
  diffType: DiffType;
  segments: DiffSegment[];
  addedLines: number;
  removedLines: number;
  summary: string;
}

/** 按行切分，保留空行信息 */
function splitLines(text: string): string[] {
  return text.replace(/\r\n/g, "\n").split("\n");
}

/**
 * 基于 LCS（最长公共子序列）的行级差异计算。
 * 返回 add/del/keep 三段式片段，供 DiffViewer 渲染左右对比。
 */
export function diffLines(oldText: string, newText: string): DiffSegment[] {
  const oldLines = splitLines(oldText);
  const newLines = splitLines(newText);
  const m = oldLines.length;
  const n = newLines.length;

  // LCS 动态规划表
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0));
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      if (oldLines[i] === newLines[j]) dp[i][j] = dp[i + 1][j + 1] + 1;
      else dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const segments: DiffSegment[] = [];
  let i = 0;
  let j = 0;
  const push = (type: DiffSegment["type"], text: string) => {
    const last = segments[segments.length - 1];
    if (last && last.type === type) last.text += "\n" + text;
    else segments.push({ type, text });
  };

  while (i < m && j < n) {
    if (oldLines[i] === newLines[j]) {
      push("keep", oldLines[i]);
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      push("del", oldLines[i]);
      i++;
    } else {
      push("add", newLines[j]);
      j++;
    }
  }
  while (i < m) {
    push("del", oldLines[i]);
    i++;
  }
  while (j < n) {
    push("add", newLines[j]);
    j++;
  }
  return segments;
}

function countLines(segments: DiffSegment[], type: "add" | "del"): number {
  return segments
    .filter((seg) => seg.type === type)
    .reduce((sum, seg) => sum + seg.text.split("\n").length, 0);
}

/** 条款级差异分类：ADDED / REMOVED / MODIFIED / UNCHANGED */
export function classifySectionDiff(oldContent: string, newContent: string): SectionDiffResult {
  const oldEmpty = oldContent.trim().length === 0;
  const newEmpty = newContent.trim().length === 0;

  if (oldEmpty && newEmpty) {
    return { diffType: "UNCHANGED", segments: [], addedLines: 0, removedLines: 0, summary: "两版均无内容" };
  }
  if (oldEmpty) {
    const segments = diffLines("", newContent);
    const addedLines = countLines(segments, "add");
    return {
      diffType: "ADDED",
      segments,
      addedLines,
      removedLines: 0,
      summary: `新增条款，共 ${addedLines} 行`
    };
  }
  if (newEmpty) {
    const segments = diffLines(oldContent, "");
    const removedLines = countLines(segments, "del");
    return {
      diffType: "REMOVED",
      segments,
      addedLines: 0,
      removedLines,
      summary: `条款已删除，共 ${removedLines} 行`
    };
  }

  const segments = diffLines(oldContent, newContent);
  const addedLines = countLines(segments, "add");
  const removedLines = countLines(segments, "del");
  const diffType: DiffType = addedLines === 0 && removedLines === 0 ? "UNCHANGED" : "MODIFIED";
  const summary =
    diffType === "UNCHANGED"
      ? "条款内容未发生变化"
      : `条款内容变更：新增 ${addedLines} 行，删除 ${removedLines} 行`;
  return { diffType, segments, addedLines, removedLines, summary };
}

/** 供组件使用的组合式函数 */
export function useTextDiff() {
  return { diffLines, classifySectionDiff };
}
