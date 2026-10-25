# Android cliente 1.3.3 — versionCode 34

Fecha: 25 de octubre de 2026.

## Incluido

- PREPARING y READY permanecen en pedidos activos, con etiquetas y seguimiento; READY no significa entregado.
- Registro independiente de fallos de checkout para el portal de incidencias.
- Firebase Android y plugin de notificaciones incorporados al cliente.
- Conserva los ajustes anteriores del mapa y las instrucciones de entrega.

## Firebase y EAS

Proyecto Firebase exclusivo: `pideya-platform-2026` (460490141482).

| App | Package Android | Firebase app ID | Credencial EAS |
| --- | --- | --- | --- |
| Cliente | com.movidatci.pideya | 1:460490141482:android:24e3ebaf0b373b7b3bf853 | FCM V1 asignada |
| Negocios | com.movidatci.pideyarestaurant | 1:460490141482:android:54aab3a06c2aca2f3bf853 | FCM V1 asignada |
| Repartidor | com.pideya.repartidores | 1:460490141482:android:ff39913454f57a453bf853 | FCM V1 asignada |

Cuenta dedicada de envío con rol Firebase Cloud Messaging API Admin; se cargó en EAS y se eliminó la copia privada temporal local. Los archivos `google-services.json` son configuración pública del SDK. No contienen la clave privada de la cuenta de servicio. No se configuró envío automático a Google Play ni se cambiaron las firmas Android.

## Validaciones

- Expo Doctor: 18/18.
- TypeScript y 30 pruebas cliente aprobados.
- Prebuild Android aislado: Google Services plugin y archivo Firebase correctos. El módulo nativo de notificaciones declara POST_NOTIFICATIONS.
- FCM HTTP v1: autenticación y `validate_only` aprobados, sin notificaciones reales.
- EAS conserva el identificador Android y elevó el versionCode remoto 33 → 34.

Build: https://expo.dev/accounts/pideya1/projects/pide-ya/builds/d93b5da7-8e00-45a2-b0f1-87f61e3b86d3

## Prueba pendiente en Redmi

1. Subir el AAB a pruebas internas y actualizar desde Google Play; un AAB no se instala como APK directamente.
2. Abrir cliente, permitir notificaciones e iniciar sesión.
3. Verificar endpoint cliente activo en servidor antes de crear un pedido nuevo.
4. Aceptar y marcar listo desde negocio; comprobar avisos con cliente abierto y en segundo plano.
5. Activar turno y asignar repartidor; comprobar aviso en camino y entrega.

Los pedidos de ayer generaron eventos pero no tenían endpoints; no se usarán esos eventos vencidos como prueba. La validación del proveedor no confirma recepción física ni permiso concedido en el teléfono. Las APK instaladas de negocio/repartidor deben reconstruirse con su configuración Firebase para recibir push; este AAB solo actualiza el cliente.
