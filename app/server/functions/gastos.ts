import { createServerFn } from "@tanstack/react-start";
import { db } from "../db";
import { operationalExpenses } from "../db/schema";
import { eq, desc, sql, gte, lt } from "drizzle-orm";

export const getGastos = createServerFn({ method: "GET" })
  .inputValidator((data: { mes?: string }) => data)
  .handler(async ({ data }) => {
    let query = db
      .select()
      .from(operationalExpenses)
      .orderBy(desc(operationalExpenses.fecha));

    if (data.mes) {
      const [year, month] = data.mes.split("-").map(Number);
      const inicioMes = new Date(year, month - 1, 1);
      const finMes = new Date(year, month, 1);
      query = query.where(
        sql`${operationalExpenses.fecha} >= ${inicioMes} AND ${operationalExpenses.fecha} < ${finMes}`,
      );
    }

    const gastos = await query;

    const totalesPorCategoria = {
      packaging: 0,
      logistica: 0,
      impresiones: 0,
      otros: 0,
    } as Record<string, number>;

    for (const g of gastos) {
      totalesPorCategoria[g.categoria] =
        (totalesPorCategoria[g.categoria] || 0) + Number(g.monto);
    }

    return { gastos, totalesPorCategoria };
  });

export const crearGasto = createServerFn({ method: "POST" })
  .inputValidator((data: {
    descripcion: string;
    categoria: "packaging" | "logistica" | "impresiones" | "otros";
    monto: number;
    fecha: string;
  }) => data)
  .handler(async ({ data }) => {
    const [gasto] = await db
      .insert(operationalExpenses)
      .values({
        descripcion: data.descripcion,
        categoria: data.categoria,
        monto: data.monto.toString(),
        fecha: new Date(data.fecha),
      })
      .returning();

    return gasto;
  });

export const eliminarGasto = createServerFn({ method: "POST" })
  .inputValidator((data: { id: number }) => data)
  .handler(async ({ data }) => {
    await db
      .delete(operationalExpenses)
      .where(eq(operationalExpenses.id, data.id));

    return { ok: true };
  });
