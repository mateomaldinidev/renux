# RENUX — Guía paso a paso: de cero a producción

---

## Antes de arrancar: herramientas que necesitás tener instaladas

```bash
# Verificar que tenés Node.js activo con fnm
node -v        # debe mostrar v20.x o superior
pnpm -v        # debe mostrar 8.x o 9.x
git --version  # cualquier versión reciente
```

Si algo no está instalado, instalarlo antes de continuar.

---

# FASE 1 — Setup del proyecto (Día 1)

## Paso 1 — Crear el proyecto TanStack Start

```bash
pnpm dlx @tanstack/cli@latest create
```

El CLI te va a preguntar:
- **Project name:** `renux`
- **Framework:** `TanStack Start`
- **Language:** `TypeScript`
- **Tailwind CSS:** `Sí`
- **ESLint:** `Sí` (o Biome si lo preferís, da lo mismo)
- **shadcn add-on:** `No` (lo instalamos por separado después)

```bash
cd renux
pnpm install
pnpm dev   # verificar que levanta en http://localhost:3000
```

Si ves algo en el browser → ✅ proyecto andando. Cerrar con Ctrl+C.

---

## Paso 2 — Instalar dependencias

```bash
# ORM y base de datos
pnpm add drizzle-orm postgres
pnpm add -D drizzle-kit

# Cookies y seguridad
pnpm add cookie iron-session

# Validación
pnpm add zod

# Utilidades
pnpm add date-fns
```

---

## Paso 3 — Instalar shadcn/ui

```bash
pnpm dlx shadcn@latest init
```

Opciones que elegir:
- **Style:** `Default`
- **Base color:** `Neutral` (o el que prefieras, después podés personalizar)
- **CSS variables:** `Sí`

Luego instalar los componentes que vas a usar:

```bash
pnpm dlx shadcn@latest add button input select card badge table dialog toast progress tabs label separator
```

---

## Paso 4 — Crear la estructura de carpetas

Crear todas las carpetas que no existan todavía:

```bash
mkdir -p app/server/db
mkdir -p app/server/functions
mkdir -p app/server/middleware
mkdir -p app/components/app
mkdir -p app/routes/productos
mkdir -p app/routes/pedidos
mkdir -p app/routes/gastos
mkdir -p app/routes/clientes
mkdir -p app/routes/balance
```

---

## Paso 5 — Crear el archivo .env

Crear el archivo `.env` en la raíz del proyecto:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/renux
ACCESS_PIN=123456
SESSION_SECRET=cambia-esto-por-un-string-largo-random-de-al-menos-32-caracteres
```

**Importante:** Agregar `.env` al `.gitignore` si no está ya.

```bash
echo ".env" >> .gitignore
```

Para generar un SESSION_SECRET seguro:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Paso 6 — Base de datos local para desarrollo

Opciones (elegir una):

**Opción A — PostgreSQL local con Docker** (recomendado si tenés Docker):
```bash
docker run -d \
  --name renux-db \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=renux \
  -p 5432:5432 \
  postgres:16
```

---

## Paso 7 — Configurar Drizzle

Crear `drizzle.config.ts` en la raíz:

```ts
import type { Config } from "drizzle-kit";

export default {
  schema: "./app/server/db/schema.ts",
  out: "./drizzle/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
} satisfies Config;
```

Agregar scripts en `package.json`:

```json
{
  "scripts": {
    "dev": "vinxi dev",
    "build": "vinxi build",
    "start": "vinxi start",
    "db:push": "drizzle-kit push",
    "db:migrate": "drizzle-kit migrate",
    "db:studio": "drizzle-kit studio",
    "db:generate": "drizzle-kit generate"
  }
}
```

---

## Paso 8 — Copiar el schema

Copiar el contenido del archivo `02-schema.ts` de la spec a `app/server/db/schema.ts`.

Luego crear la conexión a la DB en `app/server/db/index.ts`:

```ts
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const client = postgres(process.env.DATABASE_URL!);
export const db = drizzle(client, { schema });
```

---

## Paso 9 — Crear las tablas en la DB

```bash
pnpm db:push
```

Este comando lee el schema y crea todas las tablas en la DB local.
Si sale sin errores → ✅ tablas creadas.

Para verificar visualmente:
```bash
pnpm db:studio
```
Abre un browser en `https://local.drizzle.studio` donde podés ver las tablas.

