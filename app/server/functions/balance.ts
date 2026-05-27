import { createServerFn } from "@tanstack/react-start";
import { db } from "../db";
import { sales, saleItems, saleLots, products, operationalExpenses } from "../db/schema";
import { eq, and, gte, lt, sql, desc } from "drizzle-orm";

function getPeriodDates(periodo: "mes" | "anio", mes?: string) {
  const now = new Date();
  if (periodo === "mes") {
    const mesStr = mes || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const [year, month] = mesStr.split("-").map(Number);
    return {
      inicio: new Date(year, month - 1, 1),
      fin: new Date(year, month, 1),
    };
  }
  const year = mes ? Number(mes.split("-")[0]) : now.getFullYear();
  return {
    inicio: new Date(year, 0, 1),
    fin: new Date(year + 1, 0, 1),
  };
}

export const getBalance = createServerFn({ method: "GET" })
  .inputValidator((data: { periodo: "mes" | "anio"; mes?: string }) => data)
  .handler(async ({ data }) => {
    const { inicio, fin } = getPeriodDates(data.periodo, data.mes);

    // 1. Total facturado (solo ENTREGADO y ADEUDA_PAGO)
    const ventas = await db
      .select({ totalFinal: sales.totalFinal })
      .from(sales)
      .where(
        and(
          sql`${sales.estado} IN ('ENTREGADO', 'ADEUDA_PAGO')`,
          gte(sales.createdAt, inicio),
          lt(sales.createdAt, fin),
        ),
      );

    const totalFacturado = ventas.reduce((sum, v) => sum + Number(v.totalFinal), 0);

    // 2. Costo mercaderia (FIFO)
    const costoRows = await db
      .select({
        cantidad: saleLots.cantidadConsumida,
        costo: saleLots.costoUnitarioSnapshot,
      })
      .from(saleLots)
      .innerJoin(saleItems, eq(saleLots.saleItemId, saleItems.id))
      .innerJoin(sales, eq(saleItems.saleId, sales.id))
      .where(
        and(
          sql`${sales.estado} IN ('ENTREGADO', 'ADEUDA_PAGO')`,
          gte(sales.createdAt, inicio),
          lt(sales.createdAt, fin),
        ),
      );

    const costoMercaderia = costoRows.reduce(
      (sum, r) => sum + Number(r.cantidad) * Number(r.costo),
      0,
    );

    // 3. Gastos operativos
    const gastos = await db
      .select({ monto: operationalExpenses.monto })
      .from(operationalExpenses)
      .where(
        and(
          gte(operationalExpenses.fecha, inicio),
          lt(operationalExpenses.fecha, fin),
        ),
      );

    const gastosOperativos = gastos.reduce((sum, g) => sum + Number(g.monto), 0);
    const gananciaNeta = totalFacturado - costoMercaderia - gastosOperativos;
    const margenPct = totalFacturado > 0 ? (gananciaNeta / totalFacturado) * 100 : 0;

    // 4. Historial mensual (ultimos 6 meses)
    const historialMensual: Array<{ mes: string; facturado: number }> = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(fin);
      d.setMonth(d.getMonth() - i);
      const mesInicio = new Date(d.getFullYear(), d.getMonth(), 1);
      const mesFin = new Date(d.getFullYear(), d.getMonth() + 1, 1);

      const ventasMes = await db
        .select({ totalFinal: sales.totalFinal })
        .from(sales)
        .where(
          and(
            sql`${sales.estado} IN ('ENTREGADO', 'ADEUDA_PAGO')`,
            gte(sales.createdAt, mesInicio),
            lt(sales.createdAt, mesFin),
          ),
        );

      const facturado = ventasMes.reduce((sum, v) => sum + Number(v.totalFinal), 0);
      const mesKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      historialMensual.push({ mes: mesKey, facturado });
    }

    // 5. Detalle por producto
    const itemsConLotes = await db
      .select({
        productId: saleItems.productId,
        productName: products.nombre,
        cantidad: saleItems.cantidad,
        subtotal: saleItems.subtotal,
        loteCantidad: saleLots.cantidadConsumida,
        loteCosto: saleLots.costoUnitarioSnapshot,
      })
      .from(saleItems)
      .innerJoin(products, eq(saleItems.productId, products.id))
      .leftJoin(saleLots, eq(saleItems.id, saleLots.saleItemId))
      .innerJoin(sales, eq(saleItems.saleId, sales.id))
      .where(
        and(
          sql`${sales.estado} IN ('ENTREGADO', 'ADEUDA_PAGO')`,
          gte(sales.createdAt, inicio),
          lt(sales.createdAt, fin),
        ),
      );

    const productoMap: Record<string, {
      nombre: string;
      kgVendidos: number;
      facturado: number;
      costoFIFO: number;
    }> = {};

    for (const row of itemsConLotes) {
      const key = String(row.productId);
      if (!productoMap[key]) {
        productoMap[key] = { nombre: row.productName, kgVendidos: 0, facturado: 0, costoFIFO: 0 };
      }
      productoMap[key].kgVendidos += Number(row.cantidad);
      productoMap[key].facturado += Number(row.subtotal);
      if (row.loteCantidad && row.loteCosto) {
        productoMap[key].costoFIFO += Number(row.loteCantidad) * Number(row.loteCosto);
      }
    }

    const detalleProductos = Object.entries(productoMap).map(([id, p]) => ({
      id: Number(id),
      nombre: p.nombre,
      kgVendidos: p.kgVendidos,
      facturado: p.facturado,
      costoFIFO: p.costoFIFO,
      ganancia: p.facturado - p.costoFIFO,
      margenPct: p.facturado > 0 ? ((p.facturado - p.costoFIFO) / p.facturado) * 100 : 0,
    }));

    // 6. Mas/menos vendidos
    const ordenados = [...detalleProductos].sort((a, b) => b.kgVendidos - a.kgVendidos);
    const productosMasVendidos = ordenados.slice(0, 5).map((p) => ({
      producto: p.nombre,
      kgVendidos: p.kgVendidos,
      facturado: p.facturado,
    }));
    const productosMenosVendidos = ordenados.reverse().slice(0, 5).map((p) => ({
      producto: p.nombre,
      kgVendidos: p.kgVendidos,
    }));

    return {
      stats: {
        totalFacturado,
        costoMercaderia,
        gastosOperativos,
        gananciaNeta,
        margenPct,
      },
      historialMensual,
      detalleProductos: ordenados.sort((a, b) => b.facturado - a.facturado),
      productosMasVendidos,
      productosMenosVendidos,
    };
  });
