# PideYa cliente: revisión UX, QA y mapas — 4 de octubre de 2026

Actualización posterior: onboarding, direcciones en la nube y versión documentados en [ONBOARDING_Y_RELEASE_1.2.1.md](ONBOARDING_Y_RELEASE_1.2.1.md). Las migraciones 029 y 030 ya se aplicaron. La etiqueta v1.1.0/build 8 de las capturas era un texto fijo; EAS confirma 1.2.0/código 23 como último AAB terminado.

## Alcance y evidencia

Revisados el changelog del cliente, los ocho commits recientes, las reglas de `.agents/AGENTS.md`, las capturas, el código de cliente y las integraciones con el backend y GPS del driver. Existían numerosos cambios locales sin commit: se trabajó sobre ellos, sin restaurarlos ni publicar una versión. No se accedió a conversaciones privadas de Gemini; el historial consultado fue el disponible en el workspace y Git.

Dispositivo reportado: Redmi 14, Android 14; instalación desde Google Play confirmada por el usuario. `adb devices` no mostró teléfonos conectados. Las capturas identifican v1.1.0/build 8, mientras `package.json` local dice 1.2.1; falta comprobar la versión efectiva del binario instalado. Se reprodujo en la librería instalada una excepción JavaScript al abrir un segundo consumidor del mismo canal Realtime. Inicio también usa `useOrders`, por lo que Pedidos y Rastreo colisionaban con él. La corrección tiene prueba de regresión con el cliente Realtime real y red desconectada. Falta confirmar que esa es la causa en el APK de Play y certificarla en teléfono.

Consultas de solo lectura realizadas:

- Categorías públicas en Supabase: HTTP 200. Restaurantes=`prepared`; Carnicería, Frutería, Pescadería y Cremería=`picked`; Farmacia y **Tiendas**=`pharmacy`; Otros=`prepared`.
- Birriería La Abuela: `type=Restaurantes`. Por tanto, la captura con surtido no se explica por la categoría pública actual.
- Google Directions con la clave local y una ruta pública de muestra en Guadalajara: HTTP 200, `status=OK`, con ruta. Esto prueba Directions desde este entorno; no certifica facturación, restricciones de la clave, Maps SDK ni la firma del binario distribuido en Play.

## Cambios realizados

- Perfil: etiqueta de tarjetas debajo del título, con ancho limitado; texto “Eliminar cuenta”; preferencias guardadas en `client_profiles` por `user_id`, con error visible si no se guardan.
- Restaurantes: sin clasificación por palabras parciales; sin conservar la categoría del negocio anterior; exclusión explícita de sustituciones para Restaurantes. Se quitaron valores estáticos de calificación/tiempo del bloque de surtido.
- Se retiró el selector de sustituciones del menú que no persistía ninguna elección. La selección efectiva se hace en checkout.
- Farmacia: el pedido siempre envía `ask_me` tanto para producto faltante como para cantidad distinta. No hereda sustitución automática de supermercado. Esta garantía está en el cliente; la validación universal debe existir también en backend y KDS.
- Pedidos: PICKING y ADJUSTED siguen activos; estados coherentes; totales ausentes no rompen la tarjeta; errores de carga con reintento.
- Suscripciones: nombres distintos para cada montaje de Pedidos/Rastreo; limpieza al salir y aislamiento de respuestas tras cambiar de usuario. Notificaciones con manejo de rechazo.
- Rastreo: carga inicial completa, actualización periódica, conserva datos del establecimiento al recibir eventos parciales y cambia la suscripción si cambia el repartidor. Selecciona la ubicación válida más reciente correspondiente al pedido.
- Mapa: coordenadas validadas antes del puente nativo; conserva moto 3D, distingue establecimiento/destino/repartidor; animación nativa Android entre posiciones; cámara sin reencuadres continuos; botón de centrar; rutas Agave Teal.
- Sin línea recta presentada como ruta ni ETA inventada. Directions tiene timeout de 10 segundos. Reconsulta cada 30 segundos como máximo por montaje, sin dispararla por cada posición GPS. Aviso de última ubicación conocida si falta fecha o pasan 90 segundos.
- Rastreo: español, sin calificación/porcentaje fijo ni botón de chat que en realidad llamaba. Pickup no muestra recorrido de entrega. Timeline de restaurante sin etapas de surtido.
- Recuperación de errores de render en las pestañas Pedidos/Rastreo. **No captura ni soluciona un fallo nativo de Android.**
- Navegación de Listas registrada; navegación desde perfil sin parámetros; direcciones guardadas leen `address_text`; corregidos tokens de color inexistentes que impedían compilar.

## Evaluación de Google Maps y experiencia de entrega