---

# FASE 2 — Autenticación (Día 1-2)

## Paso 10 — Server function de auth

Crear `app/server/functions/auth.ts`:

```ts
import { createServerFn } from "@tanstack/start";
import { z } from "zod";
import { getCookie, setCookie, deleteCookie } from "vinxi/http";
import { sealData, unsealData } from "iron-session";

const SESSION_OPTIONS = {
  password: process.env.SESSION_SECRET!,
  ttl: 60 * 60 * 24, // 24 horas en segundos
};

export const login = createServerFn({ method: "POST" })
  .validator(z.object({ pin: z.string() }))
  .handler(async ({ data }) => {
    if (data.pin !== process.env.ACCESS_PIN) {
      throw new Error("PIN incorrecto");
    }
    const sealed = await sealData({ autenticado: true }, SESSION_OPTIONS);
    setCookie("renux_session", sealed, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24,
      path: "/",
    });
    return { ok: true };
  });

export const logout = createServerFn({ method: "POST" }).handler(async () => {
  deleteCookie("renux_session");
  return { ok: true };
});

export const checkSession = createServerFn({ method: "GET" }).handler(
  async () => {
    const cookie = getCookie("renux_session");
    if (!cookie) return { autenticado: false };
    try {
      const data = await unsealData<{ autenticado: boolean }>(
        cookie,
        SESSION_OPTIONS
      );
      return { autenticado: data.autenticado === true };
    } catch {
      return { autenticado: false };
    }
  }
);
```

---

## Paso 11 — Protección de rutas con beforeLoad

NO crear un middleware global. TanStack Start no soporta middleware al estilo Express.
En su lugar, usar `beforeLoad` en `__root.tsx` para proteger todas las rutas de una vez.

Editar `app/routes/__root.tsx`:

```tsx
import { createRootRoute, Outlet, useRouter, HeadContent, Scripts } from "@tanstack/react-router";
import { requireAuth } from "../server/functions/auth";

export const Route = createRootRoute({
  beforeLoad: async ({ location }) => {
    // /login es pública, el resto requiere auth
    if (location.pathname === "/login") return;
    await requireAuth();
  },
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
    ],
  }),
  component: RootLayout,
});
```

`requireAuth` es una server function que verifica la cookie de sesión.
Si no hay sesión válida, lanza `redirect({ to: "/login" })` automáticamente.

**Ventajas de este enfoque:**
- Un solo punto de control (no hay que agregar auth en cada ruta)
- Funciona con la API real de TanStack Start
- El redirect ocurre antes de que la ruta renderice

---

## Paso 12 — Pantalla de login

Crear `app/routes/login.tsx`:

