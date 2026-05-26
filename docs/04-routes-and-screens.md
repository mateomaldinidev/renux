# 04 — Rutas, Pantallas y Server Functions

Cada sección corresponde a un archivo de ruta en `app/routes/`.
Para cada pantalla se indica: qué datos necesita, qué server functions se usan, y las acciones disponibles.

---

## A-01 — Login (`/login`)

**Archivo:** `app/routes/login.tsx`

### UI
- Logo RENUX centrado
- 6 puntos indicadores del PIN ingresado (ocultos como bullets)
- Teclado numérico en pantalla (para uso en tablet/touch)
- También funciona con teclado físico (capturar keydown)
- Estado de error: puntos en rojo + mensaje "PIN incorrecto"

### Server function
```ts
// app/server/functions/auth.ts
export const verificarPin = createServerFn()
  .validator(z.object({ pin: z.string().length(6) }))
  .handler(async ({ data }) => {
    if (data.pin !== process.env.ACCESS_PIN) {
      throw new Error("PIN incorrecto")
    }
    // Crear cookie httpOnly firmada
    // Redirect a "/"
  })
```

### Comportamiento
- Si la cookie ya es válida → redirect automático a `/`
- Al ingresar el PIN correcto → cookie + redirect a `/`
- PIN incorrecto → mostrar error, limpiar los puntos

---

## B-01 — Home / Dashboard (`/`)

**Archivo:** `app/routes/index.tsx`

### Datos necesarios
```ts
// Cargar al entrar
- stats del mes actual:
  - total_facturado (ventas ENTREGADO + ADEUDA_PAGO del mes)
  - ganancia_neta del mes
  - producto más vendido (por kg) del mes
- pedidos pendientes: estado IN ('INGRESADO', 'PREPARADO')
  - con customer.nombre si existe
  - con items (nombres de productos)
- pedidos que adeudan: estado = 'ADEUDA_PAGO'
```

### Server functions
```ts
export const getDashboardData = createServerFn().handler(async () => {
  // Retorna todo en una sola query para evitar waterfalls
  return { stats, pedidosPendientes, pedidosAdeudan }
})
```

### UI elementos
- 3 stat cards: Facturado, Ganancia neta, Producto más vendido
- Lista "Pedidos pendientes" — click en cada fila → `/pedidos/$id`
- Lista "Adeudan pago" — cards con borde rojo — click → `/pedidos/$id`
- Si no hay pendientes: empty state con "🎉 Todo al día"

---

## B-02 — Productos Lista (`/productos`)

**Archivo:** `app/routes/productos/index.tsx`

### Datos necesarios
```ts
- Lista de todos los productos (activos por defecto)
- Para cada producto:
  - id, nombre, esMix, tipoVenta, precioPorKg, precioUnidad, pesoUnidad
  - stockDisponible (calculado si es mix)
  - activo
```

### Server functions
```ts
export const getProductos = createServerFn()
  .validator(z.object({
    busqueda: z.string().optional(),
    tipo: z.enum(["todos", "por_kg", "por_unidad", "ambos", "mix"]).optional(),
    verInactivos: z.boolean().optional()
  }))
  .handler(async ({ data }) => { ... })
```

### UI
- Buscador (filtra por nombre, en tiempo real con debounce de 200ms)
- Select de tipo (todos / por_kg / por_unidad / mix)
- Toggle "Ver inactivos"
- Grid de ProductCard (3 columnas en desktop, 1 en mobile)
- Cada card muestra: nombre, badge tipo, stock con barra de progreso (roja si < 15%)
- Click en card → `/productos/$id`
- Botón "+ Nuevo producto" → `/productos/nuevo`

### Regla de stock bajo
```ts
const esStockBajo = (product: Product) => {
  // Para producto simple: si stockDisponible < 500g (0.5 kg) OR < 15% del máximo histórico
  // Implementación simple: si stock < 0.5 → rojo
  return Number(product.stockDisponible) < 0.5
}
```

---

## B-03 — Producto Detalle (`/productos/$id`)

**Archivo:** `app/routes/productos/$id.tsx`

### Datos necesarios
```ts
- Product completo
- Si esMix: array de MixComponent con producto incluido
- Lots del producto (ordenados por fecha_compra DESC para mostrar historial)
- Shrinkages recientes (últimas 5)
- Stats del mes: kg vendidos del producto, total facturado
```

