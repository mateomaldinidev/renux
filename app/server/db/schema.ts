import {
  pgTable,
  serial,
  text,
  decimal,
  boolean,
  timestamp,
  integer,
  pgEnum,
} from "drizzle-orm/pg-core";

// ─── Enums ───────────────────────────────────────────────

export const tipoVentaEnum = pgEnum("tipo_venta", [
  "por_kg",
  "por_unidad",
  "ambos",
]);

export const estadoPedidoEnum = pgEnum("estado_pedido", [
  "INGRESADO",
  "PREPARADO",
  "ENTREGADO",
  "ADEUDA_PAGO",
]);

export const categoriaGastoEnum = pgEnum("categoria_gasto", [
  "packaging",
  "logistica",
  "impresiones",
  "otros",
]);

// ─── Products ────────────────────────────────────────────

export const products = pgTable("products", {
  id: serial().primaryKey(),
  nombre: text().notNull(),
  esMix: boolean().default(false).notNull(),
  tipoVenta: tipoVentaEnum().default("por_kg").notNull(),
  precioPorKg: decimal("precio_por_kg"),
  precioUnidad: decimal("precio_unidad"),
  pesoUnidad: decimal("peso_unidad"),
  stockDisponible: decimal("stock_disponible").default("0").notNull(),
  activo: boolean().default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Lots ────────────────────────────────────────────────

export const lots = pgTable("lots", {
  id: serial().primaryKey(),
  productId: integer("product_id").notNull().references(() => products.id),
  supplierId: integer("supplier_id").references(() => suppliers.id),
  cantidadInicial: decimal("cantidad_inicial").notNull(),
  cantidadRestante: decimal("cantidad_restante").notNull(),
  costoUnitario: decimal("costo_unitario").notNull(),
  fechaCompra: timestamp("fecha_compra").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Mix Components ──────────────────────────────────────

export const mixComponents = pgTable("mix_components", {
  id: serial().primaryKey(),
  mixId: integer("mix_id").notNull().references(() => products.id),
  componenteId: integer("componente_id").notNull().references(() => products.id),
  cantidad: decimal().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Shrinkage (Mermas) ─────────────────────────────────

export const shrinkage = pgTable("shrinkage", {
  id: serial().primaryKey(),
  productId: integer("product_id").notNull().references(() => products.id),
  cantidadKg: decimal("cantidad_kg").notNull(),
  motivo: text().notNull(),
  descripcion: text(),
  fecha: timestamp().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Suppliers ───────────────────────────────────────────

export const suppliers = pgTable("suppliers", {
  id: serial().primaryKey(),
  nombre: text().notNull(),
  contacto: text(),
  telefono: text(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Customers ───────────────────────────────────────────

export const customers = pgTable("customers", {
  id: serial().primaryKey(),
  nombre: text().notNull(),
  telefono: text(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Sales (Pedidos) ─────────────────────────────────────

export const sales = pgTable("sales", {
  id: serial().primaryKey(),
  customerId: integer("customer_id").references(() => customers.id),
  estado: estadoPedidoEnum().default("INGRESADO").notNull(),
  descuentoPct: decimal("descuento_pct").default("0").notNull(),
  totalBruto: decimal("total_bruto").notNull(),
  totalFinal: decimal("total_final").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Sale Items ──────────────────────────────────────────

export const saleItems = pgTable("sale_items", {
  id: serial().primaryKey(),
  saleId: integer("sale_id").notNull().references(() => sales.id),
  productId: integer("product_id").notNull().references(() => products.id),
  cantidad: decimal().notNull(),
  precioUnitario: decimal("precio_unitario").notNull(),
  vendidoComoUnidad: boolean("vendido_como_unidad").default(false).notNull(),
  subtotal: decimal().notNull(),
});

// ─── Sale Lots (Trazabilidad FIFO) ───────────────────────

export const saleLots = pgTable("sale_lots", {
  id: serial().primaryKey(),
  saleItemId: integer("sale_item_id").notNull().references(() => saleItems.id),
  lotId: integer("lot_id").notNull().references(() => lots.id),
  cantidadConsumida: decimal("cantidad_consumida").notNull(),
  costoUnitarioSnapshot: decimal("costo_unitario_snapshot").notNull(),
});

// ─── Operational Expenses (Gastos) ───────────────────────

export const operationalExpenses = pgTable("operational_expenses", {
  id: serial().primaryKey(),
  descripcion: text().notNull(),
  categoria: categoriaGastoEnum().notNull(),
  monto: decimal().notNull(),
  fecha: timestamp().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
