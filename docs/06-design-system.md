# 06 — Sistema de Diseño y UX/UI

Guía de diseño completa para RENUX.
Leer este archivo antes de tocar cualquier componente de interfaz.

---

## Identidad visual

RENUX es un sistema de gestión **familiar e interno**. El diseño debe transmitir:
- **Calidez** — es de una familia, no de una corporación
- **Claridad** — quien lo usa no es desarrollador, necesita entender todo de un vistazo
- **Confianza** — los datos (stock, plata, pedidos) son reales e importantes
- **Velocidad** — quien lo usa está en movimiento, preparando pedidos

**No** es un SaaS de empresa. **No** es un dashboard frío y corporativo.
Evitar: diseños all-white genéricos, azules corporativos, iconos stock, tipografías sin personalidad.

---

## Paleta de colores

```css
:root {
  /* ─── Marca ─────────────────────────── */
  --color-primary:       #F57A28;   /* naranja RENUX — acción, énfasis, marca */
  --color-primary-deep:  #D4601A;   /* naranja oscuro — hover de botones */
  --color-primary-glow:  rgba(245, 122, 40, 0.10);  /* fondo sutil de items activos */
  --color-primary-light: rgba(245, 122, 40, 0.06);  /* hover muy sutil */

  /* ─── Fondos ────────────────────────── */
  --color-bg:            #FFF5F0;   /* fondo general — crema cálido */
  --color-surface:       #FFFFFF;   /* cards, modales, sidebar */
  --color-surface-warm:  #FFF0E8;   /* fondo alternativo — hover de rows */
  --color-surface-deep:  #FFE8D8;   /* skeleton, placeholders */

  /* ─── Bordes ────────────────────────── */
  --color-border:        rgba(245, 122, 40, 0.10);  /* borde sutil */
  --color-border-mid:    rgba(245, 122, 40, 0.20);  /* borde visible */
  --color-border-strong: rgba(245, 122, 40, 0.35);  /* borde de foco/activo */

  /* ─── Texto ─────────────────────────── */
  --color-text-1: #1A1008;          /* texto principal — casi negro cálido */
  --color-text-2: rgba(26,16,8, 0.60);  /* texto secundario */
  --color-text-3: rgba(26,16,8, 0.38);  /* texto terciario, labels, placeholders */
  --color-text-4: rgba(26,16,8, 0.12);  /* divisores muy sutiles */

  /* ─── Semánticos ────────────────────── */
  --color-success:       #16A34A;
  --color-success-bg:    rgba(22, 163, 74, 0.08);
  --color-success-border:rgba(22, 163, 74, 0.20);

  --color-warning:       #D97706;
  --color-warning-bg:    rgba(217, 119, 6, 0.08);
  --color-warning-border:rgba(217, 119, 6, 0.20);

  --color-danger:        #DC2626;
  --color-danger-bg:     rgba(220, 38, 38, 0.08);
  --color-danger-border: rgba(220, 38, 38, 0.20);

  --color-info:          #2563EB;
  --color-info-bg:       rgba(37, 99, 235, 0.08);
  --color-info-border:   rgba(37, 99, 235, 0.20);
}
```

### Reglas de uso de color

**Naranja (`--color-primary`):**
- Botones de acción principal (CTA)
- Nav item activo (borde izquierdo + fondo sutil)
- Valores monetarios y números de énfasis
- Links de acción ("Ver →", "Agregar →")
- Barra de progreso de stock normal

**Fondo crema (`--color-bg: #FFF5F0`):**
- Fondo de toda la app. NUNCA usar `#FFFFFF` como fondo general.
- Las cards y el sidebar son `#FFFFFF` sobre el fondo crema — genera jerarquía visual sin sombras agresivas.

**Rojo solo para cosas urgentes:**
- Stock bajo (< 15% del histórico, o < 500g)
- Pedidos que adeudan pago
- Errores de formulario
- Barra de stock cuando está crítica

