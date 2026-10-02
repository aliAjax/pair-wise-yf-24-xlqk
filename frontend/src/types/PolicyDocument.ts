export interface PolicyDocument {
  id: number;
  title: string;
  version_label: string;
  raw_text: string;
  normalized_sections: string;
  imported_at: string;
  updated_at: string;
  /** 文档版本号，每次内容/段落改动递增；用于多标签页乐观并发判断先后 */
  revision: number;
}
