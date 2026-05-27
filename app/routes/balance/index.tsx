import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { getBalance } from "../../server/functions/balance";
import { PageHeader } from "../../components/app/PageHeader";
import { StatCard } from "../../components/app/StatCard";
import { formatPesos, formatKg } from "../../utils/format";
import { Tabs, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { Badge } from "../../components/ui/badge";

function getMesLabel(mes: string) {
  const [year, month] = mes.split("-").map(Number);
  const fecha = new Date(year, month - 1, 1);
  return fecha.toLocaleDateString("es-AR", { month: "short", year: "numeric" });
}

function getUltimos12Meses() {
  const meses: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("es-AR", { month: "long", year: "numeric" });
    meses.push({ value, label });
  }
  return meses;
}

export const Route = createFileRoute("/balance/")({
  loader: () => getBalance({ data: { periodo: "mes" } }),
  pendingComponent: BalanceSkeleton,
  component: BalancePage,
});

function BalanceSkeleton() {
  return (
    <div className="p-7 max-w-6xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="h-7 w-20 bg-orange-50 rounded animate-pulse mb-2" />
          <div className="h-3 w-40 bg-orange-50 rounded animate-pulse" />
        </div>
        <div className="flex gap-3">
          <div className="h-10 w-48 bg-orange-50 rounded animate-pulse" />
          <div className="h-9 w-44 bg-orange-50 rounded animate-pulse" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4 mb-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-orange-100 bg-white p-5">
            <div className="h-3 w-24 bg-orange-50 rounded animate-pulse mb-3" />
            <div className="h-7 w-28 bg-orange-50 rounded animate-pulse" />
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-orange-100 bg-white p-6 mb-6">
        <div className="h-5 w-32 bg-orange-50 rounded animate-pulse mb-3" />
        <div className="h-9 w-48 bg-orange-50 rounded animate-pulse" />
      </div>
      <div className="rounded-xl border border-orange-100 bg-white p-6 mb-6">
        <div className="h-3 w-48 bg-orange-50 rounded animate-pulse mb-6" />
        <div className="flex items-end gap-3 h-40">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex-1 bg-orange-50 rounded animate-pulse" />
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-6 mb-6">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-orange-100 bg-white p-6">
            <div className="h-3 w-32 bg-orange-50 rounded animate-pulse mb-4" />
            {Array.from({ length: 3 }).map((_, j) => (
              <div key={j} className="h-8 w-full bg-orange-50 rounded animate-pulse mb-2" />
            ))}
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-orange-100 bg-white overflow-hidden">
        <div className="h-10 bg-orange-50 animate-pulse" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-12 border-b border-orange-50 bg-orange-50/50 animate-pulse" />
        ))}
      </div>
    </div>
  );
}