**Verde solo para confirmaciones:**
- Pedido entregado
- Stock en buen nivel
- Toasts de éxito

---

## Tipografía

```css
/* Instalar via Google Fonts en el layout raíz (__root.tsx head) */
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Nunito:ital,wght@0,200..1000;1,200..1000&family=Zain:wght@200;300;400;700;800;900&display=swap" />

:root {
  --font-display: 'Zain', sans-serif;      /* títulos, números grandes, logo */
  --font-mono:    'Nunito', sans-serif;    /* datos, labels, UI general */
}
```

### Jerarquía tipográfica

```
Page title (h1):     Zain 24px / weight 800 / color text-1
Section title (h2):  Zain 18px / weight 700 / color text-1
Card title:          Zain 15px / weight 700 / color text-1
Stat number grande:  Zain 32-40px / weight 800 / color primary o text-1
Stat number chico:   Zain 20px / weight 700

Body / UI general:   Nunito 12-13px / weight 400 / color text-2
Labels de campo:     Nunito 10px / weight 400 / UPPERCASE / letter-spacing 0.1em / color text-3
Datos de tabla:      Nunito 12px / color text-2
Texto de badges:     Nunito 10px / weight 400

Botones:             Nunito 12px / weight 700
```

### Aplicación en Tailwind

Configurar en `@theme` dentro de `src/styles.css`:

```ts
@theme {
  --font-display: 'Zain', sans-serif;
  --font-mono: 'Nunito', sans-serif;
}
```

Usar como:
```tsx
<h1 className="font-display text-2xl font-black tracking-tight">Dashboard</h1>
<p className="font-mono text-xs text-gray-400 uppercase tracking-widest">Stock disponible</p>
<span className="font-display text-4xl font-extrabold text-[#F57A28]">$284.500</span>
```

---

## Personalización de shadcn/ui

Editar `components.json` y el archivo de variables CSS de shadcn para que use la paleta de RENUX.

En `app/globals.css` (o donde estén las variables CSS de shadcn):

```css
@layer base {
  :root {
    --background: 30 100% 97%;       /* #FFF5F0 en HSL */
    --foreground: 25 60% 8%;         /* #1A1008 */
    --card: 0 0% 100%;               /* #FFFFFF */
    --card-foreground: 25 60% 8%;
    --primary: 26 90% 55%;           /* #F57A28 */
    --primary-foreground: 0 0% 100%;
    --secondary: 26 100% 95%;        /* #FFF0E8 */
    --secondary-foreground: 25 60% 8%;
    --muted: 26 50% 93%;
    --muted-foreground: 25 20% 45%;
    --accent: 26 100% 95%;
    --accent-foreground: 26 90% 45%;
    --destructive: 0 84% 60%;
    --border: 26 60% 90%;
    --input: 26 60% 90%;
    --ring: 26 90% 55%;              /* foco = naranja */
    --radius: 0.5rem;
  }
}
```

### Overrides de componentes shadcn

Algunos ajustes para que los componentes se sientan RENUX:

**Button:**
```tsx
// El variant "default" debe ser naranja
// Agregar en globals.css o en el componente:
// bg-[#F57A28] hover:bg-[#D4601A] font-mono font-bold text-white
```

**Input:**
```tsx
// border-orange-100 focus:border-[#F57A28] focus:ring-[#F57A28]/20
// font-mono text-sm bg-white
```

**Badge — variantes personalizadas para estados de pedido:**
```tsx
// En app/components/ui/badge.tsx agregar variantes:
const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-mono border",
  {
    variants: {
      variant: {
        // shadcn defaults...
        ingresado:   "bg-amber-50 text-amber-700 border-amber-200",
        preparado:   "bg-blue-50 text-blue-700 border-blue-200",
        entregado:   "bg-green-50 text-green-700 border-green-200",
        adeudapago:  "bg-red-50 text-red-600 border-red-200",
        activo:      "bg-green-50 text-green-700 border-green-200",
        inactivo:    "bg-gray-100 text-gray-500 border-gray-200",
        stockbajo:   "bg-red-50 text-red-600 border-red-200",
        mix:         "bg-blue-50 text-blue-700 border-blue-200",
        kg:          "bg-orange-50 text-orange-600 border-orange-200",
        unidad:      "bg-purple-50 text-purple-700 border-purple-200",
      },
    },
  }
)
```

