# 03 — Reglas de Negocio

Este archivo describe las reglas críticas que la IA debe implementar correctamente.
Son los algoritmos del corazón del sistema.

---

## 1. Sistema de precios: productos con precio doble

Algunos productos tienen **dos precios distintos** según cómo se vendan.

### Configuración
```
Product.tipoVenta = "ambos"
Product.precioPorKg    = 10000  // precio por kg fraccionado
Product.precioUnidad   = 5500   // precio de una unidad cerrada
Product.pesoUnidad     = 0.5    // una unidad = 500g
```

### Regla de aplicación
| Cómo se vende | Se usa | Ejemplo |
|---|---|---|
| Cantidad en kg libre (ej: 250g, 750g, 1.3kg) | `precio_por_kg` | 250g → $10.000 * 0.25 = $2.500 |
| Como unidades cerradas (ej: 1 bolsa, 2 bolsas) | `precio_unidad` | 1 bolsa 500g → $5.500 |

**Importante:** NO se comparan los dos precios. La elección es explícita en el formulario de pedido.
El usuario elige si está vendiendo "kg fraccionado" o "unidad cerrada".

### En el formulario de nuevo pedido
Cuando se agrega un producto con `tipoVenta = "ambos"`:
- Mostrar un toggle: `[Por kg] / [Por unidad]`
- Si selecciona "Por kg": campo de cantidad en kg, precio = `precio_por_kg`
- Si selecciona "Por unidad": campo de cantidad en unidades (entero), precio = `precio_unidad`, la cantidad en kg = unidades * `peso_unidad`

### En SaleItem
```ts
// Venta fraccionada: 250g
saleItem = {
  cantidad: 0.25,              // siempre en kg
  precioUnitario: 10000,       // precio_por_kg
  vendidoComoUnidad: false,
  subtotal: 2500               // 0.25 * 10000
}

// Venta por unidad: 1 bolsa 500g
saleItem = {
  cantidad: 0.5,               // kg equivalentes (1 * 0.5kg)
  precioUnitario: 5500,        // precio_unidad
  vendidoComoUnidad: true,
  subtotal: 5500               // 1 unidad * 5500
}

// Venta por unidad: 2 bolsas 500g
saleItem = {
  cantidad: 1.0,               // kg equivalentes (2 * 0.5kg)
  precioUnitario: 5500,        // precio_unidad
  vendidoComoUnidad: true,
  subtotal: 11000              // 2 unidades * 5500
}
```

---

## 2. Lógica FIFO — Descuento de stock al vender

Esta es **la función más crítica** del sistema.
Se ejecuta cuando se crea un pedido (o cuando cambia a INGRESADO, si se decide descontar en ese momento — ver decisión al final).

### Algoritmo FIFO para un SaleItem

```ts
async function consumirStockFIFO(
  productId: number,
  cantidadNecesaria: number,  // en kg
  saleItemId: number,
  db: Database
): Promise<void> {

  // 1. Verificar stock disponible
  const product = await db.query.products.findFirst({
    where: eq(products.id, productId)
  })
  if (Number(product.stockDisponible) < cantidadNecesaria) {
    throw new Error(`Stock insuficiente para producto ${productId}. Disponible: ${product.stockDisponible} kg`)
  }

  // 2. Obtener lotes ordenados por fecha_compra ASC (FIFO)
  const lotesDisponibles = await db.query.lots.findMany({
    where: and(
      eq(lots.productId, productId),
      gt(lots.cantidadRestante, "0")
    ),
    orderBy: [asc(lots.fechaCompra)]
  })

  // 3. Consumir lotes hasta cubrir la cantidad
  let restaPorConsumir = cantidadNecesaria

  for (const lote of lotesDisponibles) {
    if (restaPorConsumir <= 0) break

    const disponibleEnLote = Number(lote.cantidadRestante)
    const aConsumir = Math.min(disponibleEnLote, restaPorConsumir)

    // 3a. Registrar trazabilidad
    await db.insert(saleLots).values({
      saleItemId,
      lotId: lote.id,
      cantidadConsumida: aConsumir.toString(),
      costoUnitarioSnapshot: lote.costoUnitario,
    })

    // 3b. Actualizar lote
    await db
      .update(lots)
      .set({
        cantidadRestante: (disponibleEnLote - aConsumir).toString()
      })
      .where(eq(lots.id, lote.id))

    restaPorConsumir -= aConsumir
  }

  // 4. Actualizar stock_disponible del producto
  await db
    .update(products)
    .set({
      stockDisponible: sql`${products.stockDisponible} - ${cantidadNecesaria}`
    })
    .where(eq(products.id, productId))
}
```

### FIFO para Mixes compuestos

Cuando el item es un mix, se llama `consumirStockFIFO` para **cada componente**:

```ts
async function consumirStockMix(
  mixId: number,
  cantidadMixKg: number,  // kg del mix a vender
  saleItemId: number,
  db: Database
): Promise<void> {

  const componentes = await db.query.mixComponents.findMany({
    where: eq(mixComponents.mixId, mixId)
  })

  for (const comp of componentes) {
    // cantidad del componente = proporción * kg del mix
    const cantidadComponente = Number(comp.cantidad) * cantidadMixKg
    await consumirStockFIFO(comp.componenteId, cantidadComponente, saleItemId, db)
  }
}
```

### ¿Cuándo se descuenta el stock?

**Al crear el pedido (estado INGRESADO).**

