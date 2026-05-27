import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { getPedidos } from "../../server/functions/pedidos";
import { PageHeader } from "../../components/app/PageHeader";
import { formatPesos, formatKg } from "../../utils/format";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";

const estados = [
  { key: null, label: "Todos" },
  { key: "INGRESADO", label: "Ingresados" },
  { key: "PREPARADO", label: "Preparados" },
  { key: "ENTREGADO", label: "Entregados" },
  { key: "ADEUDA_PAGO", label: "Adeudan" },
] as const;

const estadoColors: Record<string, string> = {
  INGRESADO: "bg-blue-100 text-blue-700",
  PREPARADO: "bg-yellow-100 text-yellow-700",
  ENTREGADO: "bg-green-100 text-green-700",
  ADEUDA_PAGO: "bg-red-100 text-red-700",
};

export const Route = createFileRoute("/pedidos/")({
  loader: () => getPedidos({ data: {} }),
  pendingComponent: PedidosSkeleton,
  component: PedidosPage,
});

function PedidosSkeleton() {
  return (
    <div className="p-8">
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="h-7 w-24 bg-orange-50 rounded animate-pulse mb-2" />
          <div className="h-3 w-40 bg-orange-50 rounded animate-pulse" />
        </div>
        <div className="h-9 w-32 bg-orange-50 rounded animate-pulse" />
      </div>
      <div className="flex gap-2 mb-6">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-9 w-28 bg-orange-50 rounded animate-pulse" />
        ))}
      </div>
      <div className="rounded-xl border border-orange-100 bg-white overflow-hidden">
        <div className="h-10 bg-orange-50 animate-pulse" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-12 border-b border-orange-50 bg-orange-50/50 animate-pulse" />
        ))}
      </div>
    </div>
  );
}

function PedidosPage() {
  const { pedidos, conteos } = Route.useLoaderData();
  const [filtroEstado, setFiltroEstado] = useState<string | null>(null);

  const pedidosFiltrados = filtroEstado
    ? pedidos.filter((p) => p.estado === filtroEstado)
    : pedidos;

  return (
    <div className="p-8">
      <PageHeader
        title="Pedidos"
        subtitle="Gestión de pedidos y entregas"
        action={
          <Button asChild className="bg-[#F57A28] hover:bg-[#D4601A]">
            <Link to="/pedidos/nuevo">+ Nuevo pedido</Link>
          </Button>
        }
      />

      <div className="flex gap-2 mb-6">
        {estados.map((e) => {
          const count = e.key ? conteos[e.key] || 0 : pedidos.length;
          return (
            <button
              key={e.key || "todos"}
              onClick={() => setFiltroEstado(e.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filtroEstado === e.key
                  ? "bg-[#F57A28] text-white"
                  : "bg-white border border-orange-100 text-gray-600 hover:bg-orange-50"
              }`}
            >
              {e.label}
              <span className="ml-1.5 text-xs opacity-70">({count})</span>
            </button>
          );
        })}
      </div>

      <div className="rounded-xl border border-orange-100 bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-orange-100">
              <TableHead className="font-mono text-[11px] uppercase tracking-wider text-gray-400">
                #
              </TableHead>
              <TableHead className="font-mono text-[11px] uppercase tracking-wider text-gray-400">
                Cliente
              </TableHead>
              <TableHead className="font-mono text-[11px] uppercase tracking-wider text-gray-400">
                Productos
              </TableHead>
              <TableHead className="font-mono text-[11px] uppercase tracking-wider text-gray-400 text-right">
                Total
              </TableHead>
              <TableHead className="font-mono text-[11px] uppercase tracking-wider text-gray-400">
                Estado
              </TableHead>
              <TableHead className="font-mono text-[11px] uppercase tracking-wider text-gray-400">
                Fecha
              </TableHead>
              <TableHead className="w-8" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {pedidosFiltrados.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-gray-400">
                  No hay pedidos para mostrar
                </TableCell>
              </TableRow>
            ) : (
              pedidosFiltrados.map((pedido) => (
                <TableRow
                  key={pedido.id}
                  className="border-orange-50 cursor-pointer hover:bg-orange-50/50"
                >
                  <TableCell className="font-mono text-sm font-medium">
                    {String(pedido.id).padStart(4, "0")}
                  </TableCell>
                  <TableCell className="text-sm text-gray-700">
                    {pedido.customerNombre || "—"}
                  </TableCell>
                  <TableCell className="text-sm text-gray-500 max-w-[240px] truncate">
                    {pedido.items.map((i) => i.productNombre).join(", ")}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm font-semibold text-gray-900">
                    {formatPesos(pedido.totalFinal)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={estadoColors[pedido.estado] || "bg-gray-100 text-gray-600"}
                    >
                      {pedido.estado}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-gray-400">
                    {new Date(pedido.createdAt).toLocaleDateString("es-AR", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </TableCell>
                  <TableCell>
                    <Link
                      to="/pedidos/$id"
                      params={{ id: String(pedido.id) }}
                      className="text-[#F57A28] hover:text-[#D4601A] text-sm font-medium"
                    >
                      →
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
