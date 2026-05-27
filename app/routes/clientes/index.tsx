import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { getClientes, crearCliente } from "../../server/functions/clientes";
import { PageHeader } from "../../components/app/PageHeader";
import { formatPesos } from "../../utils/format";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../../components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { toast } from "sonner";

export const Route = createFileRoute("/clientes/")({
  loader: () => getClientes({ data: {} }),
  component: ClientesPage,
});

function ClientesPage() {
  const clientes = Route.useLoaderData();
  const [busqueda, setBusqueda] = useState("");
  const [debouncedBusqueda, setDebouncedBusqueda] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedBusqueda(busqueda), 300);
    return () => clearTimeout(timer);
  }, [busqueda]);

  const filtrados = clientes.filter((c) => {
    if (!debouncedBusqueda) return true;
    const q = debouncedBusqueda.toLowerCase();
    return c.nombre.toLowerCase().includes(q) || (c.telefono || "").includes(q);
  });

  const handleCrear = async () => {
    if (!nombre.trim()) {
      toast.error("El nombre es obligatorio");
      return;
    }
    try {
      await crearCliente({ data: { nombre: nombre.trim(), telefono: telefono.trim() || undefined } });
      toast.success(`Cliente "${nombre}" creado`);
      setDialogOpen(false);
      setNombre("");
      setTelefono("");
      window.location.reload();
    } catch {
      toast.error("Error al crear el cliente");
    }
  };

  return (
    <div className="p-7 max-w-6xl">
      <PageHeader
        title="Clientes"
        subtitle={`${clientes.length} clientes registrados`}
        action={
          <Button onClick={() => setDialogOpen(true)} className="bg-[#F57A28] hover:bg-[#D4601A]">
            + Nuevo cliente
          </Button>
        }
      />

      <div className="flex gap-3 mb-6">
        <Input
          placeholder="Buscar por nombre o teléfono..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <div className="rounded-xl border border-orange-100 bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-orange-100">
              <TableHead className="font-mono text-[11px] uppercase tracking-wider text-gray-400">Nombre</TableHead>
              <TableHead className="font-mono text-[11px] uppercase tracking-wider text-gray-400">Teléfono</TableHead>
              <TableHead className="font-mono text-[11px] uppercase tracking-wider text-gray-400 text-right">Pedidos</TableHead>
              <TableHead className="font-mono text-[11px] uppercase tracking-wider text-gray-400 text-right">Total comprado</TableHead>
              <TableHead className="font-mono text-[11px] uppercase tracking-wider text-gray-400">Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtrados.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-gray-400">
                  No se encontraron clientes
                </TableCell>
              </TableRow>
            ) : (
              filtrados.map((c) => (
                <TableRow key={c.id} className="border-orange-50">
                  <TableCell className="text-sm font-medium text-gray-800">{c.nombre}</TableCell>
                  <TableCell className="font-mono text-sm text-gray-500">{c.telefono || "—"}</TableCell>
                  <TableCell className="text-right font-mono text-sm text-gray-600">{c.totalPedidos}</TableCell>
                  <TableCell className="text-right font-mono text-sm font-semibold text-gray-900">
                    {formatPesos(c.totalComprado)}
                  </TableCell>
                  <TableCell>
                    {c.adeudaPago ? (
                      <Badge variant="adeudapago">Adeuda pago</Badge>
                    ) : (
                      <Badge variant="activo">Al día</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo cliente</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Nombre *</Label>
              <Input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre del cliente" />
            </div>
            <div className="space-y-1.5">
              <Label>Teléfono (opcional)</Label>
              <Input value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="Teléfono" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleCrear} className="bg-[#F57A28] hover:bg-[#D4601A]">Crear</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
