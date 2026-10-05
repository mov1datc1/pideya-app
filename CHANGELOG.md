# PideYa — App Cliente — Changelog

> Package: `com.movidatci.pideya` | Expo SDK 54 | RN 0.81.5

---

## v1.2.1 — Onboarding guiado y cuenta sincronizada (2026-10-04)
- Primera dirección obligatoria antes del catálogo: GPS opcional, búsqueda/pin manual, nombre Casa/Trabajo/Otro y guardado confirmado.
- Avisos al abandonar el mapa o cancelar el guardado; guía contextual por categoría, establecimiento, productos, carrito y checkout.
- Direcciones en Supabase por usuario con RLS, migración de registros locales con propietario verificable y caché de lectura offline.
- Pedidos nuevos asociados a la cuenta; historial anterior paginado y compatibilidad con pedidos antiguos por teléfono.
- Catálogo, categorías y destacados respetan radio de entrega; no se muestra cobertura inventada para negocios sin coordenadas.
- Menos consultas de pedidos en pestañas ocultas y segundo plano.
- Perfil muestra versión nativa real. VersionCode remoto EAS (29 al consultar); siguiente production con autoIncrement >= 30.
- Migraciones 029 (Tiendas) y 030 (direcciones) aplicadas y políticas de direcciones probadas con rollback.
- Referencias y QA: `docs/ONBOARDING_Y_RELEASE_1.2.1.md`.

## En desarrollo — 2026-10-04: cliente, categorías y rastreo
- Perfil adaptable, texto de eliminar cuenta simplificado y persistencia de sustituciones.
- Restaurantes sin surtido; farmacia consulta siempre al cliente; checkout usa el usuario autenticado para preferencias.
- Excepción de canales Realtime duplicados reproducida y corregida: Inicio, Pedidos y Rastreo tienen suscripciones independientes. Prueba con Supabase real sin red.
- Pedidos PICKING/ADJUSTED activos, errores con reintento y protección de render.
- Tiendas usa surtido de supermercado en cliente; migración 029 preparada, sin aplicar al servidor.
- Rastreo con carga inicial/polling, coordenadas válidas, GPS más reciente y aviso de ubicación antigua.
- Mapa con moto de marca, animación Android, centrar manualmente y rutas Agave; sin ETA de línea recta ni porcentajes/calificaciones de demostración.
- Registro de Listas en navegación, lectura correcta de direcciones y correcciones TypeScript.
- Pruebas de regresión: `node --test tests/client-regressions.test.cjs`.
- Directions verificada con una ruta pública: OK. No se publicó build. Corrección pendiente de validación en Redmi 14 / Google Play.
- Auditoría y pendientes: `docs/QA_CLIENTE_2026-10-04.md`.

## v1.1.0 (vCode 8) — Fase 2A: Multi-Categoría + Picking
- **Picking Preferences (Checkout)**: Sección condicional "Preferencias de Surtido" que aparece solo en categorías con `flow_type: picked|pharmacy`. Opciones: Sustituir / Quitar / Preguntarme para productos no disponibles y Aceptar disponible / Quitar / Preguntarme para menos cantidad. Checkbox "Recordar para próximos pedidos".
- **Tracking Picking en Tiempo Real (OrderStatusScreen)**: Timeline expandido con estados PICKING y ADJUSTED. Muestra "Están surtiendo tu pedido..." cuando status=PICKING. Resumen post-picking con cada item, indicadores visuales (✅ Exacto, ⚠️ Ajustado, ❌ No disponible, 🔄 Sustituido), total original vs ajustado, y botones Aceptar/Cancelar.
- **Items por Peso (RestaurantDetailScreen)**: Muestra precio por unidad ($XX/kg, $XX/lb) para items con `sell_by_weight: true`.
- **Listas Guardadas / Despensa (SavedListsScreen)**: Auto-guardado de pedidos con 3+ items. Favoritos, re-orden express (1-tap al carrito), eliminación. Navegable desde RestaurantDetail.
- **Services**: `services/picking.ts` (realtime subscription, confirmación), `services/savedLists.ts` (CRUD, auto-save, cleanup).
- **Types**: Nuevos tipos `FlowType`, `PickingPreferences`, `OrderPickingItem`, `SavedList` en `database.ts`.

## v1.0.5 (vCode 7) — Current Production
- **Play Store**: AAB build activo
- Registro con Email OTP + Google OAuth
- Home con categorías dinámicas (`app_categories`) e íconos por categoría
- Flujo completo: Home → RestaurantDetail → Cart → Checkout → OrderStatus → Tracking
- GPS: AddressPicker con mapa + pin + label (Casa/Trabajo/Otro) en AsyncStorage
- Tracking: OrderTrackingMap con posición del repartidor en tiempo real
- Push notifications (expo-notifications)
- Cancelación de pedido (Cash=solo PENDING, Card=30% fee)
- Rating post-entrega (1-5 estrellas comida + repartidor)
- Perfil con edición de datos y eliminación de cuenta
- Delivery + Pickup como opciones de entrega
- Bottom Tabs: Inicio, Pedidos, Rastreo, Perfil

### Pendientes / Tech Debt
- [ ] Direcciones guardadas en AsyncStorage → migrar a Supabase
- [ ] No hay builds iOS configurados
- [ ] Google Directions API no implementado (ruta dibujada)
- [ ] No hay sistema de inventario / disponibilidad por item
- [ ] No hay soporte para productos por peso (kg, gramos)
- [ ] No hay chat in-app con el negocio

## Configuración Google Play Console (24 de Agosto de 2026)
- **Acceso a la app (Detalles de Acceso)**: Configurada cuenta de prueba oficial para el revisor de Google:
  - Email: `reviewer@pide-ya.app`
  - Usuario confirmado en Supabase Auth (`email_confirmed: true`) + registro en `client_profiles`.
- **Seguridad de los Datos (Data Safety)**:
  - URL de eliminación de cuenta: `https://pide-ya.app/delete-account` (Página activa en Vercel con formulario e instrucciones).
  - Declaración de recopilación de datos: Ubicación (precisa/aproximada), Información personal (Nombre, Email, Teléfono, Dirección, ID usuario), Actividad (Historial de compras).
  - ID de publicidad: `No` | Funciones financieras: `Mi app no ofrece ninguna función financiera`.
- **Ficha de la Tienda**:
  - Nombre: `Pide Ya - Comida a domicilio`
  - Categoría: `Aplicación` -> `Comida y bebida`.

---

## Historial de Builds
| Fecha | Version | vCode | Notas |
|-------|---------|-------|-------|
| Jul 2026 | 1.0.5 | 7 | Versión estable actual en Play Store |
