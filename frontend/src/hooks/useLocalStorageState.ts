import { ref } from "vue";
import { readCollection, writeCollection, type WriteResult } from "../utils/storage";

/**
 * localStorage 集合状态的组合式封装：
 * - 初始化时从 localStorage 读取（自动兼容分批数据与旧版本数据）
 * - 写入时自动分批保存，内容超长也不丢数据
 */
export function useLocalStorageState<T extends { id: number }>(key: string) {
  const rows = ref<T[]>(readCollection<T>(key)) as ReturnType<typeof ref<T[]>>;
  const lastWrite = ref<WriteResult | null>(null);

  const reload = () => {
    rows.value = readCollection<T>(key);
  };

  const persist = (next: T[]): WriteResult => {
    const result = writeCollection(key, next);
    rows.value = next;
    lastWrite.value = result;
    return result;
  };

  return { rows, lastWrite, reload, persist };
}
