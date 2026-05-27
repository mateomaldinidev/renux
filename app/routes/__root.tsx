import { createRootRoute, Outlet, useRouter, HeadContent, Scripts } from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { TanStackDevtools } from "@tanstack/react-devtools";
import { AppSidebar } from "../components/app/AppSidebar";
import { Toaster } from "../components/ui/sonner";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "RENUX — Sistema de gestión interno" },
    ],
  }),
  component: RootLayout,
});

function Document({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <HeadContent />
      </head>
      <body>{children}</body>
    </html>
  );
}

function RootLayout() {
  const router = useRouter();
  const isLogin = router.state.location.pathname === "/login";

  if (isLogin) {
    return (
      <Document>
        <Outlet />
        <Toaster />
        <Scripts />
      </Document>
    );
  }

  return (
    <Document>
      <div className="flex min-h-screen bg-[#FFF5F0]">
        <AppSidebar />
        <main className="flex-1 overflow-auto">
          <Outlet />
          <Toaster />
          <TanStackDevtools
            config={{ position: "bottom-right" }}
            plugins={[
              {
                name: "Tanstack Router",
                render: <TanStackRouterDevtoolsPanel />,
              },
            ]}
          />
        </main>
      </div>
      <Scripts />
    </Document>
  );
}
