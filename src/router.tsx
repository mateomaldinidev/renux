import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import "./styles.css";

export function getRouter() {
  const router = createRouter({
    routeTree,
    defaultPreload: "intent",
    scrollRestoration: true,
  });
  return router;
}

export const router = getRouter();
export default router;

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
