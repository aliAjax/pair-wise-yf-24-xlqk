/**
 * 本地存储配置。新增配置项需同步 .env.example / docker-compose.yml / README 的约定保持不变，
 * 这里集中控制纯前端侧的分块与分批阈值。
 */
export const STORAGE_CONFIG = {
  /** 单条记录序列化后超过该字符数即走分块写入（localStorage 单键上限约 5MB，这里保守取值） */
  CHUNK_CHAR_THRESHOLD: 400_000,
  /** 单块字符数（base64 后写入） */
  CHUNK_SIZE: 300_000,
  /** 分批保存时每批的记录数 */
  BATCH_SIZE: 20,
  /** 批次间让步事件循环的延时（ms），避免超长保存时阻塞 UI */
  BATCH_YIELD_MS: 0
} as const;
