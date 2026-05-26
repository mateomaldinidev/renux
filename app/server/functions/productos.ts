import { createServerFn } from "@tanstack/react-start";
import { db } from "../db";
import { products, lots, mixComponents, shrinkage } from "../db/schema";
import { eq, desc, sql } from "drizzle-orm";

export const getProductos = createServerFn({ method: "GET" })
  .inputValidator((data: {
    busqueda?: string;
    tipo?: "todos" | "por_kg" | "por_unidad" | "ambos" | "mix";
    verInactivos?: boolean;
  }) => data)
  .handler(async ({ data: _data }) => {
    const lista = await db.select().from(products).orderBy(desc(products.createdAt));

    const resultados = await Promise.all(
      lista.map(async (p) => {
        let stockDisponible = Number(p.stockDisponible);

        if (p.esMix) {
          const componentes = await db
            .select()
            .from(mixComponents)
            .where(eq(mixComponents.mixId, p.id));

          if (componentes.length > 0) {
            const stocksComponentes: Record<number, number> = {};
            for (const comp of componentes) {
              const prod = await db.query.products.findFirst({
                where: eq(products.id, comp.componenteId),
              });
              stocksComponentes[comp.componenteId] = Number(prod?.stockDisponible || 0);
            }

            stockDisponible = Math.min(
              ...componentes.map((comp) => {
                const stockComp = stocksComponentes[comp.componenteId] || 0;
                const cantidad = Number(comp.cantidad);
                return cantidad > 0 ? stockComp / cantidad : 0;
              })
            );
          } else {
            stockDisponible = 0;
          }
        }

        return { ...p, stockDisponible };
      })
    );

    return resultados;
  });

export const getProducto = createServerFn({ method: "GET" })
  .inputValidator((data: { id: number }) => data)
  .handler(async ({ data }) => {
    const producto = await db.query.products.findFirst({
      where: eq(products.id, data.id),
    });

    if (!producto) {
      throw new Error("Producto no encontrado");
    }

    const lotesProducto = await db
      .select()
      .from(lots)
      .where(eq(lots.productId, data.id))
      .orderBy(desc(lots.fechaCompra));

    let componentes: typeof mixComponents.$inferSelect[] = [];
    if (producto.esMix) {
      componentes = await db
        .select()
        .from(mixComponents)
        .where(eq(mixComponents.mixId, data.id));
    }

    const mermas = await db
      .select()
      .from(shrinkage)
      .where(eq(shrinkage.productId, data.id))
      .orderBy(desc(shrinkage.fecha))
      .limit(5);

    let stockDisponible = Number(producto.stockDisponible);
    if (producto.esMix && componentes.length > 0) {
      const stocksComponentes: Record<number, number> = {};
      for (const comp of componentes) {
        const prod = await db.query.products.findFirst({
          where: eq(products.id, comp.componenteId),
        });
        stocksComponentes[comp.componenteId] = Number(prod?.stockDisponible || 0);
      }
      stockDisponible = Math.min(
        ...componentes.map((comp) => {
          const stockComp = stocksComponentes[comp.componenteId] || 0;
          const cantidad = Number(comp.cantidad);
          return cantidad > 0 ? stockComp / cantidad : 0;
        })
      );
    }

    return {
      producto: { ...producto, stockDisponible },
      lotes: lotesProducto,
      componentes,
      mermas,
    };
  });

export const crearProducto = createServerFn({ method: "POST" })
  .inputValidator((data: {
    nombre: string;
    esMix: boolean;
    tipoVenta: "por_kg" | "por_unidad" | "ambos";
    precioPorKg?: string;
    precioUnidad?: string;
    pesoUnidad?: string;
    componentes?: { componenteId: number; cantidad: string }[];
  }) => data)
  .handler(async ({ data }) => {
    return await db.transaction(async (tx) => {
      const [producto] = await tx
        .insert(products)
        .values({
          nombre: data.nombre,
          esMix: data.esMix,
          tipoVenta: data.tipoVenta,
          precioPorKg: data.precioPorKg,
          precioUnidad: data.precioUnidad,
          pesoUnidad: data.pesoUnidad,
        })
        .returning();

      if (data.esMix && data.componentes?.length) {
        await tx.insert(mixComponents).values(
          data.componentes.map((c) => ({
            mixId: producto.id,
            componenteId: c.componenteId,
            cantidad: c.cantidad,
          }))
        );
      }

      return producto;
    });
  });

export const updateProducto = createServerFn({ method: "POST" })
  .inputValidator((data: {
    id: number;
    nombre?: string;
    precioPorKg?: string;
    precioUnidad?: string;
    pesoUnidad?: string;
    tipoVenta?: "por_kg" | "por_unidad" | "ambos";
    activo?: boolean;
  }) => data)
  .handler(async ({ data }) => {
    const { id, ...fields } = data;
    return await db.transaction(async (tx) => {
      const [producto] = await tx
        .update(products)
        .set({ ...fields, updatedAt: new Date() })
        .where(eq(products.id, id))
        .returning();
      return producto;
    });
  });

export const registrarLote = createServerFn({ method: "POST" })
  .inputValidator((data: {
    productId: number;
    supplierId?: number;
    cantidadKg: number;
    costoUnitario: number;
    fechaCompra: string;
  }) => data)
  .handler(async ({ data }) => {
    return await db.transaction(async (tx) => {
      const [lote] = await tx
        .insert(lots)
        .values({
          productId: data.productId,
          supplierId: data.supplierId,
          cantidadInicial: data.cantidadKg.toString(),
          cantidadRestante: data.cantidadKg.toString(),
          costoUnitario: data.costoUnitario.toString(),
          fechaCompra: new Date(data.fechaCompra),
        })
        .returning();

      await tx
        .update(products)
        .set({
          stockDisponible: sql`${products.stockDisponible} + ${data.cantidadKg}`,
          updatedAt: new Date(),
        })
        .where(eq(products.id, data.productId));

      return lote;
    });
  });

export const registrarMerma = createServerFn({ method: "POST" })
  .inputValidator((data: {
    productId: number;
    cantidadKg: number;
    motivo: string;
    fecha: string;
  }) => data)
  .handler(async ({ data }) => {
    return await db.transaction(async (tx) => {
      const [merma] = await tx
        .insert(shrinkage)
        .values({
          productId: data.productId,
          cantidadKg: data.cantidadKg.toString(),
          motivo: data.motivo,
          fecha: new Date(data.fecha),
        })
        .returning();

      await tx
        .update(products)
        .set({
          stockDisponible: sql`${products.stockDisponible} - ${data.cantidadKg}`,
          updatedAt: new Date(),
        })
        .where(eq(products.id, data.productId));

      return merma;
    });
  });
