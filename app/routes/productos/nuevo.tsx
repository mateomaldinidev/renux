import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { crearProducto, getProductos } from "../../server/functions/productos";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/productos/nuevo")({
  loader: () => getProductos({ data: {} }),
  component: NuevoProductoPage,
});

function NuevoProductoPage() {
  const router = useRouter();
  const productosBase = Route.useLoaderData();
  const productosDisponibles = productosBase.filter((p) => !p.esMix && p.activo);

  const [tab, setTab] = useState("simple");

  const [nombre, setNombre] = useState("");
  const [tipoVenta, setTipoVenta] = useState<"por_kg" | "por_unidad" | "ambos">("por_kg");
  const [precioPorKg, setPrecioPorKg] = useState("");
  const [precioUnidad, setPrecioUnidad] = useState("");
  const [pesoUnidad, setPesoUnidad] = useState("");

  const [componentes, setComponentes] = useState<{ componenteId: string; cantidad: string }[]>([
    { componenteId: "", cantidad: "" },
  ]);

  const handleSubmit = async () => {
    if (!nombre.trim()) {
      toast.error("El nombre es obligatorio");
      return;
    }

    if (tab === "mix") {
      if (Math.abs(sumaComponentes - 1) >= 0.001) {
        toast.error("La suma de componentes debe ser exactamente 1.0 kg");
        return;
      }
      const componentesValidos = componentes.filter((c) => c.componenteId && c.cantidad);
      if (componentesValidos.length === 0) {
        toast.error("Agregá al menos un componente");
        return;
      }
    }

    try {
      const nuevo = await crearProducto({
        data: {
          nombre: nombre.trim(),
          esMix: tab === "mix",
          tipoVenta,
          precioPorKg: precioPorKg || undefined,
          precioUnidad: precioUnidad || undefined,
          pesoUnidad: pesoUnidad || undefined,
          componentes:
            tab === "mix"
              ? componentes
                  .filter((c) => c.componenteId && c.cantidad)
                  .map((c) => ({
                    componenteId: Number(c.componenteId),
                    cantidad: c.cantidad,
                  }))
              : undefined,
        },
      });

      toast.success("Producto creado");
      router.navigate({ to: "/productos/$id", params: { id: String(nuevo.id) } });
    } catch (e) {
      toast.error("Error al crear el producto");
    }
  };

  const agregarComponente = () => {
    setComponentes([...componentes, { componenteId: "", cantidad: "" }]);
  };

  const quitarComponente = (index: number) => {
    setComponentes(componentes.filter((_, i) => i !== index));
  };

  const sumaComponentes = componentes.reduce((sum, c) => sum + (Number(c.cantidad) || 0), 0);

  return (
    <div className="p-7 max-w-xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="font-display text-[22px] font-black text-gray-900 tracking-tight">
            Nuevo producto
          </h1>
        </div>
        <Button onClick={() => router.navigate({ to: "/productos" })} variant="outline">
          Volver
        </Button>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="mb-6">
        <TabsList>
          <TabsTrigger value="simple">Producto simple</TabsTrigger>
          <TabsTrigger value="mix">Mix compuesto</TabsTrigger>
        </TabsList>

        <TabsContent value="simple" className="space-y-4 mt-4">
          <div className="space-y-1.5">
            <Label>Nombre del producto *</Label>
            <Input
              placeholder="ej: Almendras, Nueces..."
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Tipo de venta *</Label>
            <Select value={tipoVenta} onValueChange={(v) => setTipoVenta(v as typeof tipoVenta)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="por_kg">Por kg</SelectItem>
                <SelectItem value="por_unidad">Por unidad</SelectItem>
                <SelectItem value="ambos">Ambos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {(tipoVenta === "por_kg" || tipoVenta === "ambos") && (
            <div className="space-y-1.5">
              <Label>Precio por kg *</Label>
              <Input
                type="number"
                placeholder="ej: 10000"
                value={precioPorKg}
                onChange={(e) => setPrecioPorKg(e.target.value)}
              />
            </div>
          )}

          {(tipoVenta === "por_unidad" || tipoVenta === "ambos") && (
            <>
              <div className="space-y-1.5">
                <Label>Precio por unidad *</Label>
                <Input
                  type="number"
                  placeholder="ej: 5500"
                  value={precioUnidad}
                  onChange={(e) => setPrecioUnidad(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Peso por unidad (kg) *</Label>
                <Input
                  type="number"
                  step="0.001"
                  placeholder="ej: 0.5"
                  value={pesoUnidad}
                  onChange={(e) => setPesoUnidad(e.target.value)}
                />
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="mix" className="space-y-4 mt-4">
          <div className="space-y-1.5">
            <Label>Nombre del mix *</Label>
            <Input
              placeholder="ej: Mix Premium, Mix Energético..."
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Precio por kg del mix *</Label>
            <Input
              type="number"
              placeholder="ej: 12000"
              value={precioPorKg}
              onChange={(e) => setPrecioPorKg(e.target.value)}
            />
          </div>

          <div className="space-y-3">
            <Label>Componentes (por 1 kg de mix)</Label>
            {componentes.map((comp, index) => (
              <div key={index} className="flex gap-2 items-start">
                <Select
                  value={comp.componenteId}
                  onValueChange={(v) => {
                    const nuevos = [...componentes];
                    nuevos[index].componenteId = v;
                    setComponentes(nuevos);
                  }}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Producto" />
                  </SelectTrigger>
                  <SelectContent>
                    {productosDisponibles.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>
                        {p.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  step="0.001"
                  placeholder="kg"
                  className="w-24"
                  value={comp.cantidad}
                  onChange={(e) => {
                    const nuevos = [...componentes];
                    nuevos[index].cantidad = e.target.value;
                    setComponentes(nuevos);
                  }}
                />
                {componentes.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => quitarComponente(index)}
                    className="text-red-400"
                  >
                    ✕
                  </Button>
                )}
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={agregarComponente}>
              + Agregar componente
            </Button>
          </div>

          {sumaComponentes > 0 && (
            <p className={`font-mono text-sm ${Math.abs(sumaComponentes - 1) < 0.001 ? "text-green-600" : "text-red-500"}`}>
              Suma: {sumaComponentes.toFixed(3)} kg
              {Math.abs(sumaComponentes - 1) >= 0.001 && ` (faltan ${(1 - sumaComponentes).toFixed(3)} kg)`}
            </p>
          )}
        </TabsContent>
      </Tabs>

      <Button onClick={handleSubmit} className="w-full">
        Crear producto
      </Button>
    </div>
  );
}
