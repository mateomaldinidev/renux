import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import { crearPedido } from "../../server/functions/pedidos";
import { getProductos } from "../../server/functions/productos";
import { getClientes, crearCliente } from "../../server/functions/clientes";
import { PageHeader } from "../../components/app/PageHeader";
import { formatPesos, formatKg } from "../../utils/format";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../../components/ui/dialog";
import { Label } from "../../components/ui/label";
import { toast } from "sonner";

interface CartItem {
  productId: number;
  nombre: string;
  cantidad: number;
  precioUnitario: number;
  vendidoComoUnidad: boolean;
  subtotal: number;
  stockDisponible: number;
  tipoVenta: string;
  pesoUnidad?: number;
}

export const Route = createFileRoute("/pedidos/nuevo")({
  loader: async () => {
    const [productos, clientes] = await Promise.all([
      getProductos({ data: { busqueda: "", tipo: "todos", verInactivos: false } }),
      getClientes({ data: {} }),
    ]);
    return { productos: productos.filter((p) => p.activo), clientes };
  },
  component: NuevoPedidoPage,
});

function NuevoPedidoPage() {
  const { productos, clientes } = Route.useLoaderData();
  const router = useRouter();

  const [paso, setPaso] = useState<1 | 2>(1);
  const [busqueda, setBusqueda] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [clienteId, setClienteId] = useState<number | undefined>();
  const [descuentoPct, setDescuentoPct] = useState(0);
  const [showNuevoCliente, setShowNuevoCliente] = useState(false);
  const [nuevoClienteNombre, setNuevoClienteNombre] = useState("");
  const [nuevoClienteTelefono, setNuevoClienteTelefono] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Modo de venta para productos con tipoVenta="ambos"
  const [modosVenta, setModosVenta] = useState<Record<number, "kg" | "unidad">>({});

  const productosFiltrados = useMemo(() => {
    if (!busqueda) return productos;
    const q = busqueda.toLowerCase();
    return productos.filter((p) => p.nombre.toLowerCase().includes(q));
  }, [productos, busqueda]);

  const totalBruto = useMemo(
    () => cart.reduce((sum, item) => sum + item.subtotal, 0),
    [cart],
  );

  const totalFinal = useMemo(
    () => totalBruto * (1 - descuentoPct / 100),
    [totalBruto, descuentoPct],
  );

  const getCartItem = (productId: number) => cart.find((c) => c.productId === productId);

  const addToCart = (producto: any) => {
    if (getCartItem(producto.id)) return;

    const modo = modosVenta[producto.id] || "kg";
    let cantidad: number;
    let precioUnitario: number;
    let vendidoComoUnidad: boolean;

    if (producto.tipoVenta === "ambos") {
      if (modo === "unidad") {
        cantidad = 1;
        precioUnitario = Number(producto.precioUnidad);
        vendidoComoUnidad = true;
      } else {
        cantidad = 1;
        precioUnitario = Number(producto.precioPorKg);
        vendidoComoUnidad = false;
      }
    } else if (producto.tipoVenta === "por_unidad") {
      cantidad = 1;
      precioUnitario = Number(producto.precioUnidad);
      vendidoComoUnidad = true;
    } else {
      cantidad = 1;
      precioUnitario = Number(producto.precioPorKg);
      vendidoComoUnidad = false;
    }

    setCart((prev) => [
      ...prev,
      {
        productId: producto.id,
        nombre: producto.nombre,
        cantidad,
        precioUnitario,
        vendidoComoUnidad,
        subtotal: cantidad * precioUnitario,
        stockDisponible: producto.stockDisponible,
        tipoVenta: producto.tipoVenta,
        pesoUnidad: producto.pesoUnidad ? Number(producto.pesoUnidad) : undefined,
      },
    ]);
  };

  const updateCantidad = (productId: number, nuevaCantidad: number) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.productId !== productId) return item;
        const cantidad = Math.max(0, nuevaCantidad);
        const stockKg = item.vendidoComoUnidad && item.pesoUnidad
          ? item.stockDisponible / item.pesoUnidad
          : item.stockDisponible;
        const cantidadLimitada = item.vendidoComoUnidad
          ? Math.min(cantidad, Math.floor(stockKg))
          : Math.min(cantidad, stockKg);
        return {
          ...item,
          cantidad: cantidadLimitada,
          subtotal: cantidadLimitada * item.precioUnitario,
        };
      }),
    );
  };

  const removeFromCart = (productId: number) => {
    setCart((prev) => prev.filter((c) => c.productId !== productId));
  };

  const toggleModoVenta = (productId: number) => {
    setModosVenta((prev) => {
      const nuevoModo = prev[productId] === "unidad" ? "kg" : "unidad";
      return { ...prev, [productId]: nuevoModo };
    });

    // Re-add the item with new mode
    const producto = productos.find((p) => p.id === productId);
    if (producto) {
      setCart((prev) => prev.filter((c) => c.productId !== productId));
      setTimeout(() => addToCart(producto), 0);
    }
  };

  const handleCrearCliente = async () => {
    if (!nuevoClienteNombre.trim()) {
      toast.error("El nombre es obligatorio");
      return;
    }
    try {
      const nuevo = await crearCliente({
        data: {
          nombre: nuevoClienteNombre.trim(),
          telefono: nuevoClienteTelefono.trim() || undefined,
        },
      });
      setClienteId(nuevo.id);
      setShowNuevoCliente(false);
      setNuevoClienteNombre("");
      setNuevoClienteTelefono("");
      toast.success(`Cliente "${nuevo.nombre}" creado`);
    } catch {
      toast.error("Error al crear el cliente");
    }
  };

  const handleConfirmarPedido = async () => {
    if (cart.length === 0) {
      toast.error("Agregá al menos un producto");
      return;
    }

    setSubmitting(true);
    try {
      const sale = await crearPedido({
        data: {
          customerId: clienteId,
          descuentoPct,
          items: cart.map((item) => {
            let cantidadFinal = item.cantidad;
            let precioFinal = item.precioUnitario;

            if (item.vendidoComoUnidad && item.pesoUnidad) {
              cantidadFinal = item.cantidad * item.pesoUnidad;
            }

            return {
              productId: item.productId,
              cantidad: cantidadFinal,
              precioUnitario: precioFinal,
              vendidoComoUnidad: item.vendidoComoUnidad,
              subtotal: item.subtotal,
            };
          }),
        },
      });

      toast.success("Pedido creado exitosamente");
      router.navigate({ to: "/pedidos/$id", params: { id: String(sale.id) } });
    } catch (err: any) {
      toast.error(err.message || "Error al crear el pedido");
    } finally {
      setSubmitting(false);
    }
  };

  const puedeContinuar = cart.length > 0;

  return (
    <div className="p-8">
      <PageHeader
        title="Nuevo pedido"
        subtitle={`Paso ${paso} de 2`}
        action={
          paso === 1 && (
            <Button
              onClick={() => setPaso(2)}
              disabled={!puedeContinuar}
              className="bg-[#F57A28] hover:bg-[#D4601A]"
            >
              Continuar →
            </Button>
          )
        }
      />

      <div className="flex gap-6">
        {/* Panel izquierdo */}
        <div className="flex-1">
          {paso === 1 ? (
            <>
              <div className="mb-4">
                <Input
                  placeholder="Buscar producto..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="max-w-sm"
                />
              </div>

              <div className="rounded-xl border border-orange-100 bg-white overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-orange-100">
                      <th className="text-left px-4 py-3 font-mono text-[11px] uppercase tracking-wider text-gray-400">
                        Producto
                      </th>
                      <th className="text-right px-4 py-3 font-mono text-[11px] uppercase tracking-wider text-gray-400">
                        Stock
                      </th>
                      <th className="text-right px-4 py-3 font-mono text-[11px] uppercase tracking-wider text-gray-400">
                        Precio
                      </th>
                      <th className="w-24" />
                    </tr>
                  </thead>
                  <tbody>
                    {productosFiltrados.map((producto) => {
                      const enCarrito = !!getCartItem(producto.id);
                      const sinStock = producto.stockDisponible <= 0;

                      return (
                        <tr
                          key={producto.id}
                          className={`border-b border-orange-50 ${
                            sinStock ? "opacity-40" : ""
                          } ${enCarrito ? "bg-orange-50" : ""}`}
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-800">
                                {producto.nombre}
                              </span>
                              {producto.tipoVenta === "ambos" && !enCarrito && (
                                <div className="flex gap-1">
                                  <button
                                    onClick={() => {
                                      setModosVenta((prev) => ({
                                        ...prev,
                                        [producto.id]: "kg",
                                      }));
                                    }}
                                    className={`text-[10px] px-1.5 py-0.5 rounded ${
                                      modosVenta[producto.id] !== "unidad"
                                        ? "bg-[#F57A28] text-white"
                                        : "bg-gray-100 text-gray-500"
                                    }`}
                                  >
                                    kg
                                  </button>
                                  <button
                                    onClick={() => {
                                      setModosVenta((prev) => ({
                                        ...prev,
                                        [producto.id]: "unidad",
                                      }));
                                    }}
                                    className={`text-[10px] px-1.5 py-0.5 rounded ${
                                      modosVenta[producto.id] === "unidad"
                                        ? "bg-[#F57A28] text-white"
                                        : "bg-gray-100 text-gray-500"
                                    }`}
                                  >
                                    und
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="text-right px-4 py-3 font-mono text-sm text-gray-600">
                            {formatKg(producto.stockDisponible)}
                          </td>
                          <td className="text-right px-4 py-3 font-mono text-sm text-gray-600">
                            {producto.tipoVenta === "ambos"
                              ? modosVenta[producto.id] === "unidad"
                                ? formatPesos(producto.precioUnidad || 0)
                                : `${formatPesos(producto.precioPorKg || 0)}/kg`
                              : producto.tipoVenta === "por_unidad"
                                ? formatPesos(producto.precioUnidad || 0)
                                : `${formatPesos(producto.precioPorKg || 0)}/kg`}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {sinStock ? (
                              <span className="text-xs text-red-400">Sin stock</span>
                            ) : enCarrito ? (
                              <Badge className="bg-green-100 text-green-700">En carrito</Badge>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => addToCart(producto)}
                                className="text-xs border-[#F57A28] text-[#F57A28] hover:bg-[#F57A28] hover:text-white"
                              >
                                + Agregar
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <>
              {/* Paso 2: Cliente y descuento */}
              <div className="rounded-xl border border-orange-100 bg-white p-6 mb-6">
                <h3 className="font-mono text-[11px] uppercase tracking-wider text-gray-400 mb-4">
                  Cliente
                </h3>

                {clienteId ? (
                  <div className="flex items-center gap-3">
                    <Badge className="bg-[#F57A28] text-white">
                      {clientes.find((c) => c.id === clienteId)?.nombre}
                    </Badge>
                    <button
                      onClick={() => setClienteId(undefined)}
                      className="text-xs text-gray-400 hover:text-red-400"
                    >
                      ✕ Quitar
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {clientes.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => setClienteId(c.id)}
                        className="px-3 py-1.5 rounded-lg text-sm bg-gray-50 text-gray-600 hover:bg-orange-50 hover:text-[#F57A28] transition-colors"
                      >
                        {c.nombre}
                      </button>
                    ))}
                    <button
                      onClick={() => setShowNuevoCliente(true)}
                      className="px-3 py-1.5 rounded-lg text-sm border border-dashed border-gray-300 text-gray-400 hover:border-[#F57A28] hover:text-[#F57A28] transition-colors"
                    >
                      + Crear cliente
                    </button>
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-orange-100 bg-white p-6 mb-6">
                <h3 className="font-mono text-[11px] uppercase tracking-wider text-gray-400 mb-4">
                  Descuento
                </h3>
                <div className="flex items-center gap-3 max-w-[200px]">
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={descuentoPct}
                    onChange={(e) =>
                      setDescuentoPct(Math.min(100, Math.max(0, Number(e.target.value))))
                    }
                    className="text-right"
                  />
                  <span className="text-sm text-gray-500">%</span>
                </div>
              </div>

              {/* Resumen */}
              <div className="rounded-xl border border-orange-100 bg-white p-6">
                <h3 className="font-mono text-[11px] uppercase tracking-wider text-gray-400 mb-4">
                  Resumen del pedido
                </h3>
                {cart.map((item) => (
                  <div key={item.productId} className="flex justify-between text-sm py-2 border-b border-orange-50">
                    <span className="text-gray-700">
                      {item.nombre}{" "}
                      <span className="text-gray-400">
                        ({item.vendidoComoUnidad ? `${item.cantidad} und` : formatKg(item.cantidad)})
                      </span>
                    </span>
                    <span className="font-mono font-medium">{formatPesos(item.subtotal)}</span>
                  </div>
                ))}
                <div className="mt-4 space-y-1">
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>Total bruto</span>
                    <span className="font-mono">{formatPesos(totalBruto)}</span>
                  </div>
                  {descuentoPct > 0 && (
                    <div className="flex justify-between text-sm text-red-500">
                      <span>Descuento ({descuentoPct}%)</span>
                      <span className="font-mono">
                        -{formatPesos(totalBruto * descuentoPct / 100)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold pt-2 border-t border-orange-100">
                    <span>Total final</span>
                    <span className="font-mono text-[#F57A28]">{formatPesos(totalFinal)}</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Panel derecho - Carrito */}
        {cart.length > 0 && (
          <div className="w-80 flex-shrink-0">
            <div className="rounded-xl border border-orange-100 bg-white p-5 sticky top-8">
              <h3 className="font-mono text-[11px] uppercase tracking-wider text-gray-400 mb-4">
                Carrito ({cart.length})
              </h3>

              <div className="space-y-3 mb-4">
                {cart.map((item) => (
                  <div key={item.productId} className="border border-orange-50 rounded-lg p-3">
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-sm font-medium text-gray-800 flex-1">
                        {item.nombre}
                      </span>
                      <button
                        onClick={() => removeFromCart(item.productId)}
                        className="text-gray-300 hover:text-red-400 ml-2"
                      >
                        ✕
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateCantidad(item.productId, item.cantidad - (item.vendidoComoUnidad ? 1 : 0.1))}
                        className="w-7 h-7 rounded bg-gray-100 text-gray-500 hover:bg-gray-200 flex items-center justify-center text-sm"
                      >
                        −
                      </button>
                      <input
                        type="number"
                        value={item.cantidad}
                        onChange={(e) =>
                          updateCantidad(item.productId, Number(e.target.value))
                        }
                        className="w-16 text-center text-sm font-mono border border-orange-100 rounded py-1"
                        step={item.vendidoComoUnidad ? 1 : 0.1}
                        min={0}
                      />
                      <button
                        onClick={() => updateCantidad(item.productId, item.cantidad + (item.vendidoComoUnidad ? 1 : 0.1))}
                        className="w-7 h-7 rounded bg-gray-100 text-gray-500 hover:bg-gray-200 flex items-center justify-center text-sm"
                      >
                        +
                      </button>
                      <span className="text-xs text-gray-400 ml-auto">
                        {item.vendidoComoUnidad ? "und" : "kg"}
                      </span>
                    </div>

                    <div className="text-right mt-2 font-mono text-sm font-semibold text-gray-900">
                      {formatPesos(item.subtotal)}
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-orange-100 pt-4">
                <div className="flex justify-between text-sm font-bold">
                  <span>Total</span>
                  <span className="font-mono text-[#F57A28]">{formatPesos(totalBruto)}</span>
                </div>
              </div>

              {paso === 2 && (
                <Button
                  onClick={handleConfirmarPedido}
                  disabled={submitting}
                  className="w-full mt-4 bg-[#F57A28] hover:bg-[#D4601A]"
                >
                  {submitting ? "Creando..." : "Confirmar pedido"}
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Dialog nuevo cliente */}
      <Dialog open={showNuevoCliente} onOpenChange={setShowNuevoCliente}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo cliente</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="nombre">Nombre</Label>
              <Input
                id="nombre"
                value={nuevoClienteNombre}
                onChange={(e) => setNuevoClienteNombre(e.target.value)}
                placeholder="Nombre del cliente"
              />
            </div>
            <div>
              <Label htmlFor="telefono">Teléfono (opcional)</Label>
              <Input
                id="telefono"
                value={nuevoClienteTelefono}
                onChange={(e) => setNuevoClienteTelefono(e.target.value)}
                placeholder="Teléfono"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNuevoCliente(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCrearCliente} className="bg-[#F57A28] hover:bg-[#D4601A]">
              Crear
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
