import { createServerFn } from "@tanstack/react-start";
import { db } from "../db";
import { sales, saleItems, products, customers } from "../db/schema";
import { eq, and, gte, lt, desc, sql } from "drizzle-orm";

export const getDashboardData = createServerFn({ method: "GET" })
  .inputValidator((data: { mes?: string }) => data)
  .handler(async ({ data }) => {
    const mes = data.mes || new Date().toISOString().slice(0, 7);
    const [year, month] = mes.split("-").map(Number);
    const inicioMes = new Date(year, month - 1, 1);
    const finMes = new Date(year, month, 1);

    // Stats del mes: solo ENTREGADO y ADEUDA_PAGO
    const ventasMes = await db
      .select({
        totalFinal: sales.totalFinal,
      })
      .from(sales)
      .where(
        and(
          sql`${sales.estado} IN ('ENTREGADO', 'ADEUDA_PAGO')`,
          gte(sales.createdAt, inicioMes),
          lt(sales.createdAt, finMes),
        ),
      );

    const totalFacturado = ventasMes.reduce((sum, v) => sum + Number(v.totalFinal), 0);

    // Costo mercaderia del mes
    const costoMercaderiaResult = await db
      .select({
        costo: saleLots.costoUnitarioSnapshot,
        cantidad: saleLots.cantidadConsumida,
      })
      .from(saleLots)
      .innerJoin(saleItems, eq(saleLots.saleItemId, saleItems.id))
      .innerJoin(sales, eq(saleItems.saleId, sales.id))
      .where(
        and(
          sql`${sales.estado} IN ('ENTREGADO', 'ADEUDA_PAGO')`,
          gte(sales.createdAt, inicioMes),
          lt(sales.createdAt, finMes),
        ),
      );

    const costoMercaderia = costoMercaderiaResult.reduce(
      (sum, r) => sum + Number(r.cantidad) * Number(r.costo),
      0,
    );

    // Gastos operativos del mes
    const { operationalExpenses } = await import("../db/schema");
    const gastosMes = await db
      .select({ monto: operationalExpenses.monto })
      .from(operationalExpenses)
      .where(
        and(
          gte(operationalExpenses.fecha, inicioMes),
          lt(operationalExpenses.fecha, finMes),
        ),
      );

    const gastosOperativos = gastosMes.reduce((sum, g) => sum + Number(g.monto), 0);
    const gananciaNeta = totalFacturado - costoMercaderia - gastosOperativos;

    // Producto mas vendido del mes
    const productosVendidos = await db
      .select({
        productId: saleItems.productId,
        productName: products.nombre,
        cantidad: saleItems.cantidad,
      })
      .from(saleItems)
      .innerJoin(products, eq(saleItems.productId, products.id))
      .innerJoin(sales, eq(saleItems.saleId, sales.id))
      .where(
        and(
          sql`${sales.estado} IN ('ENTREGADO', 'ADEUDA_PAGO')`,
          gte(sales.createdAt, inicioMes),
          lt(sales.createdAt, finMes),
        ),
      );

    const kgPorProducto: Record<string, { nombre: string; kg: number }> = {};
    for (const pv of productosVendidos) {
      const key = String(pv.productId);
      if (!kgPorProducto[key]) {
        kgPorProducto[key] = { nombre: pv.productName, kg: 0 };
      }
      kgPorProducto[key].kg += Number(pv.cantidad);
    }

    let productoMasVendido = { nombre: "—", kg: 0 };
    for (const [, v] of Object.entries(kgPorProducto)) {
      if (v.kg > productoMasVendido.kg) {
        productoMasVendido = v;
      }
    }

    // Pedidos pendientes: INGRESADO y PREPARADO
    const pedidosPendientes = await db
      .select({
        id: sales.id,
        customerNombre: customers.nombre,
        estado: sales.estado,
        totalFinal: sales.totalFinal,
        createdAt: sales.createdAt,
      })
      .from(sales)
      .leftJoin(customers, eq(sales.customerId, customers.id))
      .where(
        and(
          sql`${sales.estado} IN ('INGRESADO', 'PREPARADO')`,
        ),
      )
      .orderBy(desc(sales.createdAt))
      .limit(5);

    // Pedidos que adeudan: ADEUDA_PAGO
    const pedidosAdeudan = await db
      .select({
        id: sales.id,
        customerNombre: customers.nombre,
        totalFinal: sales.totalFinal,
        createdAt: sales.createdAt,
      })
      .from(sales)
      .leftJoin(customers, eq(sales.customerId, customers.id))
      .where(eq(sales.estado, "ADEUDA_PAGO"))
      .orderBy(desc(sales.createdAt))
      .limit(5);

    return {
      stats: {
        totalFacturado,
        costoMercaderia,
        gastosOperativos,
        gananciaNeta,
        productoMasVendido: productoMasVendido.nombre,
        kgProductoMasVendido: productoMasVendido.kg,
      },
      pedidosPendientes,
      pedidosAdeudan,
    };
  });