### Server functions
```ts
export const getProducto = createServerFn()
  .validator(z.object({ id: z.number() }))
  .handler(async ({ data }) => { ... })

export const updateProducto = createServerFn()
  .validator(z.object({
    id: z.number(),
    nombre: z.string().optional(),
    precioPorKg: z.string().optional(),
    precioUnidad: z.string().optional(),
    pesoUnidad: z.string().optional(),
    tipoVenta: tipoVentaEnumValues.optional(),
    activo: z.boolean().optional(),
  }))
  .handler(async ({ data }) => { ... })
```

### Secciones de la pantalla
1. **Header**: nombre + badges (activo/inactivo, tipo) + botón "Guardar cambios"
2. **Datos**: form editable con nombre, tipo, precios
3. **Stock y lotes**: total disponible + tabla de lotes FIFO + botón "Agregar stock"
4. **Composición del mix** (solo si esMix): tabla de componentes con cantidades
5. **Mermas recientes**: tabla últimas 5, link "Registrar merma"
6. **Stats**: kg vendidos este mes, total facturado

---

## B-04 — Agregar Stock (`/productos/$id` — modal)

No tiene ruta propia. Se muestra como un Dialog/Modal desde `/productos/$id`.

### Server function
```ts
export const registrarLote = createServerFn()
  .validator(z.object({
    productId: z.number(),
    supplierId: z.number().optional(),
    cantidadKg: z.number().positive(),
    costoUnitario: z.number().positive(),
    fechaCompra: z.string(), // ISO date string
  }))
  .handler(async ({ data }) => {
    // Ejecutar en transacción (ver 03-business-rules.md sección 5)
  })
```

### UI del modal
- Select de proveedor (+ opción "Sin proveedor" + "Agregar nuevo")
- Input cantidad en kg
- Input costo por kg
- Date picker (default: hoy)
- Resumen: costo total del lote, stock nuevo, stock total resultante
- Botón "Confirmar ingreso"

---

## B-05 — Producto Nuevo (`/productos/nuevo`)

**Archivo:** `app/routes/productos/nuevo.tsx`

### Server functions
```ts
export const crearProducto = createServerFn()
  .validator(z.object({
    nombre: z.string().min(1),
    esMix: z.boolean(),
    tipoVenta: tipoVentaEnumValues,
    precioPorKg: z.string().optional(),
    precioUnidad: z.string().optional(),
    pesoUnidad: z.string().optional(),
    componentes: z.array(z.object({
      componenteId: z.number(),
      cantidad: z.string(), // debe sumar 1.0 si es mix
    })).optional(),
  }))
  .handler(async ({ data }) => {
    // Si es mix: insertar producto + mix_components
    // Si no: insertar solo producto
    // Redirect a /productos/$id del nuevo producto
  })
```

### UI
- Tabs: "Producto simple" / "Mix compuesto"
- Formulario simple: nombre, tipo, precios
- Formulario mix: nombre, precio, + sección de componentes dinámica
  - Cada componente: select de producto + input cantidad (kg por 1kg de mix)
  - Botón "+ Agregar componente"
  - Validación en tiempo real: suma de cantidades debe ser 1.0 kg
  - Mostrar "Faltan X gramos para completar 1 kg"

---

## B-06 — Pedidos Lista (`/pedidos`)

**Archivo:** `app/routes/pedidos/index.tsx`

### Datos necesarios
```ts
- Lista de pedidos del mes actual (default)
- Para cada pedido: id, customer.nombre, resumen de items, total_final, estado, createdAt
- Conteos por estado para los badges de filtro
```

### Server functions
```ts
export const getPedidos = createServerFn()
  .validator(z.object({
    estado: estadoPedidoEnumValues.optional(), // undefined = todos
    mes: z.string().optional(), // "2026-05" formato
  }))
  .handler(async ({ data }) => { ... })
```

### UI
- Filtros de estado (tabs/chips): Todos / Ingresados / Preparados / Entregados / Adeudan pago
- Tabla con columnas: #, Cliente, Productos (resumen), Total, Estado, Fecha, →
- Click en fila → `/pedidos/$id`
- Botón "+ Nuevo pedido" → `/pedidos/nuevo`

---

## B-07 y B-08 — Nuevo Pedido (`/pedidos/nuevo`)

**Archivo:** `app/routes/pedidos/nuevo.tsx`