---

## Componentes propios

### Card

No usar el Card de shadcn directamente. Crear un wrapper con el estilo de RENUX:

```tsx
// app/components/app/Card.tsx
import { cn } from "@/lib/utils";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "orange" | "danger" | "success";
}

export function Card({ children, className, variant = "default" }: CardProps) {
  return (
    <div className={cn(
      "rounded-xl border bg-white p-5",
      variant === "default" && "border-orange-100",
      variant === "orange" && "bg-[#F57A28] border-[#D4601A] text-white",
      variant === "danger" && "bg-red-50 border-red-200",
      variant === "success" && "bg-green-50 border-green-200",
      className
    )}>
      {children}
    </div>
  );
}
```

### StatCard

```tsx
// app/components/app/StatCard.tsx
interface StatCardProps {
  label: string;
  value: string;
  delta?: string;       // "↑ 12% vs mes anterior"
  deltaType?: "up" | "down" | "neutral";
  icon?: string;
}

export function StatCard({ label, value, delta, deltaType, icon }: StatCardProps) {
  return (
    <div className="rounded-xl border border-orange-100 bg-white p-5">
      <div className="font-mono text-[11px] text-gray-400 mb-2 uppercase tracking-wider">
        {icon && <span className="mr-1">{icon}</span>}
        {label}
      </div>
      <div className="font-display text-[28px] font-bold leading-none text-gray-900 mb-1">
        {value}
      </div>
      {delta && (
        <div className={cn(
          "font-mono text-[10px] mt-1.5",
          deltaType === "up" && "text-green-600",
          deltaType === "down" && "text-red-500",
          deltaType === "neutral" && "text-gray-400",
        )}>
          {delta}
        </div>
      )}
    </div>
  );
}
```

### PageHeader

```tsx
// app/components/app/PageHeader.tsx
interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h1 className="font-display text-[22px] font-black text-gray-900 tracking-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="font-mono text-[11px] text-gray-400 mt-0.5">{subtitle}</p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
```

### StockBar

```tsx
// app/components/app/StockBar.tsx
interface StockBarProps {
  value: number;   // kg disponibles
  max?: number;    // kg máximo histórico (para calcular %)
  showLabel?: boolean;
}

export function StockBar({ value, max = 5, showLabel = true }: StockBarProps) {
  const pct = Math.min(100, (value / max) * 100);
  const isCritical = pct < 15 || value < 0.5;

  return (
    <div>
      {showLabel && (
        <div className="flex justify-between items-baseline mb-1">
          <span className={cn(
            "font-display text-base font-bold",
            isCritical ? "text-red-500" : "text-gray-900"
          )}>
            {formatKg(value)}
          </span>
        </div>
      )}
      <div className="h-1.5 bg-orange-100 rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            isCritical ? "bg-red-400" : "bg-[#F57A28]"
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
```

### OrderStatusPipeline

```tsx
// app/components/app/OrderStatusPipeline.tsx
// Pipeline visual de estados del pedido — usado en B-09
const ESTADOS = [
  { key: "INGRESADO",   label: "Ingresado",   color: "amber",  note: "pedido recibido" },
  { key: "PREPARADO",   label: "Preparado",   color: "blue",   note: "listo para entregar" },
  { key: "ENTREGADO",   label: "Entregado",   color: "green",  note: "registra ganancia" },
  { key: "ADEUDA_PAGO", label: "Adeuda pago", color: "red",    note: "entregado sin cobrar" },
] as const;
```