```tsx
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { login } from "../server/functions/auth";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleDigit = (d: string) => {
    if (pin.length < 6) setPin((p) => p + d);
  };

  const handleDelete = () => setPin((p) => p.slice(0, -1));

  const handleSubmit = async () => {
    if (pin.length === 0) return;
    setLoading(true);
    setError("");
    try {
      await login({ data: { pin } });
      router.navigate({ to: "/" });
    } catch {
      setError("PIN incorrecto");
      setPin("");
    } finally {
      setLoading(false);
    }
  };

  // Capturar teclado físico
  // (agregar useEffect con keydown listener)

  return (
    <div className="min-h-screen bg-[#FFF5F0] flex items-center justify-center">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-black text-[#F57A28] tracking-tight">RENUX</h1>
          <p className="text-sm text-gray-400 mt-1">Sistema de gestión interno</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-orange-100">
          <p className="text-center font-semibold text-gray-700 mb-6">Ingresá tu PIN</p>

          {/* Dots */}
          <div className="flex justify-center gap-3 mb-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className={`w-4 h-4 rounded-full transition-all ${
                  i < pin.length
                    ? error ? "bg-red-500" : "bg-[#F57A28]"
                    : "border-2 border-gray-200"
                }`}
              />
            ))}
          </div>

          {error && (
            <p className="text-red-500 text-sm text-center mb-4">{error}</p>
          )}

          {/* Teclado */}
          <div className="grid grid-cols-3 gap-2 max-w-[200px] mx-auto mb-6">
            {["1","2","3","4","5","6","7","8","9"].map((d) => (
              <button
                key={d}
                onClick={() => handleDigit(d)}
                className="bg-[#FFF5F0] rounded-lg py-4 text-xl font-bold text-gray-800 hover:bg-orange-100 transition-colors"
              >
                {d}
              </button>
            ))}
            <div />
            <button
              onClick={() => handleDigit("0")}
              className="bg-[#FFF5F0] rounded-lg py-4 text-xl font-bold text-gray-800 hover:bg-orange-100 transition-colors"
            >
              0
            </button>
            <button
              onClick={handleDelete}
              className="bg-red-50 rounded-lg py-4 text-lg text-red-400 hover:bg-red-100 transition-colors"
            >
              ⌫
            </button>
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading || pin.length === 0}
            className="w-full bg-[#F57A28] text-white font-bold py-3 rounded-lg hover:bg-[#D4601A] transition-colors disabled:opacity-50"
          >
            {loading ? "Verificando..." : "Ingresar →"}
          </button>
        </div>
      </div>
    </div>
  );
}
```

Probar: `pnpm dev` → ir a `http://localhost:3000/login` → verificar que renderiza.

---

# FASE 3 — Layout y sidebar (Día 2)

## Paso 13 — Root layout con sidebar

Editar `app/routes/__root.tsx` para incluir el sidebar y la navegación:

```tsx
import { createRootRoute, Outlet, useRouter } from "@tanstack/react-router";
import { AppSidebar } from "../components/app/AppSidebar";

export const Route = createRootRoute({
  component: RootLayout,
});

function RootLayout() {
  const router = useRouter();
  const isLogin = router.state.location.pathname === "/login";

  if (isLogin) {
    return <Outlet />;
  }

  return (
    <div className="flex min-h-screen bg-[#FFF5F0]">
      <AppSidebar />
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
```

## Paso 14 — Componente AppSidebar

Crear `app/components/app/AppSidebar.tsx`:

```tsx
import { Link, useRouter } from "@tanstack/react-router";
import { logout } from "../../server/functions/auth";

const navItems = [
  { to: "/", label: "Home", icon: "🏠" },
  { to: "/productos", label: "Productos", icon: "📦" },
  { to: "/pedidos", label: "Pedidos", icon: "🛒" },
  { to: "/gastos", label: "Gastos", icon: "💸" },
  { to: "/clientes", label: "Clientes", icon: "👤" },
  { to: "/balance", label: "Balance", icon: "📊" },
];

export function AppSidebar() {
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.navigate({ to: "/login" });
  };

  return (
    <aside className="w-[220px] bg-white border-r border-orange-100 flex flex-col flex-shrink-0 min-h-screen">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-orange-50">
        <span className="text-2xl font-black text-[#F57A28] tracking-tight">RENUX</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-2">
        {navItems.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="flex items-center gap-3 px-5 py-2.5 text-sm text-gray-500 hover:bg-orange-50 hover:text-gray-800 transition-colors"
            activeProps={{ className: "text-[#F57A28] bg-orange-50 border-r-2 border-[#F57A28] font-medium" }}
            activeOptions={{ exact: item.to === "/" }}
          >
            <span className="text-base w-5 text-center">{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="flex items-center gap-3 px-5 py-4 text-sm text-gray-400 hover:text-red-400 border-t border-orange-50 transition-colors"
      >
        <span>🚪</span>
        Cerrar sesión
      </button>
    </aside>
  );
}
```