Razones:
- El stock queda "reservado" de forma real
- Si el pedido se cancela (edge case futuro), se devuelve el stock
- Es más simple: no hay que trackear cuándo cambiar de estado para descontar

---

## 3. Stock disponible de un Mix

Los mixes no tienen lotes propios. Su stock disponible es **calculado**, no guardado.

```ts
function calcularStockMix(
  componentes: MixComponent[],
  stockComponentes: Record<number, number>
): number {
  // El stock del mix es lo que permite hacer la menor cantidad posible
  // Ejemplo: Mix con 300g almendras + 700g nueces por kg:
  //   Almendras disponibles: 0.6 kg → podría hacer 0.6/0.3 = 2 kg de mix
  //   Nueces disponibles:    0.7 kg → podría hacer 0.7/0.7 = 1 kg de mix
  //   Stock del mix = min(2, 1) = 1 kg

  return Math.min(
    ...componentes.map(comp =>
      stockComponentes[comp.componenteId] / Number(comp.cantidad)
    )
  )
}
```

**Nota:** El campo `product.stockDisponible` de un mix siempre vale 0 en la DB.
Al mostrar el stock de un mix en la UI, se debe hacer este cálculo on-the-fly con una query.

---

## 4. Cálculo de ganancia real (balance)

### Por SaleItem
```
ganancia_item = subtotal_item - costo_fifo_item

donde:
  subtotal_item  = precio_unitario * cantidad (ya calculado y guardado)
  costo_fifo_item = SUM(saleLot.cantidad_consumida * saleLot.costo_unitario_snapshot)
                    para todos los SaleLots del SaleItem
```

### Por Sale (pedido)
```
ganancia_bruta_pedido = SUM(ganancia_item) para todos los items
ganancia_neta_pedido  = ganancia_bruta_pedido * (1 - descuento_pct / 100)
```

**IMPORTANTE:** Solo se cuentan pedidos con estado `ENTREGADO` o `ADEUDA_PAGO`.
Los pedidos `INGRESADO` y `PREPARADO` no existen para el balance.

### Balance mensual
```
total_facturado  = SUM(sale.total_final) donde estado IN ('ENTREGADO', 'ADEUDA_PAGO')
costo_mercaderia = SUM(saleLot.cantidad_consumida * saleLot.costo_unitario_snapshot) del mes
gastos_operativos = SUM(operationalExpense.monto) del mes
ganancia_neta    = total_facturado - costo_mercaderia - gastos_operativos
```

---

## 5. Registro de lote (ingreso de mercadería)

Cuando se agrega stock a un producto:

```ts
async function registrarLote(input: {
  productId: number
  supplierId?: number
  cantidadKg: number
  costoUnitario: number
  fechaCompra: Date
}) {
  // 1. Crear el lote
  await db.insert(lots).values({
    productId: input.productId,
    supplierId: input.supplierId,
    cantidadInicial: input.cantidadKg,
    cantidadRestante: input.cantidadKg,
    costoUnitario: input.costoUnitario,
    fechaCompra: input.fechaCompra,
  })

  // 2. Sumar al stock disponible del producto
  await db
    .update(products)
    .set({
      stockDisponible: sql`${products.stockDisponible} + ${input.cantidadKg}`
    })
    .where(eq(products.id, input.productId))
}
```

---

## 6. Registro de merma

```ts
async function registrarMerma(input: {
  productId: number
  cantidadKg: number
  motivo: string
  descripcion?: string
  fecha: Date
}) {
  // 1. Verificar stock suficiente
  // 2. Descontar FIFO de los lotes (misma lógica que consumirStockFIFO)
  //    pero sin crear SaleLot (no es una venta)
  // 3. Actualizar stock_disponible del producto
  // 4. Guardar registro en shrinkage
}
```

La merma descuenta stock real pero NO aparece en el balance como pérdida de dinero.

---

## 7. Validaciones importantes

| Validación | Dónde | Mensaje |
|---|---|---|
| Stock insuficiente al vender | Server function `pedidos.ts` | "Stock insuficiente para [producto]. Disponible: X kg" |
| Cantidad del mix > 0 | Al agregar item | "La cantidad debe ser mayor a 0" |
| Mix sin stock de algún componente | Al mostrar en formulario | Deshabilitar el producto con "Sin stock" |
| Suma de componentes del mix ≠ 1 | Al guardar receta del mix | "Los componentes deben sumar exactamente 1 kg" |
| Precio no puede ser 0 o negativo | Formulario producto | "El precio debe ser mayor a 0" |
| PIN incorrecto | Login | "PIN incorrecto" (sin detalle de cuántos intentos) |

---

## 8. Transacciones de base de datos

Las operaciones críticas deben ejecutarse en una **transacción** para garantizar consistencia:

```ts
// Ejemplo: crear un pedido completo
await db.transaction(async (tx) => {
  // 1. Crear el Sale
  const [sale] = await tx.insert(sales).values(...).returning()

  // 2. Para cada item:
  for (const item of items) {
    // 2a. Crear el SaleItem
    const [saleItem] = await tx.insert(saleItems).values(...).returning()

    // 2b. Consumir stock FIFO (crea SaleLots y actualiza Lots)
    await consumirStockFIFO(item.productId, item.cantidad, saleItem.id, tx)
  }
})
// Si cualquier paso falla, TODO el pedido se deshace
```

**Usar transacciones en:**
- Crear pedido (Sale + SaleItems + SaleLots + update Lots + update Product.stock)
- Registrar lote (Lot + update Product.stock)
- Registrar merma (update Lots + update Product.stock + insert Shrinkage)