---

## Patrones de layout

### Estructura de una página

```tsx
// Patrón estándar de TODAS las páginas internas
function MiPagina() {
  return (
    <div className="p-7 max-w-6xl">

      {/* 1. Header */}
      <PageHeader
        title="Productos"
        subtitle="18 activos · 2 inactivos"
        action={<Button>+ Nuevo producto</Button>}
      />

      {/* 2. Filtros / Búsqueda (si aplica) */}
      <div className="flex gap-3 mb-5">
        {/* ... */}
      </div>

      {/* 3. Contenido principal */}
      <div className="grid grid-cols-3 gap-4">
        {/* ... */}
      </div>

    </div>
  );
}
```

### Grid system

```
Desktop (> 1024px):  max-w-6xl, padding 28px
Tablet (768-1024px): max-w-full, padding 20px
Mobile (< 768px):    sidebar colapsado, padding 16px

Grids:
  Stats:     grid-cols-3 gap-4
  Productos: grid-cols-3 gap-4  (2 en tablet, 1 en mobile)
  Detalle:   grid-cols-2 gap-6 (1 en mobile)
  Formularios: max-w-xl (nunca full width)
```

### Sidebar

```
Width: 220px fija en desktop
En mobile (< 768px): oculta por defecto, botón hamburguesa para abrir
Fondo: #FFFFFF
Borde derecho: 1px solid #FFE8D8

Nav item normal:  text-gray-500, hover bg-orange-50
Nav item activo:  text-[#F57A28], bg-orange-50, border-r-2 border-[#F57A28]
```

---

## Patrones UX

### Jerarquía de acciones

Cada pantalla tiene **una sola acción primaria**. Todo lo demás es secundario o destructivo.

```
Primario (naranja sólido):   "+ Nuevo pedido", "Confirmar", "Guardar"
Secundario (borde sutil):    "Cancelar", "Volver", "Ver detalle"
Destructivo (rojo suave):    "Desactivar producto", "Eliminar gasto"
Ghost (gris muy sutil):      acciones inline de tabla, íconos de borrar
```

### Formularios

**Reglas:**
- Labels siempre arriba del campo, NUNCA placeholder como label
- Placeholder solo para ejemplos: `placeholder="ej: Almendras, Nueces..."`
- Campos obligatorios marcados con `*` en el label
- Errores inline debajo del campo, en rojo, con ícono `❌`
- Nunca deshabilitar el botón de submit — mostrar errores al intentar

```tsx
// Patrón de campo con error
<div className="space-y-1.5">
  <label className="font-mono text-[10px] uppercase tracking-widest text-gray-400">
    Nombre del producto *
  </label>
  <Input
    className={cn(error && "border-red-400 focus-visible:ring-red-400/30")}
    placeholder="ej: Almendras, Mix Premium..."
  />
  {error && (
    <p className="font-mono text-[11px] text-red-500">❌ {error}</p>
  )}
</div>
```

**Ancho de formularios:** Nunca full-width. Máximo `max-w-xl` (448px). Los formularios muy anchos son difíciles de leer.

### Tablas

```tsx
// Estructura estándar de tabla
<div className="rounded-xl border border-orange-100 overflow-hidden bg-white">
  <table className="w-full">
    <thead>
      <tr className="border-b border-orange-100">
        <th className="font-mono text-[10px] uppercase tracking-widest text-gray-400 text-left px-4 py-3">
          Columna
        </th>
      </tr>
    </thead>
    <tbody>
      <tr className="border-b border-orange-50 hover:bg-[#FFF5F0] transition-colors cursor-pointer">
        <td className="font-mono text-[12px] text-gray-600 px-4 py-3">
          Dato
        </td>
      </tr>
    </tbody>
  </table>
</div>
```