Probar: `pnpm dev` → el sidebar debería aparecer en todas las rutas excepto `/login`.

---

# FASE 4 — Productos (Día 2-3)

Seguir este patrón para CADA módulo. Se explica en detalle para Productos; los demás siguen la misma estructura.

## Paso 15 — Server functions de productos

Crear `app/server/functions/productos.ts`:

```ts
import { createServerFn } from "@tanstack/start";
import { z } from "zod";
import { db } from "../db";
import { products, lots, mixComponents, shrinkage } from "../db/schema";
import { eq, desc, and, gt, sql, asc } from "drizzle-orm";

// GET: lista de productos
export const getProductos = createServerFn({ method: "GET" })
  .validator(z.object({
    busqueda: z.string().optional(),
    verInactivos: z.boolean().optional(),
  }))
  .handler(async ({ data }) => {
    // Query con filtros opcionales
    // Retorna products con stockDisponible calculado para mixes
  });

// GET: un producto con todos sus datos
export const getProducto = createServerFn({ method: "GET" })
  .validator(z.object({ id: z.number() }))
  .handler(async ({ data }) => {
    // Retorna product + lots + mixComponents + stats del mes
  });

// POST: crear producto
export const crearProducto = createServerFn({ method: "POST" })
  .validator(z.object({
    nombre: z.string().min(1),
    esMix: z.boolean(),
    tipoVenta: z.enum(["por_kg", "por_unidad", "ambos"]),
    precioPorKg: z.string().optional(),
    precioUnidad: z.string().optional(),
    pesoUnidad: z.string().optional(),
    componentes: z.array(z.object({
      componenteId: z.number(),
      cantidad: z.string(),
    })).optional(),
  }))
  .handler(async ({ data }) => {
    return await db.transaction(async (tx) => {
      const [producto] = await tx.insert(products).values({
        nombre: data.nombre,
        esMix: data.esMix,
        tipoVenta: data.tipoVenta,
        precioPorKg: data.precioPorKg,
        precioUnidad: data.precioUnidad,
        pesoUnidad: data.pesoUnidad,
      }).returning();

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

// PATCH: actualizar producto
export const updateProducto = createServerFn({ method: "POST" })
  .validator(z.object({
    id: z.number(),
    nombre: z.string().optional(),
    precioPorKg: z.string().optional(),
    precioUnidad: z.string().optional(),
    pesoUnidad: z.string().optional(),
    tipoVenta: z.enum(["por_kg", "por_unidad", "ambos"]).optional(),
    activo: z.boolean().optional(),
  }))
  .handler(async ({ data }) => {
    const { id, ...fields } = data;
    return await db
      .update(products)
      .set({ ...fields, updatedAt: new Date() })
      .where(eq(products.id, id))
      .returning();
  });

// POST: registrar lote de compra
export const registrarLote = createServerFn({ method: "POST" })
  .validator(z.object({
    productId: z.number(),
    supplierId: z.number().optional(),
    cantidadKg: z.number().positive(),
    costoUnitario: z.number().positive(),
    fechaCompra: z.string(),
  }))
  .handler(async ({ data }) => {
    return await db.transaction(async (tx) => {
      // 1. Insertar lote
      const [lote] = await tx.insert(lots).values({
        productId: data.productId,
        supplierId: data.supplierId,
        cantidadInicial: data.cantidadKg.toString(),
        cantidadRestante: data.cantidadKg.toString(),
        costoUnitario: data.costoUnitario.toString(),
        fechaCompra: new Date(data.fechaCompra),
      }).returning();

      // 2. Actualizar stock del producto
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
```

## Paso 16 — Página de lista de productos

