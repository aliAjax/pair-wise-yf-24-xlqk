/**
 * element-plus 部分组件的类型声明要求 GlobalComponents 具备字符串索引签名，
 * 否则 vue-tsc 会报 "Index signature for type 'string' is missing in type 'GlobalComponents'"。
 * 这里通过模块合并补齐索引签名，不影响运行时。
 */
declare module "@vue/runtime-core" {
  interface GlobalComponents {
    [key: string]: any;
  }
  interface GlobalDirectives {
    [key: string]: any;
  }
}

/**
 * Vue 3.4 起全局 JSX 命名空间不再默认提供，
 * 而 element-plus 部分组件（table-v2、transfer 等）的类型声明仍引用 JSX，
 * 这里补齐最小可用的全局 JSX 类型。
 */
declare global {
  namespace JSX {
    interface ElementClass {
      $props: any;
    }
    interface ElementAttributesProperty {
      $props: any;
    }
    interface IntrinsicElements {
      [elem: string]: any;
    }
    interface IntrinsicAttributes {
      [elem: string]: any;
    }
  }
}

export {};