**Reglas de tablas:**
- Hover en filas cuando son clickeables
- Números: siempre alineados a la derecha (`text-right`)
- Fechas: formato corto "25 may" para el presente año, "25 may 2025" para años anteriores
- Si una fila tiene acción → cursor pointer, hover fondo crema

### Modales / Dialogs

Usar el `Dialog` de shadcn. Reglas:
- Ancho máximo `max-w-md` (448px) para forms simples
- Ancho `max-w-lg` (512px) para forms con más campos
- Nunca `max-w-full` — los modales deben flotar, no llenar la pantalla
- Siempre incluir botón "Cancelar" junto al de confirmar
- Acción destructiva: botón rojo a la izquierda, "Cancelar" a la derecha

```tsx
<DialogHeader>
  <DialogTitle className="font-display text-lg font-bold">
    Registrar ingreso de stock
  </DialogTitle>
  <DialogDescription className="font-mono text-[11px] text-gray-400">
    Se creará un nuevo lote para Almendras
  </DialogDescription>
</DialogHeader>
```

### Estados vacíos (Empty states)

Siempre mostrar un empty state útil, nunca dejar la pantalla en blanco.

```tsx
// Patrón de empty state
function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="text-4xl mb-4">{icon}</div>
      <h3 className="font-display text-base font-bold text-gray-600 mb-2">{title}</h3>
      <p className="font-mono text-[12px] text-gray-400 max-w-xs leading-relaxed mb-5">
        {description}
      </p>
      {action}
    </div>
  );
}

// Uso:
<EmptyState
  icon="🛒"
  title="Sin pedidos este mes."
  description="Cuando registres el primero, aparecerá acá."
  action={<Button size="sm">+ Nuevo pedido</Button>}
/>
```

### Skeletons

Usar siempre skeleton en lugar de spinner. El skeleton debe imitar la estructura real de la pantalla.

```tsx
// Skeleton de stat card
function StatCardSkeleton() {
  return (
    <div className="rounded-xl border border-orange-100 bg-white p-5">
      <div className="h-3 w-24 bg-orange-50 rounded animate-pulse mb-3" />
      <div className="h-8 w-32 bg-orange-50 rounded animate-pulse mb-2" />
      <div className="h-2.5 w-20 bg-orange-50 rounded animate-pulse" />
    </div>
  );
}

// Skeleton de fila de tabla
function TableRowSkeleton() {
  return (
    <tr className="border-b border-orange-50">
      <td className="px-4 py-3"><div className="h-3 w-12 bg-orange-50 rounded animate-pulse" /></td>
      <td className="px-4 py-3"><div className="h-3 w-28 bg-orange-50 rounded animate-pulse" /></td>
      <td className="px-4 py-3"><div className="h-3 w-20 bg-orange-50 rounded animate-pulse" /></td>
      <td className="px-4 py-3"><div className="h-3 w-16 bg-orange-50 rounded animate-pulse" /></td>
    </tr>
  );
}
```

Color de skeleton: siempre `bg-orange-50 animate-pulse` — nunca `bg-gray-200` (rompe el tema cálido).

### Toasts

```tsx
// Éxito
toast({
  title: "✓ Pedido creado",
  description: "El stock fue descontado automáticamente.",
});

// Error
toast({
  title: "No hay stock suficiente",
  description: "Quedan 0.3 kg de Nueces. El pedido necesita 0.5 kg.",
  variant: "destructive",
});

// Warning (stock bajo)
toast({
  title: "⚠️ Stock bajo",
  description: "Quedan menos de 500g de Nueces.",
});
```

Reglas de toasts:
- Duración: 4 segundos para éxito, 6 segundos para error
- Ubicación: esquina inferior derecha
- Máximo 3 toasts visibles al mismo tiempo
- No usar toasts para confirmar acciones destructivas — usar Dialog de confirmación

---

## Micro-interacciones

### Transiciones base

```css
/* Aplicar a todos los elementos interactivos */
transition-colors duration-150   /* botones, links, rows */
transition-all duration-200       /* cards con hover */
transition-opacity duration-200   /* fades */
```

