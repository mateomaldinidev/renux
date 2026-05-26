import { createServerFn } from "@tanstack/react-start";
import { db } from "../db";
import {
  sales,
  saleItems,
  saleLots,
  products,
  lots,
  mixComponents,
  customers,
  estadoPedidoEnum,
} from "../db/schema";
import { eq, and, gt, asc, desc, inArray, sql, gte, lt } from "drizzle-orm";

async function consumirStockFIFO(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  productId: number,
  cantidadNecesaria: number,
  saleItemId: number,
) {
  const product = await tx.query.products.findFirst({
    where: eq(products.id, productId),
  });

  if (!product) {
    throw new Error(`Producto ${productId} no encontrado`);
  }

  const stockDisp = Number(product.stockDisponible);
  if (stockDisp < cantidadNecesaria) {
    throw new Error(
      `Stock insuficiente para ${product.nombre}. Disponible: ${stockDisp} kg, Necesario: ${cantidadNecesaria} kg`,
    );
  }

  const lotesDisponibles = await tx.query.lots.findMany({
    where: and(
      eq(lots.productId, productId),
      gt(lots.cantidadRestante, "0"),
    ),
    orderBy: [asc(lots.fechaCompra)],
  });

  let restaPorConsumir = cantidadNecesaria;

  for (const lote of lotesDisponibles) {
    if (restaPorConsumir <= 0) break;

    const disponibleEnLote = Number(lote.cantidadRestante);
    const aConsumir = Math.min(disponibleEnLote, restaPorConsumir);

    await tx.insert(saleLots).values({
      saleItemId,
      lotId: lote.id,
      cantidadConsumida: aConsumir.toString(),
      costoUnitarioSnapshot: lote.costoUnitario,
    });

    await tx
      .update(lots)
      .set({
        cantidadRestante: (disponibleEnLote - aConsumir).toString(),
      })
      .where(eq(lots.id, lote.id));

    restaPorConsumir -= aConsumir;
  }

  if (restaPorConsumir > 0.0001) {
    throw new Error(
      `No se pudo consumir todo el stock de ${product.nombre}. Faltan ${restaPorConsumir.toFixed(3)} kg`,
    );
  }

  await tx
    .update(products)
    .set({
      stockDisponible: sql`${products.stockDisponible} - ${cantidadNecesaria}`,
      updatedAt: new Date(),
    })
    .where(eq(products.id, productId));
}

async function consumirStockMix(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  mixId: number,
  cantidadMixKg: number,
  saleItemId: number,
) {
  const componentes = await tx.query.mixComponents.findMany({
    where: eq(mixComponents.mixId, mixId),
  });

  for (const comp of componentes) {
    const cantidadComponente = Number(comp.cantidad) * cantidadMixKg;
    await consumirStockFIFO(tx, comp.componenteId, cantidadComponente, saleItemId);
  }
}

export const crearPedido = createServerFn({ method: "POST" })
  .inputValidator((data: {
    customerId?: number;
    descuentoPct: number;
    items: {
      productId: number;
      cantidad: number;
      precioUnitario: number;
      vendidoComoUnidad: boolean;
      subtotal: number;
    }[];
  }) => data)
  .handler(async ({ data }) => {
    if (data.descuentoPct < 0 || data.descuentoPct > 100) {
      throw new Error("El descuento debe estar entre 0 y 100");
    }

    if (data.items.length === 0) {
      throw new Error("El pedido debe tener al menos un item");
    }

    return await db.transaction(async (tx) => {
      const totalBruto = data.items.reduce((sum, item) => sum + item.subtotal, 0);
      const totalFinal = totalBruto * (1 - data.descuentoPct / 100);

      const [sale] = await tx
        .insert(sales)
        .values({
          customerId: data.customerId || null,
          descuentoPct: data.descuentoPct.toString(),
          totalBruto: totalBruto.toString(),
          totalFinal: totalFinal.toString(),
          estado: "INGRESADO",
        })
        .returning();

      for (const item of data.items) {
        const [saleItem] = await tx
          .insert(saleItems)
          .values({
            saleId: sale.id,
            productId: item.productId,
            cantidad: item.cantidad.toString(),
            precioUnitario: item.precioUnitario.toString(),
            vendidoComoUnidad: item.vendidoComoUnidad,
            subtotal: item.subtotal.toString(),
          })
          .returning();

        const product = await tx.query.products.findFirst({
          where: eq(products.id, item.productId),
        });

        if (!product) {
          throw new Error(`Producto ${item.productId} no encontrado`);
        }

        if (product.esMix) {
          await consumirStockMix(tx, item.productId, item.cantidad, saleItem.id);
        } else {
          await consumirStockFIFO(tx, item.productId, item.cantidad, saleItem.id);
        }
      }

      return sale;
    });
  });

