# 01 — Arquitectura

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Runtime | Node.js (via `fnm`) |
| Package manager | `pnpm` |
| Framework full-stack | TanStack Start (RC) + TypeScript |
| Routing | File-based routing de TanStack Start |
| Estilos | Tailwind CSS v4 + shadcn/ui |
| ORM | Drizzle ORM |
| Base de datos | PostgreSQL (Railway plan gratuito) |
| Editor AI | OpenCode Go |

---

## Estructura de carpetas

```
renux/
├── app/
│   ├── routes/
│   │   ├── __root.tsx              # Layout raíz: sidebar, proveedor de sesión
│   │   ├── login.tsx               # Pantalla de PIN (A-01)
│   │   ├── index.tsx               # Home / Dashboard (B-01)
│   │   ├── productos/
│   │   │   ├── index.tsx           # Lista de productos (B-02)
│   │   │   ├── nuevo.tsx           # Crear producto (B-05)
│   │   │   └── $id.tsx             # Detalle / editar producto (B-03, B-04)
│   │   ├── pedidos/
│   │   │   ├── index.tsx           # Lista de pedidos (B-06)
│   │   │   ├── nuevo.tsx           # Crear pedido pasos 1 y 2 (B-07, B-08)
│   │   │   └── $id.tsx             # Detalle de pedido (B-09)
│   │   ├── gastos/
│   │   │   └── index.tsx           # Lista + crear gasto (B-10, B-11)
│   │   ├── clientes/
│   │   │   └── index.tsx           # Lista + crear cliente (B-12)
│   │   └── balance/
│   │       └── index.tsx           # Métricas y estadísticas (B-13)
│   │
│   ├── server/
│   │   ├── db/
│   │   │   ├── schema.ts           # Schema Drizzle (ver 02-schema.ts)
│   │   │   └── index.ts            # Conexión a Postgres (drizzle + pg)
│   │   ├── functions/              # Server functions de TanStack Start
│   │   │   ├── auth.ts             # Verificar PIN, crear/destruir cookie
│   │   │   ├── productos.ts        # CRUD productos + agregar lote
│   │   │   ├── pedidos.ts          # Crear pedido, cambiar estado (lógica FIFO acá)
│   │   │   ├── gastos.ts           # CRUD gastos operativos
│   │   │   ├── clientes.ts         # CRUD clientes
│   │   │   └── balance.ts          # Queries de métricas y estadísticas
│   │   └── middleware/
│   │       └── auth.ts             # Verificar cookie en rutas protegidas
│   │
│   └── components/
│       ├── ui/                     # Componentes shadcn (auto-generados con CLI)
│       └── app/                    # Componentes propios reutilizables
│           ├── AppSidebar.tsx
│           ├── PageHeader.tsx
│           ├── StatCard.tsx
│           ├── ProductCard.tsx
│           ├── OrderRow.tsx
│           ├── StockBar.tsx        # Barra de progreso de stock con color rojo si < 15%
│           └── PedidoPipeline.tsx  # Pipeline visual de estados del pedido
│
├── drizzle/
│   └── migrations/                 # Migraciones generadas por `drizzle-kit`
│
├── .env                            # Variables de entorno (ver abajo)
├── drizzle.config.ts               # Configuración de drizzle-kit
└── app.config.ts                   # Configuración de TanStack Start
```

---

## Variables de entorno (.env)

```env
DATABASE_URL=postgresql://user:pass@host:5432/renux
ACCESS_PIN=1234
SESSION_SECRET=un-string-largo-random-para-firmar-la-cookie
```

---

## Decisiones técnicas clave

### Server functions (no API REST separada)
TanStack Start permite definir funciones que corren en el servidor y se llaman desde el cliente como si fueran funciones normales. Toda la lógica de negocio vive en `app/server/functions/`. No hay un backend separado.

```ts
// Ejemplo de cómo se usa en una página
const productos = await getProductos()   // corre en el servidor
```

### Drizzle ORM
Se usa Drizzle en lugar de Prisma por:
- Más liviano y más rápido en arranque
- Las queries se escriben en TypeScript puro (similar a SQL)
- Migración con `drizzle-kit push` para desarrollo rápido

### Cookie de sesión
- Al validar el PIN, se setea una cookie httpOnly firmada con `SESSION_SECRET`
- TTL: 24 horas
- El middleware de auth lee la cookie. Si es inválida o expiró → 302 a `/login`
- No hay logout "real": se borra la cookie y se redirige a `/login`

### shadcn/ui
Se instala con el CLI oficial (`pnpm dlx shadcn@latest init`).
Componentes a instalar: `button`, `input`, `select`, `card`, `badge`, `table`, `dialog`, `toast`, `progress`, `tabs`.

---

## Despliegue recomendado (gratuito)

| Servicio | Plan gratuito |
|---|---|
| **Railway** | $5 crédito/mes — suficiente para un proyecto pequeño. App Node.js + PostgreSQL en el mismo proyecto. |

**Recomendación: Railway.** Más sencillo de configurar, no tiene spin-down, y el crédito gratuito alcanza para uso interno liviano.

Pasos de deploy en Railway:
1. `railway init` en la carpeta del proyecto
2. Agregar servicio PostgreSQL desde el dashboard
3. La variable `DATABASE_URL` se inyecta automáticamente
4. Agregar `ACCESS_PIN` y `SESSION_SECRET` en variables de entorno
5. `railway up`
