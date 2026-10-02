/**
 * 轻量 hash 路由：基于现有 routes 配置的纯前端路由，无需额外依赖。
 */
import { routes } from "../router/routes";

export interface RouteLocation {
  path: string;
  query: Record<string, string>;
}

export function parseHash(): RouteLocation {
  const raw = window.location.hash.replace(/^#/, "") || "/documents";
  const [path, queryString] = raw.split("?");
  const query: Record<string, string> = {};
  if (queryString) {
    for (const pair of queryString.split("&")) {
      const [key, value] = pair.split("=");
      if (key) query[decodeURIComponent(key)] = decodeURIComponent(value ?? "");
    }
  }
  return { path: path || "/documents", query };
}

export function navigate(path: string, query?: Record<string, string>): void {
  const qs = query
    ? "?" + Object.entries(query).map(([key, value]) => `${key}=${encodeURIComponent(value)}`).join("&")
    : "";
  if (parseHash().path === path) {
    // 同路径时手动触发 hashchange
    window.location.hash = path + qs;
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  } else {
    window.location.hash = path + qs;
  }
}

export function currentRouteName(path: string): string {
  return routes.find((route) => route.route === path)?.name ?? "文档导入";
}
