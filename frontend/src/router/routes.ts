import { computed, ref } from "vue";

export interface AppRoute {
  name: string;
  route: string;
}

export const routes: AppRoute[] = [
  { name: "文档导入", route: "/documents" },
  { name: "版本对比", route: "/compare" },
  { name: "风险标注", route: "/risks" },
  { name: "审阅清单", route: "/review" }
];

const readHash = () => window.location.hash.replace(/^#/, "") || routes[0].route;
const current = ref<string>(readHash());

window.addEventListener("hashchange", () => {
  const next = readHash();
  if (routes.some((route) => route.route === next)) current.value = next;
});

export function useRouter() {
  const activeRoute = computed(() => routes.find((route) => route.route === current.value) ?? routes[0]);
  const navigate = (path: string) => {
    window.location.hash = path;
    current.value = path;
  };
  return { current, activeRoute, routes, navigate };
}
