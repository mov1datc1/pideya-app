# PideYa 1.2.1 — onboarding, continuidad de cuenta y publicación

## Referencias investigadas y decisiones

| Referencia | Aplicación en PideYa |
|---|---|
| [Uber Eats: ingresar destino antes de comercios cercanos](https://help.uber.com/en/ubereats/stores/article/accessibility-how-to-use-voiceover?nodeId=df749409-0954-4118-ab9e-f8df76ce05fb) | Configuración inicial de ubicación con CTA principal, alternativa sin GPS y verificación del guardado antes del catálogo. |
| [Uber Eats: direcciones guardadas en la cuenta](https://help.uber.com/en-AU/ubereats/restaurants/article/updating-saved-places?nodeId=1ee5e186-5516-4b56-a187-7ad34e0de70e) | Casa, Trabajo y Otro, sincronizados con la cuenta en Supabase. |
| [Uber Eats: estados y seguimiento](https://help.uber.com/ubereats/restaurants/article/check-the-status-of-my-order?nodeId=01d2f4cc-3176-40d6-bf9e-1588e3e83408) | Mantener confirmación, preparación y viaje diferenciados; no presentar porcentajes o ETA de demostración. |
| [Uber Eats: seguimiento de compras](https://help.uber.com/am/ubereats/stores/article/check-the-status-of-my-order?nodeId=14ad371a-cc67-408c-8d62-34bf738dc8c6) | Etapas de surtido separadas del flujo de restaurantes. |
| [Uber: compartir entrega](https://www.uber.com/us/en/newsroom/share-this-delivery/) | Próxima etapa: enlace de seguimiento con acceso limitado. No está implementado en esta entrega. |
| [Experiencias de usuarios sobre dirección que cambia al pagar](https://www.reddit.com/r/UberEATS/comments/1reuip1/help_cant_get_food_delivered_to_my_correct/) | Señal cualitativa, no evidencia de prevalencia: mantener visible la dirección seleccionada y no reemplazar una dirección escrita con respuestas atrasadas de geocoding. |

Se adaptan los patrones funcionales, manteniendo la identidad Agave Teal de PideYa. Para Los Altos: GPS opcional, pin de entrada y calle/número, efectivo visible, categorías solo con cobertura conocida y mensajes explícitos cuando no hay servicio. Autocompletado Places, referencia rural ampliada, chat y despacho avanzado quedan como siguientes mejoras, no se anuncian como disponibles.

## Flujo implementado

1. Antes del login se conserva el onboarding existente.
2. Después del login, sin dirección válida, inicio presenta “Tu primer pedido empieza aquí”. El mapa no pide GPS hasta que el usuario lo solicita.
3. Si se rechaza el permiso o falla el GPS, se ofrece búsqueda o pin manual. El punto inicial de ejemplo no puede confirmarse como si fuera una ubicación elegida.
4. El usuario confirma punto y calle/número, elige Casa/Trabajo/Otro y guarda. Solo una respuesta exitosa del servidor permite continuar.
5. Si sale del mapa o cancela antes de guardar, se explica lo que falta con una acción concreta. Inicio conserva el paso pendiente; no hay temporizadores de popups repetitivos.
6. Catálogo, destacados y categorías comparten el filtro de cobertura. Sin coordenadas/radio válido no se promete entrega.
7. La guía acompaña categoría, establecimiento, productos, carrito y checkout. Se puede ocultar después de configurar ubicación; nunca se obliga a comprar.
8. Solo la creación exitosa del pedido completa el recorrido. Una cuenta con historial no repite la guía del primer pedido al cambiar de teléfono.

## Sincronización

- `client_addresses` almacena direcciones por `auth.uid()`. RLS y RPCs con SECURITY INVOKER impiden lecturas/escrituras entre cuentas. La dirección principal se cambia en transacción con exclusión por usuario.
- Migración 030 aplicada. Prueba SQL con dos usuarios temporales: guardar, recuperar, cambiar principal, intentar leer/modificar otra cuenta. Resultado correcto; ROLLBACK sin usuarios de prueba persistentes.
- Migración 029 aplicada: Tiendas pasa a `picked`.
- El caché está separado por UUID de cuenta. Solo registros ya sincronizados sirven como lectura offline; un fallo de escritura remoto no se anuncia como guardado exitoso.
- Se importan direcciones locales antiguas cuyo `user_id` coincide con el UUID autenticado. Registros antiguos atribuidos solo a un nombre o a `local` se conservan en almacenamiento original, pero requieren reconfirmación para asociarlos a una cuenta. No es posible prometer su aparición en otro teléfono antes de migrarlos.
- Pedidos nuevos llevan `client_user_id`. Historial consulta UUID y, para registros antiguos sin UUID, teléfono de la cuenta; permite cargar más de 50. Los pedidos históricos sin identidad verificable no se reasignan automáticamente por nombre/correo.
- **Pendiente de seguridad del backend heredado:** `orders_select_by_id_public` permite SELECT público. Esta entrega no elimina esa política porque requiere coordinar el checkout/seguimiento web existente. La protección probada de direcciones no implica que todas las políticas históricas de pedidos estén ya endurecidas.

## Versión y build

- Package: `com.movidatci.pideya`.
- EAS project: `db0d6965-cc3c-4c5f-bb2e-ef3058b3fde7`.
- Último AAB terminado consultado: `3b828685-2f22-41b1-a1b7-31daa16fbd99`, versión 1.2.0, versionCode 23, production.
- Contador remoto EAS consultado: 29. Próxima producción: 1.2.1, versionCode 30 o mayor si otro build avanza el contador.
- `appVersionSource=remote` y `production.autoIncrement=true`; eliminado el 27 local ignorado por EAS. Perfil usa `expo-application` para informar la versión real instalada.
- [Expo: versiones remotas e incremento](https://docs.expo.dev/build-reference/app-versions/).
- [Android: versionCode y versionName](https://developer.android.com/studio/publish/versioning).
- No se modifica la firma/package ni se publica automáticamente en Google Play.

## Validación y pendientes del teléfono

Pruebas de regresión en `tests/client-regressions.test.cjs`: cobertura, progresión del recorrido, guardado, importación, cambio de cuenta, lectura desde otro almacenamiento local y rechazos de guardado; además de las pruebas de pedidos/mapas previas. TypeScript y exportación Android se vuelven a ejecutar antes de la entrega.

En Redmi 14 / Android 14 quedan por recorrer: negar GPS; retroceder con botón físico; abandonar antes de guardar; nombre personalizado con teclado; error de red al guardar; reinicio y recuperación; dos teléfonos con la misma cuenta; cambio de cuenta; dirección fuera de cobertura; fuente grande; primer pedido completo y rastreo. No se dispone de un teléfono conectado para certificar esas interacciones nativas.

Comprobaciones de release: expo-doctor pasó las dependencias y las verificaciones locales. La comprobación online del esquema falló dos veces por timeout de `exp.host`; se documenta como limitación de red, no como validación aprobada. La configuración se procesa y exporta correctamente.

El commit conserva fuera los cambios locales de `src/hooks/useAuth.ts` que incorporaban credenciales de revisión. El paquete de entrega se construye desde una copia del commit y usa el flujo de autenticación normal del repositorio. Confirmar el mecanismo de acceso del revisor antes de enviar a Play. Los cambios locales del driver y archivos de diagnóstico tampoco se incluyen.
