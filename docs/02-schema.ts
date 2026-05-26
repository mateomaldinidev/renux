// ============================================================
// 02 — Schema Drizzle ORM — RENUX
// Archivo: app/server/db/schema.ts
// ============================================================

import {
  pgTable,
  serial,
  varchar,
  text,
  decimal,
  boolean,
  timestamp,
  integer,
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ─── ENUMS ────────────────────────────────────────────────────

/**
 * Tipo de venta del producto.
 * - por_kg: se vende pesado (ej: almendras, nueces)
 * - por_unidad: se vende en unidades cerradas
 * - ambos: tiene precio por kg Y precio por unidad (distintos)
 */
export const tipoVentaEnum = pgEnum("tipo_venta", [
  "por_kg",
  "por_unidad",
  "ambos",
]);

/**
 * Estados posibles de un pedido.
 * INGRESADO → PREPARADO → ENTREGADO
 *                       ↘ ADEUDA_PAGO (entregado pero sin cobrar)
 *
 * Las ganancias SOLO se contabilizan en estado ENTREGADO o ADEUDA_PAGO.
 */
export const estadoPedidoEnum = pgEnum("estado_pedido", [
  "INGRESADO",
  "PREPARADO",
  "ENTREGADO",
  "ADEUDA_PAGO",
]);

/**
 * Categorías de gastos operativos.
 */
export const categoriaGastoEnum = pgEnum("categoria_gasto", [
  "packaging",
  "logistica",
  "impresiones",
  "insumos",
  "otro",
]);

// ─── SUPPLIERS (Proveedores) ──────────────────────────────────

export const suppliers = pgTable("suppliers", {
  id: serial("id").primaryKey(),
  nombre: varchar("nombre", { length: 255 }).notNull(),
  telefono: varchar("telefono", { length: 50 }),
  activo: boolean("activo").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── PRODUCTS (Productos) ─────────────────────────────────────

export const products = pgTable("products", {
  id: serial("id").primaryKey(),

  nombre: varchar("nombre", { length: 255 }).notNull(),

  /**
   * Si es un mix compuesto (tiene componentes en mix_components).
   * Los mixes NO tienen lotes propios: su stock se calcula
   * dinámicamente en base al stock de sus componentes.
   */
  esMix: boolean("es_mix").default(false).notNull(),

  tipoVenta: tipoVentaEnum("tipo_venta").notNull(),

  /**
   * Precio de venta por kg.
   * Para tipo "ambos": este es el precio por kg suelto.
   */
  precioPorKg: decimal("precio_por_kg", { precision: 12, scale: 2 }),

  /**
   * Precio de venta por unidad (paquete cerrado).
   *
   * REGLA DE PRECIO DOBLE:
   * Cuando tipo_venta = "ambos", el producto tiene dos precios:
   *   - precio_por_kg: precio del kg (fraccionado, sin redondear)
   *   - precio_por_unidad: precio de un paquete cerrado de peso fijo
   *
   * Ejemplo: Nuez
   *   precio_por_kg = 10000  → cualquier cantidad en kg usa este precio
   *   precio_por_unidad = 5500 → una bolsa cerrada de 500g vale $5.500
   *
   * Cuando se vende en kg suelto (ej: 250g), se usa precio_por_kg.
   * No importa que 250g * $10/g = $2.500 < que medio paquete.
   * La regla es simple: fraccionado = precio_por_kg; cerrado = precio_por_unidad.
   *
   * pesoUnidad indica cuántos kg pesa una unidad cerrada (ej: 0.5 para 500g).
   */
  precioUnidad: decimal("precio_unidad", { precision: 12, scale: 2 }),

  /**
   * Peso en kg de una unidad cerrada.
   * Solo relevante cuando tipo_venta = "ambos".
   * Ejemplo: 0.5 (500g), 1.0 (1kg), 0.25 (250g)
   */
  pesoUnidad: decimal("peso_unidad", { precision: 8, scale: 3 }),

  /**
   * Stock disponible total en kg.
   * Para productos simples: se actualiza al registrar lotes y al vender.
   * Para mixes: este campo NO se usa directamente.
   *   El stock de un mix se calcula como:
   *   min( componente.stock / componente.cantidad ) para todos los componentes.
   */
  stockDisponible: decimal("stock_disponible", {
    precision: 12,
    scale: 3,
  })
    .default("0")
    .notNull(),

  activo: boolean("activo").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── MIX_COMPONENTS (Receta de los mixes) ────────────────────

/**
 * Define la composición de un mix compuesto.
 * Un mix tiene N componentes, cada uno con una cantidad en kg.
 *
 * Ejemplo — Mix Premium (1 kg total):
 *   - Almendras: 0.300 kg
 *   - Nueces:    0.250 kg
 *   - Pasas:     0.250 kg
 *   - Maní:      0.200 kg
 *
 * Las cantidades son proporcionales a 1 kg del mix.
 * Si se venden 500g del mix, se descuenta la mitad de cada componente.
 */
export const mixComponents = pgTable("mix_components", {
  id: serial("id").primaryKey(),
  mixId: integer("mix_id")
    .notNull()
    .references(() => products.id),
  componenteId: integer("componente_id")
    .notNull()
    .references(() => products.id),
  /**
   * Cantidad del componente (en kg) por cada 1 kg del mix.
   * La suma de todos los componentes de un mix DEBE ser 1.0.
   */
  cantidad: decimal("cantidad", { precision: 8, scale: 4 }).notNull(),
});

// ─── LOTS (Lotes de compra) ───────────────────────────────────

/**
 * Cada ingreso de mercadería crea un lote.
 * Los lotes se consumen en orden FIFO (por fecha_compra ASC).
 *
 * Solo los productos simples (es_mix = false) tienen lotes.
 * Los mixes no tienen lotes — su "costo" se calcula sumando
 * los costos FIFO de sus componentes al momento de la venta.
 */
export const lots = pgTable("lots", {
  id: serial("id").primaryKey(),
  productId: integer("product_id")
    .notNull()
    .references(() => products.id),
  supplierId: integer("supplier_id").references(() => suppliers.id),

  cantidadInicial: decimal("cantidad_inicial", {
    precision: 12,
    scale: 3,
  }).notNull(),
  cantidadRestante: decimal("cantidad_restante", {
    precision: 12,
    scale: 3,
  }).notNull(),

  /**
   * Costo real de compra por kg en este lote.
   * Este valor NO cambia aunque el precio de venta suba.
   * Se usa para calcular la ganancia real en cada venta.
   */
  costoUnitario: decimal("costo_unitario", {
    precision: 12,
    scale: 2,
  }).notNull(),

  fechaCompra: timestamp("fecha_compra").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── CUSTOMERS (Clientes) ─────────────────────────────────────

/**
 * Los clientes son solo informativos.
 * No hay CRM, no hay historial complejo, no hay cuentas de cliente.
 * Sirven para asociar pedidos y ver quién adeuda pago.
 */
export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  nombre: varchar("nombre", { length: 255 }).notNull(),
  telefono: varchar("telefono", { length: 50 }),
  activo: boolean("activo").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── SALES (Pedidos) ──────────────────────────────────────────

export const sales = pgTable("sales", {
  id: serial("id").primaryKey(),

  /**
   * Cliente opcional. Si es null, el pedido es anónimo.
   */
  customerId: integer("customer_id").references(() => customers.id),

  estado: estadoPedidoEnum("estado").default("INGRESADO").notNull(),

  /**
   * Descuento porcentual aplicado al total bruto.
   * Ejemplo: 10 = 10% de descuento.
   * Si no hay descuento: 0.
   */
  descuentoPct: decimal("descuento_pct", { precision: 5, scale: 2 })
    .default("0")
    .notNull(),

  /**
   * Suma de (precio_unitario * cantidad) de todos los items.
   * Sin aplicar descuento.
   */
  totalBruto: decimal("total_bruto", { precision: 12, scale: 2 }).notNull(),

  /**
   * totalBruto * (1 - descuentoPct / 100)
   * Lo que realmente paga el cliente.
   */
  totalFinal: decimal("total_final", { precision: 12, scale: 2 }).notNull(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── SALE_ITEMS (Items del pedido) ───────────────────────────

/**
 * Cada línea de un pedido: un producto con su cantidad y precio.
 *
 * PRECIO AL MOMENTO DE LA VENTA:
 * Se guarda el precio usado en la venta, no el precio actual del producto.
 * Esto garantiza consistencia histórica aunque los precios suban.
 *
 * CAMPO vendidoComoUnidad:
 * Para productos con tipo_venta = "ambos":
 * - vendidoComoUnidad = false → se vendió por kg (usa precio_por_kg)
 * - vendidoComoUnidad = true  → se vendió como unidad cerrada (usa precio_unidad)
 *
 * La cantidad siempre se guarda en kg para trazabilidad de stock.
 * Ejemplo: se vende "1 unidad de 500g" → cantidad = 0.5, precio_unitario = 5500, vendidoComoUnidad = true
 */
export const saleItems = pgTable("sale_items", {
  id: serial("id").primaryKey(),
  saleId: integer("sale_id")
    .notNull()
    .references(() => sales.id),
  productId: integer("product_id")
    .notNull()
    .references(() => products.id),

  /**
   * Cantidad vendida en KG (siempre en kg, aunque se vendiera por unidad).
   */
  cantidad: decimal("cantidad", { precision: 12, scale: 3 }).notNull(),

  /**
   * Precio unitario usado en la venta (por kg o por unidad, según vendidoComoUnidad).
   * Snapshot del precio al momento de crear el pedido.
   */
  precioUnitario: decimal("precio_unitario", {
    precision: 12,
    scale: 2,
  }).notNull(),

  /**
   * Si true: se vendió como paquete cerrado (precio_unidad).
   * Si false: se vendió fraccionado (precio_por_kg).
   * Solo relevante para tipo_venta = "ambos". Para el resto siempre false.
   */
  vendidoComoUnidad: boolean("vendido_como_unidad").default(false).notNull(),

  /**
   * precio_unitario * cantidad (en kg) si vendido por kg.
   * precio_unitario * (cantidad / peso_unidad) si vendido por unidad.
   * Calculado y guardado al crear el item.
   */
  subtotal: decimal("subtotal", { precision: 12, scale: 2 }).notNull(),
});

// ─── SALE_LOTS (Trazabilidad FIFO) ────────────────────────────

/**
 * Registra exactamente qué lotes se consumieron para cada item de pedido.
 * Es el registro de trazabilidad FIFO.
 *
 * Un SaleItem puede consumir múltiples lotes si el primero no alcanza.
 *
 * Ejemplo:
 *   Vendo 1.5 kg de almendras.
 *   Lote 1 tiene 0.4 kg restantes → se consumen todos (0.4 kg)
 *   Lote 2 tiene 3.0 kg restantes → se consumen 1.1 kg
 *   Se crean 2 registros de SaleLot.
 */
export const saleLots = pgTable("sale_lots", {
  id: serial("id").primaryKey(),
  saleItemId: integer("sale_item_id")
    .notNull()
    .references(() => saleItems.id),
  lotId: integer("lot_id")
    .notNull()
    .references(() => lots.id),

  /**
   * Cuántos kg se consumieron de este lote para este item.
   */
  cantidadConsumida: decimal("cantidad_consumida", {
    precision: 12,
    scale: 3,
  }).notNull(),

  /**
   * Snapshot del costo unitario del lote al momento de la venta.
   * Necesario para calcular la ganancia aunque el lote se modifique después.
   */
  costoUnitarioSnapshot: decimal("costo_unitario_snapshot", {
    precision: 12,
    scale: 2,
  }).notNull(),
});

// ─── OPERATIONAL_EXPENSES (Gastos operativos) ─────────────────

/**
 * Gastos del negocio que no son compra de mercadería.
 * Se descuentan de la ganancia neta en el balance mensual.
 * Ejemplos: bolsas, etiquetas, logística, impresiones.
 */
export const operationalExpenses = pgTable("operational_expenses", {
  id: serial("id").primaryKey(),
  descripcion: varchar("descripcion", { length: 500 }).notNull(),
  categoria: categoriaGastoEnum("categoria").notNull(),
  monto: decimal("monto", { precision: 12, scale: 2 }).notNull(),
  fecha: timestamp("fecha").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── SHRINKAGE (Mermas) ───────────────────────────────────────

/**
 * Pérdidas de stock registradas manualmente.
 * No impactan el balance como pérdida de dinero.
 * Solo descuentan el stock del producto.
 * Se aplica también con lógica FIFO (consume el lote más antiguo).
 */
export const shrinkage = pgTable("shrinkage", {
  id: serial("id").primaryKey(),
  productId: integer("product_id")
    .notNull()
    .references(() => products.id),
  cantidad: decimal("cantidad", { precision: 12, scale: 3 }).notNull(),
  motivo: varchar("motivo", { length: 255 }).notNull(),
  descripcion: text("descripcion"),
  fecha: timestamp("fecha").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── RELATIONS ────────────────────────────────────────────────

export const productsRelations = relations(products, ({ many }) => ({
  mixAsMain: many(mixComponents, { relationName: "mix" }),
  mixAsComponent: many(mixComponents, { relationName: "componente" }),
  lots: many(lots),
  saleItems: many(saleItems),
  shrinkage: many(shrinkage),
}));

export const mixComponentsRelations = relations(mixComponents, ({ one }) => ({
  mix: one(products, {
    fields: [mixComponents.mixId],
    references: [products.id],
    relationName: "mix",
  }),
  componente: one(products, {
    fields: [mixComponents.componenteId],
    references: [products.id],
    relationName: "componente",
  }),
}));

export const lotsRelations = relations(lots, ({ one, many }) => ({
  product: one(products, {
    fields: [lots.productId],
    references: [products.id],
  }),
  supplier: one(suppliers, {
    fields: [lots.supplierId],
    references: [suppliers.id],
  }),
  saleLots: many(saleLots),
}));

export const customersRelations = relations(customers, ({ many }) => ({
  sales: many(sales),
}));

export const salesRelations = relations(sales, ({ one, many }) => ({
  customer: one(customers, {
    fields: [sales.customerId],
    references: [customers.id],
  }),
  items: many(saleItems),
}));

export const saleItemsRelations = relations(saleItems, ({ one, many }) => ({
  sale: one(sales, {
    fields: [saleItems.saleId],
    references: [sales.id],
  }),
  product: one(products, {
    fields: [saleItems.productId],
    references: [products.id],
  }),
  saleLots: many(saleLots),
}));

export const saleLotsRelations = relations(saleLots, ({ one }) => ({
  saleItem: one(saleItems, {
    fields: [saleLots.saleItemId],
    references: [saleItems.id],
  }),
  lot: one(lots, {
    fields: [saleLots.lotId],
    references: [lots.id],
  }),
}));

export const shrinkageRelations = relations(shrinkage, ({ one }) => ({
  product: one(products, {
    fields: [shrinkage.productId],
    references: [products.id],
  }),
}));

export const suppliersRelations = relations(suppliers, ({ many }) => ({
  lots: many(lots),
}));

// ─── TIPOS TYPESCRIPT INFERIDOS ──────────────────────────────
// Usar estos tipos en el resto del código para type-safety.

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
export type Lot = typeof lots.$inferSelect;
export type NewLot = typeof lots.$inferInsert;
export type Sale = typeof sales.$inferSelect;
export type NewSale = typeof sales.$inferInsert;
export type SaleItem = typeof saleItems.$inferSelect;
export type NewSaleItem = typeof saleItems.$inferInsert;
export type SaleLot = typeof saleLots.$inferSelect;
export type Customer = typeof customers.$inferSelect;
export type Supplier = typeof suppliers.$inferSelect;
export type OperationalExpense = typeof operationalExpenses.$inferSelect;
export type Shrinkage = typeof shrinkage.$inferSelect;
export type MixComponent = typeof mixComponents.$inferSelect;