### Hover de cards de producto

```tsx
<div className="
  rounded-xl border border-orange-100 bg-white p-4
  cursor-pointer
  transition-all duration-200
  hover:border-[#F57A28] hover:shadow-[0_2px_16px_rgba(245,122,40,0.12)]
">
```

### Botón primary — estados

```tsx
// Normal
"bg-[#F57A28] text-white font-mono font-bold"

// Hover
"hover:bg-[#D4601A]"

// Activo (click)
"active:scale-[0.98] transition-transform"

// Cargando
"opacity-60 cursor-not-allowed"
// + spinner inline:
<span className="inline-block w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />

// Éxito (breve, luego vuelve a normal)
"bg-green-500 text-white"
```

### Foco accesible

```css
/* Reemplazar el outline default por uno naranja */
focus-visible:outline-none
focus-visible:ring-2
focus-visible:ring-[#F57A28]
focus-visible:ring-offset-2
focus-visible:ring-offset-[#FFF5F0]
```

---

## Accesibilidad mínima

- **Contraste:** Verificar que texto sobre fondos cumpla WCAG AA (4.5:1 para texto normal)
  - `#F57A28` sobre `#FFFFFF`: ✅ 3.2:1 — solo para texto grande (18px+)
  - `#F57A28` sobre `#FFF5F0`: ✅ — solo usar para decoración, no texto pequeño
  - Texto principal (`#1A1008`) sobre `#FFFFFF`: ✅ 19:1
  - Texto secundario (`rgba(26,16,8,0.60)`) sobre `#FFFFFF`: ✅ 7:1
- **Labels en formularios:** Siempre asociados con `htmlFor` / `id`
- **Botones de ícono:** Siempre con `aria-label`
- **Tablas:** Siempre con `<thead>` y `scope="col"` en los `<th>`
- **Dialogs:** El foco debe ir al primer campo al abrir, y volver al trigger al cerrar (shadcn lo maneja automáticamente)

---

## Responsive

La app es principalmente para **desktop y tablet** (uso en casa/local mientras se preparan pedidos). El mobile es secundario pero debe funcionar.

```
Breakpoints Tailwind:
  sm:  640px  — tablet chica
  md:  768px  — tablet
  lg:  1024px — desktop
  xl:  1280px — desktop grande

Sidebar:
  lg+:  visible siempre (w-[220px] flex-shrink-0)
  < lg: oculto, con botón hamburguesa en header

Grids:
  Stat cards:    grid-cols-1 sm:grid-cols-2 lg:grid-cols-3
  Productos:     grid-cols-1 sm:grid-cols-2 lg:grid-cols-3
  Detalle 2col:  grid-cols-1 lg:grid-cols-2

Padding de página:
  < lg:  p-4
  lg+:   p-7
```

---

## Lo que NO hacer

| ❌ Evitar | ✅ En cambio |
|---|---|
| Fondo blanco puro `#FFFFFF` como fondo general | Usar `#FFF5F0` (crema) |
| Texto gris genérico `text-gray-500` para labels | `font-mono text-[10px] uppercase tracking-widest text-gray-400` |
| Fuentes Inter, Roboto, Arial | Zain + Nunito |
| Sombras `shadow-lg` en cards | Borde sutil `border-orange-100` |
| Spinner giratorio centrado en el loading | Skeleton que imita la estructura |
| Gradientes de color arbitrarios | Color sólido naranja o superficies blancas |
| Modales que ocupan toda la pantalla | `max-w-md` o `max-w-lg` flotando |
| Errores en toast | Errores inline debajo del campo |
| Labels como placeholder (desaparecen al escribir) | Label siempre visible arriba |
| `font-sans` o sin especificar fuente | Siempre `font-display` o `font-mono` explícitamente |
| Bordes `border-gray-200` genéricos | `border-orange-100` o `border-orange-50` |