Flujo de 2 pasos manejado con estado local (useState), no con rutas separadas.

### Paso 1: Agregar productos

**Datos necesarios al cargar la página:**
```ts
- Todos los productos activos con su stock disponible
  (para mixes: calcular stock dinámicamente)
```

**UI:**
- Buscador de productos a la izquierda
- "Carrito" del pedido a la derecha
- Cada producto en el buscador: nombre, stock, precio(s)
  - Si tipoVenta = "ambos": mostrar toggle kg/unidad al agregarlo
- Input de cantidad con botones +/-
- Productos con stock insuficiente: deshabilitados con mensaje
- Total actualizado en tiempo real

### Paso 2: Cliente y descuento

**UI:**
- Buscador de cliente (busca en tiempo real por nombre)
- Cliente seleccionado se muestra en un chip con X para quitar
- Botón "+ Crear cliente nuevo" (abre mini-modal inline)
- Input de descuento % (0-100)
- Resumen del pedido con descuento aplicado
- Botón "Confirmar pedido"

### Server function
```ts
export const crearPedido = createServerFn()
  .validator(z.object({
    customerId: z.number().optional(),
    descuentoPct: z.number().min(0).max(100),
    items: z.array(z.object({
      productId: z.number(),
      cantidad: z.number().positive(), // siempre en kg
      precioUnitario: z.number().positive(),
      vendidoComoUnidad: z.boolean(),
      subtotal: z.number(),
    }))
  }))
  .handler(async ({ data }) => {
    // Ejecutar en transacción:
    // 1. Calcular total_bruto y total_final
    // 2. Crear Sale
    // 3. Para cada item: crear SaleItem + consumirStockFIFO
    // Redirect a /pedidos/$id del pedido creado
  })
```

---

## B-09 — Pedido Detalle (`/pedidos/$id`)

**Archivo:** `app/routes/pedidos/$id.tsx`

### Datos necesarios
```ts
- Sale completo con customer
- SaleItems con product.nombre
- SaleLots de cada item (para mostrar trazabilidad)
```

### Server functions
```ts
export const getPedido = createServerFn()
  .validator(z.object({ id: z.number() }))
  .handler(async ({ data }) => { ... })

export const cambiarEstadoPedido = createServerFn()
  .validator(z.object({
    id: z.number(),
    estado: estadoPedidoEnumValues,
  }))
  .handler(async ({ data }) => {
    // Solo actualizar el estado y updatedAt
    // No hace falta lógica de stock (ya se descontó al crear)
  })
```

### UI
- Header: # pedido, badge estado, cliente, total
- Tabla de items con subtotales
- Resumen: bruto, descuento, total final
- Pipeline de estados (visual): 4 opciones clickeables
  - ENTREGADO tiene un ícono verde especial (registra ganancia)
  - ADEUDA_PAGO tiene borde rojo
- Sección de trazabilidad FIFO (colapsada por defecto, expandible)

---

## B-10 y B-11 — Gastos (`/gastos`)

**Archivo:** `app/routes/gastos/index.tsx`

### Datos necesarios
```ts
- Lista de gastos del mes (default)
- Totales por categoría para las stat cards del header
```

### Server functions
```ts
export const getGastos = createServerFn()
  .validator(z.object({ mes: z.string().optional() }))
  .handler(async ({ data }) => { ... })

export const crearGasto = createServerFn()
  .validator(z.object({
    descripcion: z.string().min(1),
    categoria: categoriaGastoEnumValues,
    monto: z.number().positive(),
    fecha: z.string(),
  }))
  .handler(async ({ data }) => { ... })

export const eliminarGasto = createServerFn()
  .validator(z.object({ id: z.number() }))
  .handler(async ({ data }) => { ... })
```

### UI
- 4 stat cards con totales por categoría (Packaging, Logística, Impresiones, Otros)
- Botón "+ Registrar gasto" → abre Dialog/Modal
- Tabla de gastos con columnas: Descripción, Categoría (badge), Monto, Fecha, 🗑
- El modal de nuevo gasto es simple: descripción, categoría, monto, fecha

---

## B-12 — Clientes (`/clientes`)

**Archivo:** `app/routes/clientes/index.tsx`

### Datos necesarios
```ts
- Lista de clientes activos
- Para cada cliente: id, nombre, telefono, conteo de pedidos, total comprado
- Flag si tiene pedidos ADEUDA_PAGO pendientes
```