Crear `app/routes/productos/index.tsx` con:
- Llamada a `getProductos` en el loader de la ruta
- Grid de cards usando los datos
- Buscador con estado local + debounce
- Link a `/productos/$id` en cada card
- Link a `/productos/nuevo`

```tsx
import { createFileRoute, Link } from "@tanstack/react-router";
import { getProductos } from "../../server/functions/productos";
// ... componentes shadcn

export const Route = createFileRoute("/productos/")({
  loader: () => getProductos({ data: {} }),
  component: ProductosPage,
});

function ProductosPage() {
  const productos = Route.useLoaderData();
  // ... render
}
```

## Paso 17 — Página de detalle de producto

Crear `app/routes/productos/$id.tsx`:
- Loader que llama a `getProducto({ id: Number(params.id) })`
- Form editable con los campos del producto
- Tabla de lotes
- Dialog de "Agregar stock" (B-04)
- Link "Registrar merma"

## Paso 18 — Página de nuevo producto

Crear `app/routes/productos/nuevo.tsx`:
- Tabs "Producto simple" / "Mix compuesto"
- Form dinámico según el tab
- Para mix: lista de componentes con selector + cantidad
- Validación que la suma de componentes = 1.0 kg
- Submit llama a `crearProducto`

---

# FASE 5 — Pedidos (Día 3-4)

## Paso 19 — Server functions de pedidos

Crear `app/server/functions/pedidos.ts`:

La función más importante es `crearPedido`. Implementar el algoritmo FIFO del archivo `03-business-rules.md` — Sección 2.

```ts
// Función FIFO interna (no es server function, es helper)
async function consumirStockFIFO(tx, productId, cantidadKg, saleItemId) {
  // Ver 03-business-rules.md sección 2 para el algoritmo completo
}

export const crearPedido = createServerFn({ method: "POST" })
  .validator(...)
  .handler(async ({ data }) => {
    return await db.transaction(async (tx) => {
      // 1. Crear Sale
      // 2. Para cada item: crear SaleItem + consumirStockFIFO
      // Ver 03-business-rules.md para los detalles
    });
  });

export const getPedidos = createServerFn({ method: "GET" })
  .validator(z.object({
    estado: z.enum(["INGRESADO","PREPARADO","ENTREGADO","ADEUDA_PAGO"]).optional(),
    mes: z.string().optional(),
  }))
  .handler(async ({ data }) => { ... });

export const getPedido = createServerFn({ method: "GET" })
  .validator(z.object({ id: z.number() }))
  .handler(async ({ data }) => { ... });

export const cambiarEstado = createServerFn({ method: "POST" })
  .validator(z.object({
    id: z.number(),
    estado: z.enum(["INGRESADO","PREPARADO","ENTREGADO","ADEUDA_PAGO"]),
  }))
  .handler(async ({ data }) => {
    return await db
      .update(sales)
      .set({ estado: data.estado, updatedAt: new Date() })
      .where(eq(sales.id, data.id))
      .returning();
  });
```

## Paso 20 — Páginas de pedidos

Crear los 3 archivos:
- `app/routes/pedidos/index.tsx` — Lista con filtros por estado
- `app/routes/pedidos/nuevo.tsx` — Formulario 2 pasos con estado local
- `app/routes/pedidos/$id.tsx` — Detalle + pipeline de estados

El formulario de nuevo pedido es el más complejo del sistema. Manejarlo con `useState` para el carrito local, y solo llamar al servidor al confirmar.

---

# FASE 6 — Gastos, Clientes y Balance (Día 4-5)

## Paso 21 — Gastos

Crear `app/server/functions/gastos.ts` con `getGastos`, `crearGasto`, `eliminarGasto`.
Crear `app/routes/gastos/index.tsx` con la lista + modal de nuevo gasto.

## Paso 22 — Clientes

Crear `app/server/functions/clientes.ts` con `getClientes`, `crearCliente`.
Crear `app/routes/clientes/index.tsx` con la lista + modal de nuevo cliente.

