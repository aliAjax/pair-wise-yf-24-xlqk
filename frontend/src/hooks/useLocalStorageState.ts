import { ref, watch, type Ref } from "vue";

export interface LocalStorageStateOptions<T> {
  key: string;
  defaultValue: T;
  /** 防抖写入延时（ms），内容超长的编辑场景避免每个按键都写盘 */
  debounceMs?: number;
  /** 跨标签页改动时是否同步到本标签页（默认同步） */
  crossTabSync?: boolean;
}

/**
 * 带版本/防抖/跨标签页同步的 localStorage 状态。
 * - 编辑器里的未提交改动用它暂存，保存失败或冲突时改动仍在
 * - 读取到无法解析的旧数据时回落到默认值（兼容打开）
 */
export function useLocalStorageState<T>(options: LocalStorageStateOptions<T>): {
  state: Ref<T>;
  flush: () => void;
  reset: () => void;
} {
  const { key, defaultValue, debounceMs = 300, crossTabSync = true } = options;

  const readInitial = (): T => {
    try {
      const raw = localStorage.getItem(key);
      if (raw == null) return defaultValue;
      return JSON.parse(raw) as T;
    } catch {
      // 旧数据格式损坏：兼容方式打开，不阻断编辑
      return defaultValue;
    }
  };

  const state = ref(readInitial()) as Ref<T>;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const flush = () => {
    try {
      localStorage.setItem(key, JSON.stringify(state.value));
    } catch (error) {
      // 单键容量超限（超长内容）：提示由页面给出，这里不丢内存中的改动
      console.warn(`本地暂存写入失败 ${key}`, error);
    }
  };

  watch(
    state,
    () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(flush, debounceMs);
    },
    { deep: true }
  );

  if (crossTabSync && typeof window !== "undefined") {
    window.addEventListener("storage", (event) => {
      if (event.key !== key || event.newValue == null) return;
      try {
        state.value = JSON.parse(event.newValue) as T;
      } catch {
        // 忽略无法解析的远端写入
      }
    });
  }

  const reset = () => {
    state.value = defaultValue;
    if (timer) clearTimeout(timer);
    localStorage.removeItem(key);
  };

  return { state, flush, reset };
}
