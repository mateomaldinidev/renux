import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { getProducto, updateProducto, registrarLote, registrarMerma } from "../../server/functions/productos";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Badge } from "../../components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "../../components/ui/dialog";
import { StockBar } from "../../components/app/StockBar";
import { formatPesos, formatKg } from "../../utils/format";
import { toast } from "sonner";

export const Route = createFileRoute("/productos/$id")({
  loader: ({ params }) => getProducto({ data: { id: Number(params.id) } }),
  component: ProductoDetallePage,
});

function ProductoDetallePage() {
  const router = useRouter();
  const { producto, lotes, componentes, mermas } = Route.useLoaderData();
  const [editando, setEditando] = useState(false);
  const [nombre, setNombre] = useState(producto.nombre);
  const [precioPorKg, setPrecioPorKg] = useState(producto.precioPorKg || "");
  const [precioUnidad, setPrecioUnidad] = useState(producto.precioUnidad || "");
  const [pesoUnidad, setPesoUnidad] = useState(producto.pesoUnidad || "");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [mermaDialogOpen, setMermaDialogOpen] = useState(false);

  const [loteCantidad, setLoteCantidad] = useState("");
  const [loteCosto, setLoteCosto] = useState("");
  const [loteFecha, setLoteFecha] = useState(new Date().toISOString().split("T")[0]);

  const [mermaCantidad, setMermaCantidad] = useState("");
  const [mermaMotivo, setMermaMotivo] = useState("");
  const [mermaFecha, setMermaFecha] = useState(new Date().toISOString().split("T")[0]);

  const handleGuardar = async () => {
    try {
      await updateProducto({
        data: {
          id: producto.id,
          nombre,
          precioPorKg: precioPorKg || undefined,
          precioUnidad: precioUnidad || undefined,
          pesoUnidad: pesoUnidad || undefined,
        },
      });
      toast.success("Producto actualizado");
      setEditando(false);
      router.navigate({ to: "/productos/$id", params: { id: String(producto.id) }, replace: true });
    } catch {
      toast.error("Error al actualizar");
    }
  };

  const handleAgregarLote = async () => {
    if (!loteCantidad || !loteCosto) {
      toast.error("Completá todos los campos");
      return;
    }
    try {
      await registrarLote({
        data: {
          productId: producto.id,
          cantidadKg: Number(loteCantidad),
          costoUnitario: Number(loteCosto),
          fechaCompra: loteFecha,
        },
      });
      toast.success("Lote registrado");
      setDialogOpen(false);
      setLoteCantidad("");
      setLoteCosto("");
      router.navigate({ to: "/productos/$id", params: { id: String(producto.id) }, replace: true });
    } catch {
      toast.error("Error al registrar lote");
    }
  };

  const handleRegistrarMerma = async () => {
    if (!mermaCantidad || !mermaMotivo) {
      toast.error("Completá todos los campos");
      return;
    }
    try {
      await registrarMerma({
        data: {
          productId: producto.id,
          cantidadKg: Number(mermaCantidad),
          motivo: mermaMotivo,
          fecha: mermaFecha,
        },
      });
      toast.success("Merma registrada");
      setMermaDialogOpen(false);
      setMermaCantidad("");
      setMermaMotivo("");
      router.navigate({ to: "/productos/$id", params: { id: String(producto.id) }, replace: true });
    } catch {
      toast.error("Error al registrar merma");
    }
  };

  return (
    <div className="p-7 max-w-6xl">
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="font-display text-[22px] font-black text-gray-900 tracking-tight">
            {producto.nombre}
          </h1>
          <Badge variant={producto.activo ? "activo" : "inactivo"}>
            {producto.activo ? "Activo" : "Inactivo"}
          </Badge>
          {producto.esMix && <Badge variant="mix">Mix</Badge>}
        </div>
        <div className="flex gap-2">
          {editando ? (
            <>
              <Button onClick={handleGuardar}>Guardar</Button>
              <Button variant="outline" onClick={() => setEditando(false)}>Cancelar</Button>
            </>
          ) : (
            <Button variant="outline" onClick={() => setEditando(true)}>Editar</Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <div className="rounded-xl border border-orange-100 bg-white p-5">
            <h2 className="font-display text-lg font-bold mb-4">Datos del producto</h2>
            {editando ? (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Nombre</Label>
                  <Input value={nombre} onChange={(e) => setNombre(e.target.value)} />
                </div>
                {(producto.tipoVenta === "por_kg" || producto.tipoVenta === "ambos") && (
                  <div className="space-y-1.5">
                    <Label>Precio por kg</Label>
                    <Input type="number" value={precioPorKg} onChange={(e) => setPrecioPorKg(e.target.value)} />
                  </div>
                )}
                {(producto.tipoVenta === "por_unidad" || producto.tipoVenta === "ambos") && (
                  <>
                    <div className="space-y-1.5">
                      <Label>Precio por unidad</Label>
                      <Input type="number" value={precioUnidad} onChange={(e) => setPrecioUnidad(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Peso por unidad (kg)</Label>
                      <Input type="number" step="0.001" value={pesoUnidad} onChange={(e) => setPesoUnidad(e.target.value)} />
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-2 font-mono text-sm">
                <p>Tipo de venta: <span className="text-gray-900">{producto.tipoVenta}</span></p>
                {producto.precioPorKg && <p>Precio/kg: <span className="text-gray-900">{formatPesos(producto.precioPorKg)}</span></p>}
                {producto.precioUnidad && <p>Precio/unidad: <span className="text-gray-900">{formatPesos(producto.precioUnidad)}</span></p>}
                {producto.pesoUnidad && <p>Peso/unidad: <span className="text-gray-900">{formatKg(producto.pesoUnidad)}</span></p>}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-orange-100 bg-white p-5">
            <h2 className="font-display text-lg font-bold mb-4">Stock disponible</h2>
            <StockBar value={producto.stockDisponible} />
          </div>

          {producto.esMix && componentes.length > 0 && (
            <div className="rounded-xl border border-orange-100 bg-white p-5">
              <h2 className="font-display text-lg font-bold mb-4">Composición del mix</h2>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Componente</TableHead>
                    <TableHead className="text-right">Cantidad (kg)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {componentes.map((comp) => (
                    <TableRow key={comp.id}>
                      <TableCell>{comp.componenteId}</TableCell>
                      <TableCell className="text-right">{formatKg(comp.cantidad)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="rounded-xl border border-orange-100 bg-white p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg font-bold">Lotes</h2>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">Agregar stock</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Registrar ingreso de stock</DialogTitle>
                    <DialogDescription>
                      Se creará un nuevo lote para {producto.nombre}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label>Cantidad (kg) *</Label>
                      <Input type="number" step="0.001" value={loteCantidad} onChange={(e) => setLoteCantidad(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Costo por kg *</Label>
                      <Input type="number" value={loteCosto} onChange={(e) => setLoteCosto(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Fecha de compra</Label>
                      <Input type="date" value={loteFecha} onChange={(e) => setLoteFecha(e.target.value)} />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                    <Button onClick={handleAgregarLote}>Confirmar ingreso</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="text-right">Inicial</TableHead>
                  <TableHead className="text-right">Restante</TableHead>
                  <TableHead className="text-right">Costo/kg</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lotes.map((lote) => (
                  <TableRow key={lote.id}>
                    <TableCell>{new Date(lote.fechaCompra).toLocaleDateString("es-AR")}</TableCell>
                    <TableCell className="text-right">{formatKg(lote.cantidadInicial)}</TableCell>
                    <TableCell className="text-right">{formatKg(lote.cantidadRestante)}</TableCell>
                    <TableCell className="text-right">{formatPesos(lote.costoUnitario)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {lotes.length === 0 && (
              <p className="font-mono text-sm text-gray-400 text-center py-4">Sin lotes registrados</p>
            )}
          </div>

          {mermas.length > 0 && (
            <div className="rounded-xl border border-orange-100 bg-white p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-lg font-bold">Mermas recientes</h2>
                <Dialog open={mermaDialogOpen} onOpenChange={setMermaDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline">Registrar merma</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Registrar merma</DialogTitle>
                      <DialogDescription>
                        Se descontará del stock disponible
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <Label>Cantidad (kg) *</Label>
                        <Input type="number" step="0.001" value={mermaCantidad} onChange={(e) => setMermaCantidad(e.target.value)} />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Motivo *</Label>
                        <Input value={mermaMotivo} onChange={(e) => setMermaMotivo(e.target.value)} placeholder="ej: Vencimiento, daño..." />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Fecha</Label>
                        <Input type="date" value={mermaFecha} onChange={(e) => setMermaFecha(e.target.value)} />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setMermaDialogOpen(false)}>Cancelar</Button>
                      <Button onClick={handleRegistrarMerma}>Confirmar merma</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Motivo</TableHead>
                    <TableHead className="text-right">Kg</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mermas.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell>{new Date(m.fecha).toLocaleDateString("es-AR")}</TableCell>
                      <TableCell>{m.motivo}</TableCell>
                      <TableCell className="text-right">{formatKg(m.cantidadKg)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
