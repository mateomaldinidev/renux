import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { getPedido, cambiarEstadoPedido } from "../../server/functions/pedidos";
import { PageHeader } from "../../components/app/PageHeader";
import { formatPesos, formatKg } from "../../utils/format";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { toast } from "sonner";

const estados: Array<"INGRESADO" | "PREPARADO" | "ENTREGADO" | "ADEUDA_PAGO"> = [
  "INGRESADO",
  "PREPARADO",
  "ENTREGADO",
  "ADEUDA_PAGO",
];

const estadoConfig: Record<string, { label: string; color: string; icon: string }> = {
  INGRESADO: { label: "Ingresado", color: "bg-blue-100 text-blue-700", icon: "📥" },
  PREPARADO: { label: "Preparado", color: "bg-yellow-100 text-yellow-700", icon: "📦" },
  ENTREGADO: { label: "Entregado", color: "bg-green-100 text-green-700", icon: "✅" },
  ADEUDA_PAGO: { label: "Adeuda pago", color: "bg-red-100 text-red-700", icon: "💰" },
};

export const Route = createFileRoute("/pedidos/$id")({
  loader: ({ params }) => getPedido({ data: { id: Number(params.id) } }),
  pendingComponent: PedidoDetalleSkeleton,
  component: PedidoDetallePage,
});

function PedidoDetalleSkeleton() {
  return (
    <div className="p-8">
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="h-7 w-32 bg-orange-50 rounded animate-pulse mb-2" />
          <div className="h-3 w-40 bg-orange-50 rounded animate-pulse" />
        </div>
        <div className="h-6 w-24 bg-orange-50 rounded animate-pulse" />
      </div>
      <div className="rounded-xl border border-orange-100 bg-white p-6 mb-6">
        <div className="h-3 w-28 bg-orange-50 rounded animate-pulse mb-4" />
        <div className="flex gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex-1 h-16 bg-orange-50 rounded animate-pulse" />
          ))}
        </div>
      </div>
      <div className="rounded-xl border border-orange-100 bg-white overflow-hidden mb-6">
        <div className="h-10 bg-orange-50 animate-pulse" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-12 border-b border-orange-50 bg-orange-50/50 animate-pulse" />
        ))}
        <div className="h-20 bg-orange-50/30 animate-pulse" />
      </div>
    </div>
  );
}

