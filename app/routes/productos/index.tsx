import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { getProductos } from "../../server/functions/productos";
import { PageHeader } from "../../components/app/PageHeader";
import { StatCard } from "../../components/app/StatCard";
import { StockBar } from "../../components/app/StockBar";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { formatPesos, formatKg } from "../../utils/format";

export const Route = createFileRoute("/productos/")({
  loader: () => getProductos({ data: {} }),
  component: ProductosPage,
});

function ProductosPage() {
  const productos = Route.useLoaderData();
  const [busqueda, setBusqueda] = useState("");
  const [debouncedBusqueda, setDebouncedBusqueda] = useState("");
  const [tipo, setTipo] = useState<"todos" | "por_kg" | "por_unidad" | "ambos" | "mix">("todos");
  const [verInactivos, setVerInactivos] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedBusqueda(busqueda), 300);
    return () => clearTimeout(timer);
  }, [busqueda]);

  const filtrados = productos.filter((p) => {
    if (!verInactivos && !p.activo) return false;
    if (debouncedBusqueda && !p.nombre.toLowerCase().includes(debouncedBusqueda.toLowerCase())) return false;
    if (tipo !== "todos") {
      if (tipo === "mix" && !p.esMix) return false;
      if (tipo !== "mix" && p.esMix) return false;
      if (p.tipoVenta !== tipo) return false;
    }
    return true;
  });

  const totalActivos = productos.filter((p) => p.activo).length;
  const totalMix = productos.filter((p) => p.esMix).length;
  const totalStock = productos.reduce((sum, p) => sum + Number(p.stockDisponible), 0);

  return (
    <div className="p-7 max-w-6xl">
      <PageHeader
        title="Productos"
        subtitle={`${productos.length} productos registrados`}
        action={
          <Button asChild>
            <Link to="/productos/nuevo">Nuevo producto</Link>
          </Button>
        }
      />

      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard label="Activos" value={String(totalActivos)} />
        <StatCard label="Mixes" value={String(totalMix)} />
        <StatCard label="Stock total" value={formatKg(totalStock)} />
      </div>

      <div className="flex gap-3 mb-6">
        <Input
          placeholder="Buscar producto..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="max-w-xs"
        />
        <select
          value={tipo}
          onChange={(e) => setTipo(e.target.value as typeof tipo)}
          className="rounded-lg border border-orange-200 bg-white px-3 py-2 text-sm font-mono text-gray-700"
        >
          <option value="todos">Todos</option>
          <option value="por_kg">Por kg</option>
          <option value="por_unidad">Por unidad</option>
          <option value="ambos">Ambos</option>
          <option value="mix">Mix</option>
        </select>
        <label className="flex items-center gap-2 text-sm font-mono text-gray-600 cursor-pointer">
          <input
            type="checkbox"
            checked={verInactivos}
            onChange={(e) => setVerInactivos(e.target.checked)}
            className="rounded border-orange-200"
          />
          Inactivos
        </label>
      </div>

      {filtrados.length === 0 ? (
        <div className="text-center py-12">
          <p className="font-mono text-gray-400">No se encontraron productos</p>
          <Button asChild className="mt-4">
            <Link to="/productos/nuevo">Crear el primero</Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {filtrados.map((p) => (
            <Link
              key={p.id}
              to="/productos/$id"
              params={{ id: String(p.id) }}
              className="block rounded-xl border border-orange-100 bg-white p-5 hover:border-orange-300 hover:shadow-sm transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-display text-lg font-bold text-gray-900 truncate">
                  {p.nombre}
                </h3>
                <div className="flex gap-1.5 ml-2">
                  {p.esMix && <Badge variant="mix">Mix</Badge>}
                  {!p.activo && <Badge variant="inactivo">Inactivo</Badge>}
                </div>
              </div>
              <div className="space-y-2 font-mono text-sm">
                <p className="text-gray-500">
                  {p.tipoVenta === "por_kg" && `Precio/kg: ${formatPesos(p.precioPorKg || 0)}`}
                  {p.tipoVenta === "por_unidad" && `Precio/u: ${formatPesos(p.precioUnidad || 0)}`}
                  {p.tipoVenta === "ambos" && `${formatPesos(p.precioPorKg || 0)}/kg · ${formatPesos(p.precioUnidad || 0)}/u`}
                </p>
                <StockBar value={Number(p.stockDisponible)} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
