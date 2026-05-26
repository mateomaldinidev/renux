import { createFileRoute } from "@tanstack/react-router";
import { getProductos } from "../../server/functions/productos";

export const Route = createFileRoute("/productos/")({
  loader: () => getProductos({ data: {} }),
  component: ProductosPage,
});

function ProductosPage() {
  const productos = Route.useLoaderData();

  return (
    <div className="p-7 max-w-6xl">
      <h1 className="font-display text-2xl font-black tracking-tight text-gray-900">
        Productos
      </h1>
      <p className="font-mono text-sm text-gray-400 mt-1">
        {productos.length} productos
      </p>
    </div>
  );
}