| Componente | Evidencia actual | Próximo paso recomendado |
|---|---|---|
| Maps SDK Android | Configuración nativa presente; sin validación en teléfono | Ver mapa con build firmado y clave restringida al package/SHA-1 de Play App Signing |
| Directions API Legacy | Llamada real OK | Mantener mientras se migra; auditar errores/cuotas |
| Routes API | No integrada | Backend autenticado para Compute Routes con tráfico; cachear por pedido; devolver polyline, duración y fecha del cálculo |
| Ubicación del repartidor | Expo Location → RPC `driver_update_location` → Supabase Realtime | Prueba de recorrido real con pantalla bloqueada y ahorro de batería Xiaomi; medir frecuencia, precisión, retraso y reconexión |
| Búsqueda de dirección | Geocoding/reverse geocoding nativo, sin autocompletado Places | Places Autocomplete para direcciones sugeridas; confirmar siempre pin y referencia de acceso |
| ETA | Tiempo de viaje de Directions; sin preparación ni tráfico solicitado | Mostrar preparación por separado del viaje; calcular ETA con tráfico y actualizar sin saltos bruscos |
| Estado y movimiento | Polling + Realtime, marcadores diferenciados | Instrumentar tiempos de estado y GPS; no vender una posición antigua como movimiento en vivo |
| Operación de flota | Sin Fleet Engine | No hace falta añadirlo para arreglar estos fallos; evaluar cuando la operación requiera despacho y gestión de flota |

Para las llamadas web de rutas, usar un proxy autenticado que autorice el acceso al pedido y oculte la clave de servidor; separar las claves de SDK móvil. La consulta local exitosa no demuestra qué restricciones están configuradas. No se habilitaron APIs ni se modificaron claves o facturación.

Referencias oficiales consultadas:

- [Google: seguridad de claves y proxy para servicios web](https://developers.google.com/maps/api-security-best-practices).
- [Google Routes: preferencias de tráfico y latencia](https://developers.google.com/maps/documentation/routes/config_trade_offs).
- [Google: polylines con información de tráfico](https://developers.google.com/maps/documentation/routes/traffic_on_polylines).
- [Google Directions Legacy: configuración de clave](https://developers.google.com/maps/documentation/directions/get-api-key).

## Pendientes detectados — no declarar listo para producción

1. **P0: confirmar corrección de Pedidos/Rastreo en el APK.** Conectar Redmi, registrar versión/fuente del APK, capturar `adb logcat -b crash` al abrir ambas pestañas. Comparar el binario actual y uno con estos cambios. La excepción de canal duplicado sí fue reproducida localmente; la prueba no sustituye el registro del APK afectado.
2. **P1: contrato de surtido.** `confirmPickingSummary` envía READY, que no figura en `OrderStatus` del cliente. Revisar con backend/KDS la transición correcta y la aprobación de sustitutos antes de liberar farmacia/surtido.
3. **P1: categoría Tiendas.** Usuario indicó que representa supermercado. Cliente corregido a `picked`; migración `029_tiendas_picked_flow.sql` preparada para corregir la configuración compartida. **Migración aplicada al servidor** en la continuación de esta entrega.
4. **P1: reordenar.** Pedidos/listas reconstruyen carrito a partir de precios históricos. Deben consultar precio, disponibilidad y opciones actuales; confirmar antes de sustituir un carrito de otro comercio.
5. **P1: direcciones.** Migradas a tabla por usuario con RLS; pruebas de acceso cruzado correctas. Probar la experiencia completa en dos teléfonos.
6. **P1: múltiples pedidos.** Rastreo selecciona el primer activo; añadir selector explícito. Si termina el pedido seleccionado, mostrar confirmación final antes de cambiar a otro.
7. **P1: observabilidad.** Añadir captura de fallos JS/nativos y métricas de ruta/GPS para poder diagnosticar APK de producción. Los logs actuales no se envían a un servicio central.
8. **P2: perfil/branding.** “Cliente frecuente” sigue siendo una etiqueta fija. Revisar contraste, tamaños de texto grandes y tarjetas de estado en pantalla pequeña. No se realizó validación visual en dispositivo.
9. **P2: costes/rendimiento.** Cada pantalla mantiene su polling; compartir caché/suscripción por pedido y pausar al pasar a segundo plano. Direcciones de entrega y llamadas al conductor necesitan recorrido integral con datos reales.

## Validación ejecutada y prueba de aceptación pendiente

- `tsc --noEmit`: correcto.
- `node --test tests/client-regressions.test.cjs`: **10/10 pruebas correctas**, incluyendo reproducción de canal duplicado y corrección con tres consumidores simultáneos, coordenadas, categorías, farmacia, estados, importes, Directions y selección de GPS.
- `expo install --check`: dependencias alineadas según tabla local de Expo. El propio comando advierte que no pudo consultar el catálogo online.
- Exportación Metro/Hermes Android correcta. **Exportar JavaScript no equivale a construir un APK ni probar Android.**

En Redmi/Android 14: abrir las pestañas repetidamente; probar sin pedidos, con varios y con datos incompletos; modo avión/reconexión; cambiar usuario; navegar tienda→restaurante; farmacia con preferencia previa de sustitución; perfil a 320–360 dp y fuente 130–150%; mapa sin coordenadas, GPS antiguo, reasignación de driver, pickup, entrega y cancelación; seguir un recorrido con la app del driver en segundo plano. Comprobar que pin, moto, ruta y tarjeta no se solapan y que no hay datos simulados ni ETA de GPS antiguo.