## Paso 23 — Balance

Crear `app/server/functions/balance.ts`:

```ts
export const getBalance = createServerFn({ method: "GET" })
  .validator(z.object({
    periodo: z.enum(["mes", "anio"]),
    mes: z.string().optional(), // "2026-05"
  }))
  .handler(async ({ data }) => {
    // Query que cruza sales + sale_items + sale_lots + operational_expenses
    // SOLO estado IN ('ENTREGADO', 'ADEUDA_PAGO')
    // Retorna: stats, historialMensual, detalleProductos, mas/menos vendidos
  });
```

Crear `app/routes/balance/index.tsx` con todos los gráficos (barras con CSS puro).

## Paso 24 — Home / Dashboard

Crear `app/routes/index.tsx`:
```ts
export const Route = createFileRoute("/")({
  loader: async () => {
    // Cargar datos del dashboard
    const [stats, pendientes, adeudan] = await Promise.all([
      getStatsDelMes(),
      getPedidosPendientes(),
      getPedidosAdeudan(),
    ]);
    return { stats, pendientes, adeudan };
  },
  component: HomePage,
});
```

---

# FASE 7 — Pulido y detalles (Día 5)

## Paso 25 — Toast notifications

Configurar el sistema de toasts de shadcn.

En `app/routes/__root.tsx`, agregar el `<Toaster />`:
```tsx
import { Toaster } from "../components/ui/toaster";

// Dentro del layout:
<>
  <Outlet />
  <Toaster />
</>
```

Usar en los forms:
```ts
const { toast } = useToast();

// Al guardar exitosamente:
toast({ title: "✓ Producto guardado" });

// Al fallar:
toast({ title: "Error al guardar", variant: "destructive" });
```

## Paso 26 — Formato de números argentinos

Crear `app/utils/format.ts`:

```ts
export const formatPesos = (n: number | string) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
  }).format(Number(n));

export const formatKg = (n: number | string) => {
  const num = Number(n);
  if (num === Math.floor(num)) return `${num} kg`;
  return `${num.toFixed(3).replace(/\.?0+$/, "")} kg`;
};
```

## Paso 27 — Skeletons de carga

Para cada página, crear un componente de skeleton que se muestra mientras carga el loader.
TanStack Start permite definir `pendingComponent` en la ruta:

```tsx
export const Route = createFileRoute("/productos/")({
  loader: () => getProductos({ data: {} }),
  pendingComponent: ProductosSkeleton,
  component: ProductosPage,
});

function ProductosSkeleton() {
  return (
    <div className="p-8">
      <div className="grid grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-32 bg-orange-50 rounded-xl animate-pulse" />
        ))}
      </div>
    </div>
  );
}
```

## Paso 28 — Variables de color en Tailwind

En `app.css` o el archivo de estilos global, agregar las variables de color de RENUX:

```css
:root {
  --renux-primary: #F57A28;
  --renux-primary-deep: #D4601A;
  --renux-bg: #FFF5F0;
  --renux-surface: #FFFFFF;
}
```

---

# FASE 8 — Deploy en Railway (Día 5-6)

## Paso 29 — Preparar el proyecto para producción

Verificar que el build funciona:

```bash
pnpm build
```

Si hay errores de TypeScript, corregirlos antes de continuar.

## Paso 30 — Crear cuenta y proyecto en Railway

1. Ir a https://railway.com → crear cuenta (gratis con GitHub)
2. Dashboard → **New Project**
3. **Deploy from GitHub repo** → conectar el repo de RENUX
4. Railway detecta automáticamente que es un proyecto Node.js

## Paso 31 — Agregar PostgreSQL en Railway

En el mismo proyecto de Railway:
1. Click en **+ New** → **Database** → **Add PostgreSQL**
2. Railway crea la DB y genera automáticamente la variable `DATABASE_URL`
3. Esa variable se inyecta automáticamente en el servicio de la app