function PedidoDetallePage() {
  const pedido = Route.useLoaderData();
  const [estadoSeleccionado, setEstadoSeleccionado] = useState(pedido.estado);
  const [showFifo, setShowFifo] = useState(false);

  const handleCambiarEstado = async (nuevoEstado: string) => {
    try {
      await cambiarEstadoPedido({
        data: { id: pedido.id, estado: nuevoEstado as typeof estados[number] },
      });
      setEstadoSeleccionado(nuevoEstado);
      toast.success(`Estado cambiado a ${estadoConfig[nuevoEstado].label}`);
    } catch {
      toast.error("Error al cambiar el estado");
    }
  };

  return (
    <div className="p-8">
      <PageHeader
        title={`Pedido #${String(pedido.id).padStart(4, "0")}`}
        subtitle={
          pedido.customerNombre
            ? `Cliente: ${pedido.customerNombre}`
            : "Sin cliente asignado"
        }
        action={
          <Badge className={`text-sm ${estadoConfig[estadoSeleccionado].color}`}>
            {estadoConfig[estadoSeleccionado].icon} {estadoConfig[estadoSeleccionado].label}
          </Badge>
        }
      />

      {/* Pipeline de estados */}
      <div className="rounded-xl border border-orange-100 bg-white p-6 mb-6">
        <h3 className="font-mono text-[11px] uppercase tracking-wider text-gray-400 mb-4">
          Cambiar estado
        </h3>
        <div className="flex gap-3">
          {estados.map((e) => {
            const isActive = estadoSeleccionado === e;
            return (
              <button
                key={e}
                onClick={() => handleCambiarEstado(e)}
                className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? `${estadoConfig[e].color} ring-2 ring-offset-1 ring-[#F57A28]`
                    : "bg-gray-50 text-gray-500 hover:bg-gray-100"
                }`}
              >
                <span className="text-base">{estadoConfig[e].icon}</span>
                <div className="mt-1">{estadoConfig[e].label}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Items del pedido */}
      <div className="rounded-xl border border-orange-100 bg-white overflow-hidden mb-6">
        <div className="p-5 border-b border-orange-50">
          <h3 className="font-mono text-[11px] uppercase tracking-wider text-gray-400">
            Productos
          </h3>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="border-orange-100">
              <TableHead className="font-mono text-[11px] uppercase tracking-wider text-gray-400">
                Producto
              </TableHead>
              <TableHead className="font-mono text-[11px] uppercase tracking-wider text-gray-400 text-right">
                Cantidad
              </TableHead>
              <TableHead className="font-mono text-[11px] uppercase tracking-wider text-gray-400 text-right">
                Precio unit.
              </TableHead>
              <TableHead className="font-mono text-[11px] uppercase tracking-wider text-gray-400 text-right">
                Subtotal
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pedido.items.map((item) => (
              <TableRow key={item.id} className="border-orange-50">
                <TableCell className="text-sm font-medium text-gray-800">
                  {item.productNombre}
                  {item.vendidoComoUnidad && (
                    <Badge className="ml-2 bg-orange-100 text-orange-700 text-[10px]">
                      x unidad
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-right font-mono text-sm text-gray-600">
                  {formatKg(item.cantidad)}
                </TableCell>
                <TableCell className="text-right font-mono text-sm text-gray-600">
                  {formatPesos(item.precioUnitario)}
                </TableCell>
                <TableCell className="text-right font-mono text-sm font-semibold text-gray-900">
                  {formatPesos(item.subtotal)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* Resumen */}
        <div className="p-5 border-t border-orange-100 bg-orange-50/30">
          <div className="flex justify-between text-sm text-gray-500 mb-1">
            <span>Total bruto</span>
            <span className="font-mono">{formatPesos(pedido.totalBruto)}</span>
          </div>
          {Number(pedido.descuentoPct) > 0 && (
            <div className="flex justify-between text-sm text-red-500 mb-1">
              <span>Descuento ({pedido.descuentoPct}%)</span>
              <span className="font-mono">
                -{formatPesos(Number(pedido.totalBruto) * Number(pedido.descuentoPct) / 100)}
              </span>
            </div>
          )}
          <div className="flex justify-between text-base font-bold text-gray-900 pt-2 border-t border-orange-100">
            <span>Total final</span>
            <span className="font-mono text-[#F57A28]">{formatPesos(pedido.totalFinal)}</span>
          </div>
        </div>
      </div>

      {/* Trazabilidad FIFO */}
      <div className="rounded-xl border border-orange-100 bg-white overflow-hidden">
        <button
          onClick={() => setShowFifo(!showFifo)}
          className="w-full p-5 flex items-center justify-between text-left"
        >
          <h3 className="font-mono text-[11px] uppercase tracking-wider text-gray-400">
            Trazabilidad FIFO
          </h3>
          <span className="text-gray-400 text-lg">{showFifo ? "−" : "+"}</span>
        </button>
        {showFifo && (
          <div className="border-t border-orange-50">
            {pedido.items.map((item) => (
              <div key={item.id} className="p-5 border-b border-orange-50 last:border-b-0">
                <p className="text-sm font-medium text-gray-800 mb-3">{item.productNombre}</p>
                {item.lotes.length === 0 ? (
                  <p className="text-sm text-gray-400">Sin trazabilidad</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-orange-100">
                        <TableHead className="font-mono text-[10px] uppercase text-gray-400">
                          Lote
                        </TableHead>
                        <TableHead className="font-mono text-[10px] uppercase text-gray-400 text-right">
                          Consumido
                        </TableHead>
                        <TableHead className="font-mono text-[10px] uppercase text-gray-400 text-right">
                          Costo unit.
                        </TableHead>
                        <TableHead className="font-mono text-[10px] uppercase text-gray-400 text-right">
                          Costo total
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {item.lotes.map((lote) => (
                        <TableRow key={lote.id} className="border-orange-50">
                          <TableCell className="font-mono text-xs text-gray-500">
                            {new Date(lote.loteFechaCompra).toLocaleDateString("es-AR")}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs text-gray-600">
                            {formatKg(lote.cantidadConsumida)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs text-gray-600">
                            {formatPesos(lote.costoUnitarioSnapshot)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs font-semibold text-gray-700">
                            {formatPesos(
                              Number(lote.cantidadConsumida) * Number(lote.costoUnitarioSnapshot),
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
