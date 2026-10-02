<script setup lang="ts">
import { computed } from "vue";
import { diffLines, type DiffSegment } from "../../hooks/useTextDiff";

const props = defineProps<{
  oldContent: string;
  newContent: string;
  oldLabel?: string;
  newLabel?: string;
}>();

const segments = computed<DiffSegment[]>(() => diffLines(props.oldContent ?? "", props.newContent ?? ""));

interface LineRow {
  old?: string;
  next?: string;
  oldType?: "del" | "keep";
  newType?: "add" | "keep";
}

/** 把片段对齐成左右两行：keep 两边都显示，del 只在左，add 只在右 */
const rows = computed<LineRow[]>(() => {
  const result: LineRow[] = [];
  for (const seg of segments.value) {
    const lines = seg.text.split("\n");
    for (const line of lines) {
      if (seg.type === "keep") result.push({ old: line, next: line, oldType: "keep", newType: "keep" });
      else if (seg.type === "del") result.push({ old: line, oldType: "del" });
      else result.push({ next: line, newType: "add" });
    }
  }
  return result;
});
</script>

<template>
  <div class="diff-viewer">
    <div class="diff-col">
      <header>{{ oldLabel ?? "旧版" }}</header>
      <div
        v-for="(row, idx) in rows"
        :key="'o' + idx"
        class="diff-line"
        :class="{ del: row.oldType === 'del', keep: row.oldType === 'keep' }"
      >
        <span class="line-text">{{ row.old ?? "" }}</span>
      </div>
    </div>
    <div class="diff-col">
      <header>{{ newLabel ?? "新版" }}</header>
      <div
        v-for="(row, idx) in rows"
        :key="'n' + idx"
        class="diff-line"
        :class="{ add: row.newType === 'add', keep: row.newType === 'keep' }"
      >
        <span class="line-text">{{ row.next ?? "" }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.diff-viewer {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  border: 1px solid #d8d6c8;
  border-radius: 8px;
  overflow: hidden;
  background: #fbfaf4;
}
.diff-col {
  min-width: 0;
}
.diff-col header {
  font-size: 12px;
  font-weight: 700;
  color: #596257;
  padding: 6px 10px;
  background: #eef1e8;
  border-bottom: 1px solid #d8d6c8;
}
.diff-line {
  padding: 2px 10px;
  font-size: 12.5px;
  line-height: 1.7;
  white-space: pre-wrap;
  word-break: break-all;
  min-height: 1.7em;
}
.diff-line.del {
  background: #fde2e2;
  color: #8c2b2b;
  text-decoration: line-through;
  text-decoration-color: #d08a8a;
}
.diff-line.add {
  background: #e2f0d9;
  color: #2c5e1e;
}
.diff-line.keep {
  color: #3a3f38;
}
.line-text {
  font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
}
</style>
