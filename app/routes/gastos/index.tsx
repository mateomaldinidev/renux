import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { getGastos, crearGasto, eliminarGasto } from "../../server/functions/gastos";
import { PageHeader } from "../../components/app/PageHeader";
import { StatCard } from "../../components/app/StatCard";
import { formatPesos } from "../../utils/format";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "../../components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { toast } from "sonner";

const categorias = [
  { key: "packaging", label: "Packaging", color: "bg-purple-50 text-purple-700 border-purple-200" },
  { key: "logistica", label: "Logística", color: "bg-blue-50 text-blue-700 border-blue-200" },
  { key: "impresiones", label: "Impresiones", color: "bg-cyan-50 text-cyan-700 border-cyan-200" },
  { key: "otros", label: "Otros", color: "bg-gray-50 text-gray-700 border-gray-200" },
] as const;

function getMesActual() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function getMesLabel(mes: string) {
  const [year, month] = mes.split("-").map(Number);
  const fecha = new Date(year, month - 1, 1);
  return fecha.toLocaleDateString("es-AR", { month: "long", year: "numeric" });
}

function navegarMes(mes: string, delta: number) {
  const [year, month] = mes.split("-").map(Number);
  const fecha = new Date(year, month - 1 + delta, 1);
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}`;
}

export const Route = createFileRoute("/gastos/")({
  loader: () => getGastos({ data: { mes: getMesActual() } }),
  pendingComponent: GastosSkeleton,
  component: GastosPage,
});

function GastosSkeleton() {
  return (
    <div className="p-7 max-w-6xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="h-7 w-20 bg-orange-50 rounded animate-pulse mb-2" />
          <div className="h-3 w-32 bg-orange-50 rounded animate-pulse" />
        </div>
        <div className="flex gap-2">
          <div className="h-8 w-8 bg-orange-50 rounded animate-pulse" />
          <div className="h-8 w-28 bg-orange-50 rounded animate-pulse" />
          <div className="h-8 w-8 bg-orange-50 rounded animate-pulse" />
          <div className="h-9 w-40 bg-orange-50 rounded animate-pulse" />
        </div>
      </div>
      <div className="grid grid-cols-4 gap-4 mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-orange-100 bg-white p-5">
            <div className="h-3 w-20 bg-orange-50 rounded animate-pulse mb-3" />
            <div className="h-7 w-24 bg-orange-50 rounded animate-pulse" />
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

function GastosPage() {
  const { gastos, totalesPorCategoria } = Route.useLoaderData();
  const [mes, setMes] = useState(getMesActual());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [descripcion, setDescripcion] = useState("");
  const [categoria, setCategoria] = useState<"packaging" | "logistica" | "impresiones" | "otros">("packaging");
  const [monto, setMonto] = useState("");
  const [fecha, setFecha] = useState(new Date().toISOString().split("T")[0]);

  const handleCrear = async () => {
    if (!descripcion.trim() || !monto) {
      toast.error("Completá todos los campos");
      return;
    }
    try {
      await crearGasto({ data: { descripcion: descripcion.trim(), categoria, monto: Number(monto), fecha } });
      toast.success("Gasto registrado");
      setDialogOpen(false);
      setDescripcion("");
      setMonto("");
      window.location.reload();
    } catch {
      toast.error("Error al registrar el gasto");
    }
  };

  const handleEliminar = async (id: number) => {
    try {
      await eliminarGasto({ data: { id } });
      toast.success("Gasto eliminado");
      window.location.reload();
    } catch {
      toast.error("Error al eliminar");
    }
  };

  const totalGeneral = Object.values(totalesPorCategoria).reduce((a, b) => a + b, 0);

  return (
    <div className="p-7 max-w-6xl">
      <PageHeader
        title="Gastos"
        subtitle={getMesLabel(mes)}
        action={
          <div className="flex gap-2 items-center">
            <button
              onClick={() => setMes(navegarMes(mes, -1))}
              className="px-2 py-1.5 rounded-lg border border-orange-100 bg-white text-sm hover:bg-orange-50"
            >
              ←
            </button>
            <span className="font-mono text-sm text-gray-600 min-w-[120px] text-center capitalize">
              {getMesLabel(mes)}
            </span>
            <button
              onClick={() => setMes(navegarMes(mes, 1))}
              className="px-2 py-1.5 rounded-lg border border-orange-100 bg-white text-sm hover:bg-orange-50"
            >
              →
            </button>
            <Button onClick={() => setDialogOpen(true)} className="bg-[#F57A28] hover:bg-[#D4601A]">
              + Registrar gasto
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-4 gap-4 mb-6">
        {categorias.map((cat) => (
          <StatCard
            key={cat.key}
            label={cat.label}
            value={formatPesos(totalesPorCategoria[cat.key] || 0)}
          />
        ))}
      </div>

      <div className="rounded-xl border border-orange-100 bg-white p-4 mb-6">
        <div className="flex justify-between items-center">
          <span className="font-mono text-[11px] uppercase tracking-wider text-gray-400">Total del mes</span>
          <span className="font-display text-2xl font-bold text-[#F57A28]">{formatPesos(totalGeneral)}</span>
        </div>
      </div>

      <div className="rounded-xl border border-orange-100 bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-orange-100">
              <TableHead className="font-mono text-[11px] uppercase tracking-wider text-gray-400">Descripción</TableHead>
              <TableHead className="font-mono text-[11px] uppercase tracking-wider text-gray-400">Categoría</TableHead>
              <TableHead className="font-mono text-[11px] uppercase tracking-wider text-gray-400 text-right">Monto</TableHead>
              <TableHead className="font-mono text-[11px] uppercase tracking-wider text-gray-400">Fecha</TableHead>
              <TableHead className="w-8" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {gastos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-gray-400">
                  No hay gastos registrados este mes
                </TableCell>
              </TableRow>
            ) : (
              gastos.map((gasto) => {
                const cat = categorias.find((c) => c.key === gasto.categoria);
                return (
                  <TableRow key={gasto.id} className="border-orange-50">
                    <TableCell className="text-sm text-gray-700">{gasto.descripcion}</TableCell>
                    <TableCell>
                      <Badge className={cat?.color || "bg-gray-50 text-gray-700 border-gray-200"}>
                        {cat?.label || gasto.categoria}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm font-semibold text-gray-900">
                      {formatPesos(gasto.monto)}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-gray-400">
                      {new Date(gasto.fecha).toLocaleDateString("es-AR")}
                    </TableCell>
                    <TableCell>
                      <button
                        onClick={() => handleEliminar(gasto.id)}
                        className="text-gray-300 hover:text-red-400 transition-colors"
                      >
                        ✕
                      </button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar gasto</DialogTitle>
            <DialogDescription>Se descontará de la ganancia neta del mes</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Descripción *</Label>
              <Input value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="ej: Bolsas de packaging" />
            </div>
            <div className="space-y-1.5">
              <Label>Categoría *</Label>
              <Select value={categoria} onValueChange={(v) => setCategoria(v as typeof categoria)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categorias.map((cat) => (
                    <SelectItem key={cat.key} value={cat.key}>{cat.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Monto *</Label>
              <Input type="number" value={monto} onChange={(e) => setMonto(e.target.value)} placeholder="ej: 5000" />
            </div>
            <div className="space-y-1.5">
              <Label>Fecha</Label>
              <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleCrear} className="bg-[#F57A28] hover:bg-[#D4601A]">Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
