import { createServerFn } from "@tanstack/react-start";
import { db } from "../db";
import { customers, sales } from "../db/schema";
import { eq, desc, sql, count } from "drizzle-orm";

export const getClientes = createServerFn({ method: "GET" })
  .inputValidator((data: { busqueda?: string }) => data)
  .handler(async ({ data }) => {
    let query = db
      .select({
        id: customers.id,
        nombre: customers.nombre,
        telefono: customers.telefono,
        createdAt: customers.createdAt,
      })
      .from(customers)
      .orderBy(desc(customers.createdAt));

    if (data.busqueda) {
      query = query.where(
        sql`${customers.nombre} ILIKE ${`%${data.busqueda}%`} OR ${customers.telefono} ILIKE ${`%${data.busqueda}%`}`,
      );
    }

    const clientes = await query;

    const clientesConStats = await Promise.all(
      clientes.map(async (c) => {
        const pedidosResult = await db
          .select({ count: count() })
          .from(sales)
          .where(eq(sales.customerId, c.id));

        const totalResult = await db
          .select({ total: sql<number>`COALESCE(SUM(${sales.totalFinal}::numeric), 0)` })
          .from(sales)
          .where(
            sql`${sales.customerId} = ${c.id} AND ${sales.estado} IN ('ENTREGADO', 'ADEUDA_PAGO')`,
          );

        const adeudaResult = await db
          .select({ count: count() })
          .from(sales)
          .where(
            sql`${sales.customerId} = ${c.id} AND ${sales.estado} = 'ADEUDA_PAGO'`,
          );

        return {
          ...c,
          totalPedidos: pedidosResult[0]?.count || 0,
          totalComprado: totalResult[0]?.total || 0,
          adeudaPago: (adeudaResult[0]?.count || 0) > 0,
        };
      }),
    );

    return clientesConStats;
  });

export const crearCliente = createServerFn({ method: "POST" })
  .inputValidator((data: { nombre: string; telefono?: string }) => data)
  .handler(async ({ data }) => {
    const [cliente] = await db
      .insert(customers)
      .values({
        nombre: data.nombre,
        telefono: data.telefono || null,
      })
      .returning();

    return cliente;
  });
