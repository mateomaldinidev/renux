import { Link, useRouter } from "@tanstack/react-router";
import { logout } from "../../server/functions/auth";

const navItems = [
  { to: "/", label: "Home", icon: "🏠" },
  { to: "/productos", label: "Productos", icon: "📦" },
  { to: "/pedidos", label: "Pedidos", icon: "🛒" },
  { to: "/gastos", label: "Gastos", icon: "💸" },
  { to: "/clientes", label: "Clientes", icon: "👤" },
  { to: "/balance", label: "Balance", icon: "📊" },
];

export function AppSidebar() {
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.navigate({ to: "/login" });
  };

  return (
    <aside className="w-[220px] bg-white border-r border-orange-100 flex flex-col flex-shrink-0 min-h-screen">
      <div className="px-5 py-5 border-b border-orange-50">
        <span className="text-2xl font-black text-[#F57A28] tracking-tight">
          RENUX
        </span>
      </div>

      <nav className="flex-1 py-2">
        {navItems.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="flex items-center gap-3 px-5 py-2.5 text-sm text-gray-500 hover:bg-orange-50 hover:text-gray-800 transition-colors"
            activeProps={{
              className:
                "text-[#F57A28] bg-orange-50 border-r-2 border-[#F57A28] font-medium",
            }}
            activeOptions={{ exact: item.to === "/" }}
          >
            <span className="text-base w-5 text-center">{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>

      <button
        onClick={handleLogout}
        className="flex items-center gap-3 px-5 py-4 text-sm text-gray-400 hover:text-red-400 border-t border-orange-50 transition-colors"
      >
        <span>🚪</span>
        Cerrar sesión
      </button>
    </aside>
  );
}