## Paso 32 — Configurar variables de entorno en Railway

En el servicio de la app (no en la DB):
1. Click en el servicio → **Variables**
2. Agregar:
   - `ACCESS_PIN` = el PIN que quieras usar (ej: 159357)
   - `SESSION_SECRET` = el string random que generaste en el paso 5
   - `NODE_ENV` = `production`

> `DATABASE_URL` ya está inyectada automáticamente — no hace falta agregarla.

## Paso 33 — Configurar el start command

En el servicio → **Settings** → **Build & Deploy**:

- **Build command:** `pnpm build`
- **Start command:** `pnpm start`

## Paso 34 — Subir el código a GitHub

```bash
git init
git add .
git commit -m "feat: renux inicial"
git branch -M main
git remote add origin https://github.com/tu-usuario/renux.git
git push -u origin main
```

Railway hace el deploy automáticamente al detectar el push.

## Paso 35 — Correr las migraciones en producción

Una vez que la app está deployada:

Opción A — Desde Railway CLI:
```bash
npm install -g @railway/cli
railway login
railway link    # seleccionar el proyecto
railway run pnpm db:push
```

Opción B — Agregar un script de migración automática en el build.

## Paso 36 — Verificar el deploy

1. Railway → el servicio → click en la URL generada (algo como `renux-production.up.railway.app`)
2. Debería aparecer la pantalla de PIN
3. Ingresar el PIN configurado → acceder al dashboard

---

# FASE 9 — Uso en producción (Post-deploy)

## Paso 37 — Acceder desde múltiples dispositivos

La URL de Railway funciona en cualquier dispositivo con internet:
- Desktop → abrir en browser
- Tablet → abrir en browser (funciona bien, el layout tiene sidebar)
- Celular → funciona pero el layout de sidebar no está optimizado para mobile (mejora futura)

## Paso 38 — Cargar datos iniciales

Orden recomendado para cargar datos al sistema por primera vez:
1. **Proveedores** (si los usás) — desde la sección de proveedores o inline al agregar el primer lote
2. **Productos simples** — Almendras, Nueces, Castañas, etc.
3. **Lotes de compra** — para cada producto, agregar el stock actual con el costo aproximado
4. **Mixes** — una vez que los productos base tienen stock
5. **Clientes** — los frecuentes
6. **Primer pedido** — para verificar que el flujo completo funciona

---

# Resumen de tiempos estimados

| Fase | Contenido | Tiempo |
|---|---|---|
| Fase 1 | Setup, dependencias, DB, schema | 1 día |
| Fase 2 | Auth: PIN + cookie + middleware | ½ día |
| Fase 3 | Layout + sidebar | ½ día |
| Fase 4 | Módulo Productos completo | 1-2 días |
| Fase 5 | Módulo Pedidos + lógica FIFO | 1-2 días |
| Fase 6 | Gastos + Clientes + Balance + Home | 1 día |
| Fase 7 | Pulido: toasts, skeletons, formatos | ½ día |
| Fase 8 | Deploy en Railway | ½ día |
| **Total** | | **~7-8 días de trabajo real** |

---

# Consejos para trabajar con OpenCode

1. **Darlé siempre el contexto de los archivos de spec** antes de pedir que implemente algo.
2. **Trabajar de a un archivo por vez.** No pedir "implementá todos los pedidos". Sí pedir "implementá la server function `crearPedido` del archivo `pedidos.ts`, siguiendo las reglas de negocio del archivo `03-business-rules.md`".
3. **El archivo `03-business-rules.md` es el más crítico.** Dárselo siempre que pidas implementar lógica de stock o precios.
4. **Verificar cada paso en el browser** antes de avanzar al siguiente. Un error en el schema o en la conexión a DB arruina todo lo que viene después.
5. **Usar `pnpm db:studio`** para verificar que los datos se guardan bien en la DB mientras desarrollás.
