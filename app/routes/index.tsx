import { createFileRoute, Link } from "@tanstack/react-router";
import { getDashboardData } from "../server/functions/dashboard";
import { StatCard } from "../components/app/StatCard";
import { formatPesos, formatKg } from "../utils/format";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";

const estadoColors: Record<string, string> = {
  INGRESADO: "bg-blue-100 text-blue-700",
  PREPARADO: "bg-yellow-100 text-yellow-700",
};

export const Route = createFileRoute("/")({
  loader: () => getDashboardData({ data: {} }),
  pendingComponent: HomeSkeleton,
  component: HomePage,
});

function HomeSkeleton() {
  return (
    <div className="p-7 max-w-6xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="h-7 w-28 bg-orange-50 rounded animate-pulse mb-2" />
          <div className="h-3 w-32 bg-orange-50 rounded animate-pulse" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4 mb-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-orange-100 bg-white p-5">
            <div className="h-3 w-20 bg-orange-50 rounded animate-pulse mb-3" />
            <div className="h-7 w-28 bg-orange-50 rounded animate-pulse" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-6">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-orange-100 bg-white overflow-hidden">
            <div className="h-12 bg-orange-50 animate-pulse" />
            {Array.from({ length: 3 }).map((_, j) => (
              <div key={j} className="h-12 border-b border-orange-50 bg-orange-50/50 animate-pulse" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function HomePage() {
  const { stats, pedidosPendientes, pedidosAdeudan } = Route.useLoaderData();

  return (
    <div className="p-7 max-w-6xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="font-display text-[22px] font-black text-gray-900 tracking-tight">
            Dashboard
          </h1>
          <p className="font-mono text-[11px] text-gray-400 mt-0.5">
            Resumen del mes
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard
          label="Facturado"
          value={formatPesos(stats.totalFacturado)}
        />
        <StatCard
          label="Ganancia neta"
          value={formatPesos(stats.gananciaNeta)}
        />
        <StatCard
          label="Más vendido"
          value={`${stats.productoMasVendido} (${formatKg(stats.kgProductoMasVendido)})`}
        />
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Pedidos pendientes */}
        <div className="rounded-xl border border-orange-100 bg-white overflow-hidden">
          <div className="p-5 border-b border-orange-50 flex items-center justify-between">
            <h3 className="font-mono text-[11px] uppercase tracking-wider text-gray-400">
              Pedidos pendientes
            </h3>
            <Link to="/pedidos" className="text-[#F57A28] text-sm font-medium hover:text-[#D4601A]">
              Ver todos →
            </Link>
          </div>
          {pedidosPendientes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="text-3xl mb-3">🎉</div>
              <p className="font-display text-sm font-bold text-gray-600 mb-1">Todo al día</p>
              <p className="font-mono text-[11px] text-gray-400">No hay pedidos pendientes</p>
            </div>
          ) : (
            <Table>
              <TableBody>
                {pedidosPendientes.map((p) => (
                  <TableRow
                    key={p.id}
                    className="border-orange-50 cursor-pointer hover:bg-orange-50/50"
                    asChild
                  >
                    <Link to="/pedidos/$id" params={{ id: String(p.id) }}>
                      <TableCell className="font-mono text-sm font-medium">
                        #{String(p.id).padStart(4, "0")}
                      </TableCell>
                      <TableCell className="text-sm text-gray-700">
                        {p.customerNombre || "—"}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm font-semibold">
                        {formatPesos(p.totalFinal)}
                      </TableCell>
                      <TableCell>
                        <Badge className={estadoColors[p.estado] || "bg-gray-100 text-gray-600"}>
                          {p.estado}
                        </Badge>
                      </TableCell>
                    </Link>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Adeudan pago */}
        <div className="rounded-xl border border-orange-100 bg-white overflow-hidden">
          <div className="p-5 border-b border-orange-50 flex items-center justify-between">
            <h3 className="font-mono text-[11px] uppercase tracking-wider text-gray-400">
              Adeudan pago
            </h3>
            <Link to="/pedidos" className="text-[#F57A28] text-sm font-medium hover:text-[#D4601A]">
              Ver todos →
            </Link>
          </div>
          {pedidosAdeudan.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="text-3xl mb-3">✅</div>
              <p className="font-display text-sm font-bold text-gray-600 mb-1">Sin deudas</p>
              <p className="font-mono text-[11px] text-gray-400">Todos los pagos al día</p>
            </div>
          ) : (
            <Table>
              <TableBody>
                {pedidosAdeudan.map((p) => (
                  <TableRow
                    key={p.id}
                    className="border-red-100 cursor-pointer hover:bg-red-50/50"
                    asChild
                  >
                    <Link to="/pedidos/$id" params={{ id: String(p.id) }}>
                      <TableCell className="font-mono text-sm font-medium">
                        #{String(p.id).padStart(4, "0")}
                      </TableCell>
                      <TableCell className="text-sm text-gray-700">
                        {p.customerNombre || "—"}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm font-semibold text-red-600">
                        {formatPesos(p.totalFinal)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="adeudapago">Adeuda</Badge>
                      </TableCell>
                    </Link>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </div>
  );
}