function BalancePage() {
  const balance = Route.useLoaderData();
  const [periodo, setPeriodo] = useState<"mes" | "anio">("mes");
  const [mes, setMes] = useState(new Date().toISOString().slice(0, 7));

  const { stats, historialMensual, detalleProductos, productosMasVendidos, productosMenosVendidos } = balance;

  const maxFacturado = Math.max(...historialMensual.map((h) => h.facturado), 1);

  return (
    <div className="p-7 max-w-6xl">
      <PageHeader
        title="Balance"
        subtitle="Métricas y estadísticas"
        action={
          <div className="flex gap-3 items-center">
            <Tabs value={periodo} onValueChange={(v) => setPeriodo(v as "mes" | "anio")}>
              <TabsList>
                <TabsTrigger value="mes">Este mes</TabsTrigger>
                <TabsTrigger value="anio">Último año</TabsTrigger>
              </TabsList>
            </Tabs>
            {periodo === "mes" && (
              <Select value={mes} onValueChange={setMes}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {getUltimos12Meses().map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        }
      />

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <StatCard label="Facturado" value={formatPesos(stats.totalFacturado)} />
        <StatCard label="Costo mercadería" value={formatPesos(stats.costoMercaderia)} />
        <StatCard label="Gastos operativos" value={formatPesos(stats.gastosOperativos)} />
      </div>

      {/* Ganancia neta - card prominente */}
      <div className="rounded-xl border border-[#F57A28] bg-[#F57A28] text-white p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-wider text-white/70 mb-1">
              Ganancia neta
            </p>
            <p className="font-display text-[36px] font-black leading-none">
              {formatPesos(stats.gananciaNeta)}
            </p>
          </div>
          <div className="text-right">
            <p className="font-mono text-[11px] text-white/70 mb-1">Margen</p>
            <p className="font-display text-3xl font-bold">{stats.margenPct.toFixed(1)}%</p>
          </div>
        </div>
      </div>

      {/* Grafico de barras - historial mensual */}
      <div className="rounded-xl border border-orange-100 bg-white p-6 mb-6">
        <h3 className="font-mono text-[11px] uppercase tracking-wider text-gray-400 mb-6">
          Facturación últimos 6 meses
        </h3>
        <div className="flex items-end gap-3 h-40">
          {historialMensual.map((h) => {
            const heightPct = maxFacturado > 0 ? (h.facturado / maxFacturado) * 100 : 0;
            return (
              <div key={h.mes} className="flex-1 flex flex-col items-center gap-2">
                <span className="font-mono text-[10px] text-gray-500">
                  {h.facturado > 0 ? formatPesos(h.facturado) : "—"}
                </span>
                <div
                  className="w-full bg-[#F57A28]/20 rounded-t-sm transition-all duration-500 relative"
                  style={{ height: `${Math.max(heightPct, 2)}%` }}
                >
                  <div
                    className="absolute bottom-0 left-0 right-0 bg-[#F57A28] rounded-t-sm"
                    style={{ height: `${Math.max(heightPct, 2)}%` }}
                  />
                </div>
                <span className="font-mono text-[9px] text-gray-400">
                  {getMesLabel(h.mes).split(" ")[0]}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Ranking mas/menos vendidos */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        <div className="rounded-xl border border-orange-100 bg-white p-6">
          <h3 className="font-mono text-[11px] uppercase tracking-wider text-gray-400 mb-4">
            Más vendidos
          </h3>
          <div className="space-y-3">
            {productosMasVendidos.map((p, i) => {
              const maxKg = Math.max(...productosMasVendidos.map((x) => x.kgVendidos), 1);
              const pct = (p.kgVendidos / maxKg) * 100;
              return (
                <div key={i}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-700">{p.producto}</span>
                    <span className="font-mono text-gray-500">{formatKg(p.kgVendidos)}</span>
                  </div>
                  <div className="h-1.5 bg-orange-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#F57A28] rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-xl border border-orange-100 bg-white p-6">
          <h3 className="font-mono text-[11px] uppercase tracking-wider text-gray-400 mb-4">
            Menos vendidos
          </h3>
          <div className="space-y-3">
            {productosMenosVendidos.map((p, i) => {
              const maxKg = Math.max(...productosMenosVendidos.map((x) => x.kgVendidos), 1);
              const pct = maxKg > 0 ? (p.kgVendidos / maxKg) * 100 : 0;
              return (
                <div key={i}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-700">{p.producto}</span>
                    <span className="font-mono text-gray-500">{formatKg(p.kgVendidos)}</span>
                  </div>
                  <div className="h-1.5 bg-orange-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gray-300 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tabla detalle por producto */}
      <div className="rounded-xl border border-orange-100 bg-white overflow-hidden">
        <div className="p-5 border-b border-orange-50">
          <h3 className="font-mono text-[11px] uppercase tracking-wider text-gray-400">
            Detalle por producto
          </h3>
        </div>
        {detalleProductos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="font-mono text-sm text-gray-400">Sin datos para el período seleccionado</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-orange-100">
                <TableHead className="font-mono text-[11px] uppercase tracking-wider text-gray-400">Producto</TableHead>
                <TableHead className="font-mono text-[11px] uppercase tracking-wider text-gray-400 text-right">Kg vendidos</TableHead>
                <TableHead className="font-mono text-[11px] uppercase tracking-wider text-gray-400 text-right">Facturado</TableHead>
                <TableHead className="font-mono text-[11px] uppercase tracking-wider text-gray-400 text-right">Costo FIFO</TableHead>
                <TableHead className="font-mono text-[11px] uppercase tracking-wider text-gray-400 text-right">Ganancia</TableHead>
                <TableHead className="font-mono text-[11px] uppercase tracking-wider text-gray-400 text-right">Margen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {detalleProductos.map((p) => (
                <TableRow key={p.id} className="border-orange-50">
                  <TableCell className="text-sm font-medium text-gray-800">{p.nombre}</TableCell>
                  <TableCell className="text-right font-mono text-sm text-gray-600">{formatKg(p.kgVendidos)}</TableCell>
                  <TableCell className="text-right font-mono text-sm text-gray-900">{formatPesos(p.facturado)}</TableCell>
                  <TableCell className="text-right font-mono text-sm text-gray-500">{formatPesos(p.costoFIFO)}</TableCell>
                  <TableCell className={`text-right font-mono text-sm font-semibold ${p.ganancia >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {formatPesos(p.ganancia)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge className={p.margenPct >= 0 ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-600 border-red-200"}>
                      {p.margenPct.toFixed(1)}%
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