### Server functions
```ts
export const getClientes = createServerFn()
  .validator(z.object({ busqueda: z.string().optional() }))
  .handler(async ({ data }) => { ... })

export const crearCliente = createServerFn()
  .validator(z.object({
    nombre: z.string().min(1),
    telefono: z.string().optional(),
  }))
  .handler(async ({ data }) => { ... })
```

### UI
- Buscador por nombre/teléfono
- Tabla: Nombre, Teléfono, Pedidos, Total comprado, Estado (badge rojo si adeuda)
- Modal de nuevo cliente: nombre + teléfono (solo esos campos)

---

## B-13 — Balance (`/balance`)

**Archivo:** `app/routes/balance/index.tsx`

### Datos necesarios
```ts
// Todo en una sola llamada
{
  stats: {
    totalFacturado: number
    costoMercaderia: number
    gastosOperativos: number
    gananciaNeta: number
    margenPct: number
  }
  historialMensual: Array<{ mes: string, facturado: number }>  // últimos 6 meses
  productosMasVendidos: Array<{ producto: string, kgVendidos: number, facturado: number }>
  productosMenosVendidos: Array<{ producto: string, kgVendidos: number }>
  detalleProductos: Array<{
    nombre: string,
    kgVendidos: number,
    facturado: number,
    costoFIFO: number,
    ganancia: number,
    margenPct: number
  }>
}
```

### Server functions
```ts
export const getBalance = createServerFn()
  .validator(z.object({
    periodo: z.enum(["mes", "anio"]),
    mes: z.string().optional(), // "2026-05" — si no se pasa, usa el mes actual
  }))
  .handler(async ({ data }) => {
    // Query compleja que cruza: sales, sale_items, sale_lots, operational_expenses
    // Filtrar: solo sales con estado IN ('ENTREGADO', 'ADEUDA_PAGO')
  })
```

### UI
- Selector de período: "Este mes" / "Último año" (tabs)
- Date picker de mes (select con los últimos 12 meses)
- 3 stat cards: Facturado, Costo mercadería, Gastos operativos
- Card de ganancia neta (en color naranja, grande, prominente)
- Gráfico de barras: facturación últimos 6 meses (implementar con CSS puro, sin librería)
- Ranking más/menos vendidos con barras de progreso CSS
- Tabla detalle por producto con todas las métricas

---

## C-01 — Merma (Modal desde `/productos/$id`)

No tiene ruta propia. Dialog desde el detalle del producto.

### Server function
```ts
export const registrarMerma = createServerFn()
  .validator(z.object({
    productId: z.number(),
    cantidadKg: z.number().positive(),
    motivo: z.string().min(1),
    descripcion: z.string().optional(),
    fecha: z.string(),
  }))
  .handler(async ({ data }) => {
    // Verificar stock suficiente
    // Descontar FIFO de lotes (sin crear SaleLot)
    // Actualizar product.stockDisponible
    // Insertar en shrinkage
    // Todo en transacción
  })
```

---

## Middleware de autenticación

**Archivo:** `app/server/middleware/auth.ts`

```ts
// Se aplica en app.config.ts como middleware global
// Excepciones: /login y assets estáticos

export const authMiddleware = createMiddleware().server(async ({ next, request }) => {
  const cookie = getCookie(request, "renux_session")
  const isValid = verifyCookie(cookie, process.env.SESSION_SECRET)

  if (!isValid && !request.url.includes("/login")) {
    return redirect("/login")
  }

  return next()
})
```

---

## Convenciones generales de código

### Manejo de errores en server functions
```ts
// Siempre usar try/catch y tirar errores descriptivos
// TanStack Start los convierte en respuestas 4xx/5xx automáticamente
// En el cliente, capturar con try/catch y mostrar toast de error
```

### Formato de números en la UI
```ts
// Moneda argentina
const formatPesos = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(n)
// → "$10.500,00"

// Kilogramos
const formatKg = (n: number) => `${n.toFixed(3).replace(/\.?0+$/, "")} kg`
// → "1.5 kg", "0.25 kg", "3 kg"
```

### Estados de carga
- Usar `useTransition` o el estado de loading de TanStack para deshabilitar botones durante submit
- Mostrar skeleton en el primer load de cada página (no spinner centrado)
- Toasts para confirmaciones y errores (shadcn/ui `useToast`)
