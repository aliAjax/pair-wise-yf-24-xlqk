/**
 * 冒烟测试引导：为 Node 环境补齐最小 localStorage（Node 20 已自带 btoa/atob）。
 * 不引入测试框架，保持脚手架依赖最小。
 */
class MemoryStorage {
  private map = new Map<string, string>();

  get length(): number {
    return this.map.size;
  }

  getItem(key: string): string | null {
    return this.map.has(key) ? (this.map.get(key) as string) : null;
  }

  setItem(key: string, value: string): void {
    this.map.set(key, String(value));
  }

  removeItem(key: string): void {
    this.map.delete(key);
  }

  clear(): void {
    this.map.clear();
  }

  key(index: number): string | null {
    return Array.from(this.map.keys())[index] ?? null;
  }
}

export const vi = {
  bootstrap(): void {
    const g = globalThis as unknown as {
      localStorage?: Storage;
      window?: { addEventListener: () => void; removeEventListener: () => void; localStorage: Storage };
      addEventListener?: () => void;
    };
    g.localStorage = g.localStorage ?? (new MemoryStorage() as unknown as Storage);
    g.addEventListener = g.addEventListener ?? (() => undefined);
    g.window = g.window ?? {
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      localStorage: g.localStorage as Storage
    };
  }
};