export const getPedidos = createServerFn({ method: "GET" })
  .inputValidator((data: {
    estado?: "INGRESADO" | "PREPARADO" | "ENTREGADO" | "ADEUDA_PAGO";
    mes?: string;
  }) => data)
  .handler(async ({ data }) => {
    let query = db
      .select({
        id: sales.id,
        customerId: sales.customerId,
        customerNombre: customers.nombre,
        estado: sales.estado,
        descuentoPct: sales.descuentoPct,
        totalBruto: sales.totalBruto,
        totalFinal: sales.totalFinal,
        createdAt: sales.createdAt,
        updatedAt: sales.updatedAt,
      })
      .from(sales)
      .leftJoin(customers, eq(sales.customerId, customers.id))
      .orderBy(desc(sales.createdAt));

    if (data.estado) {
      query = query.where(eq(sales.estado, data.estado));
    }

    if (data.mes) {
      const [year, month] = data.mes.split("-").map(Number);
      const inicioMes = new Date(year, month - 1, 1);
      const finMes = new Date(year, month, 1);
      query = query.where(
        and(gte(sales.createdAt, inicioMes), lt(sales.createdAt, finMes)),
      );
    }

    const pedidos = await query;

    const pedidosConItems = await Promise.all(
      pedidos.map(async (p) => {
        const items = await db
          .select({
            id: saleItems.id,
            productId: saleItems.productId,
            productNombre: products.nombre,
            cantidad: saleItems.cantidad,
            precioUnitario: saleItems.precioUnitario,
            vendidoComoUnidad: saleItems.vendidoComoUnidad,
            subtotal: saleItems.subtotal,
          })
          .from(saleItems)
          .leftJoin(products, eq(saleItems.productId, products.id))
          .where(eq(saleItems.saleId, p.id));

        return { ...p, items };
      }),
    );

    const conteos = {
      INGRESADO: 0,
      PREPARADO: 0,
      ENTREGADO: 0,
      ADEUDA_PAGO: 0,
    } as Record<string, number>;

    const todosPedidos = await db
      .select({ estado: sales.estado })
      .from(sales);

    for (const p of todosPedidos) {
      conteos[p.estado] = (conteos[p.estado] || 0) + 1;
    }

    return { pedidos: pedidosConItems, conteos };
  });

export const getPedido = createServerFn({ method: "GET" })
  .inputValidator((data: { id: number }) => data)
  .handler(async ({ data }) => {
    const pedido = await db
      .select({
        id: sales.id,
        customerId: sales.customerId,
        customerNombre: customers.nombre,
        estado: sales.estado,
        descuentoPct: sales.descuentoPct,
        totalBruto: sales.totalBruto,
        totalFinal: sales.totalFinal,
        createdAt: sales.createdAt,
        updatedAt: sales.updatedAt,
      })
      .from(sales)
      .leftJoin(customers, eq(sales.customerId, customers.id))
      .where(eq(sales.id, data.id));

    if (pedido.length === 0) {
      throw new Error("Pedido no encontrado");
    }

    const saleData = pedido[0];

    const items = await db
      .select({
        id: saleItems.id,
        productId: saleItems.productId,
        productNombre: products.nombre,
        cantidad: saleItems.cantidad,
        precioUnitario: saleItems.precioUnitario,
        vendidoComoUnidad: saleItems.vendidoComoUnidad,
        subtotal: saleItems.subtotal,
      })
      .from(saleItems)
      .leftJoin(products, eq(saleItems.productId, products.id))
      .where(eq(saleItems.saleId, saleData.id));

    const itemsConLotes = await Promise.all(
      items.map(async (item) => {
        const lotes = await db
          .select({
            id: saleLots.id,
            lotId: saleLots.lotId,
            cantidadConsumida: saleLots.cantidadConsumida,
            costoUnitarioSnapshot: saleLots.costoUnitarioSnapshot,
            loteFechaCompra: lots.fechaCompra,
            loteCostoUnitario: lots.costoUnitario,
          })
          .from(saleLots)
          .leftJoin(lots, eq(saleLots.lotId, lots.id))
          .where(eq(saleLots.saleItemId, item.id));

        return { ...item, lotes };
      }),
    );

    return { ...saleData, items: itemsConLotes };
  });

export const cambiarEstadoPedido = createServerFn({ method: "POST" })
  .inputValidator((data: {
    id: number;
    estado: "INGRESADO" | "PREPARADO" | "ENTREGADO" | "ADEUDA_PAGO";
  }) => data)
  .handler(async ({ data }) => {
    const [pedido] = await db
      .update(sales)
      .set({ estado: data.estado, updatedAt: new Date() })
      .where(eq(sales.id, data.id))
      .returning();

    return pedido;
  });
