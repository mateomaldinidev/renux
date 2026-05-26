# RENUX — Especificación Técnica Completa

Sistema de gestión interna de inventario y ventas para **RENUX**, emprendimiento familiar de venta de frutos secos y mixes personalizados.

---

## 📁 Estructura de esta especificación

| Archivo | Contenido |
|---|---|
| `00-README.md` | Este archivo. Visión general y guía de lectura |
| `01-architecture.md` | Stack, estructura de carpetas, decisiones técnicas |
| `02-schema.ts` | Schema completo de Drizzle ORM (PostgreSQL) |
| `03-business-rules.md` | Reglas de negocio críticas: FIFO, precios, mixes |
| `04-routes-and-screens.md` | Todas las rutas, server functions y qué hace cada pantalla |

**Leer en orden**: `00` → `01` → `02` → `03` → `04`

---

## 🎯 Qué es RENUX

Una **SPA interna** (single-user, sin registro público) que permite:

- Gestionar productos simples y mixes compuestos
- Registrar ingresos de stock mediante lotes de compra (con costo real)
- Crear y gestionar pedidos con descuentos porcentuales
- Descontar stock automáticamente usando lógica FIFO al vender
- Registrar gastos operativos (packaging, logística, etc.)
- Ver métricas y balance mensual/anual con ganancia neta real

---

## 🔐 Acceso

**Un solo usuario**. Sin tabla de usuarios. Sin JWT. Sin OAuth.

- Acceso por PIN numérico guardado en variable de entorno `ACCESS_PIN`
- Al ingresar el PIN correcto, se crea una cookie httpOnly con TTL de 24 horas
- Un middleware verifica la cookie en todas las rutas protegidas
- Si la cookie expiró → redirect a `/login`

---

## 🧠 Decisión de diseño más importante

Los **lotes de compra** son el núcleo del sistema.
Cada vez que entra mercadería, se crea un `Lot` con su costo real.
Cuando se vende, se consume stock de los lotes más antiguos primero (FIFO).
Esto permite calcular ganancias reales incluso con inflación argentina.
