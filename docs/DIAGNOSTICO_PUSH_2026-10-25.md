# Push y códigos de repartidor — 25 octubre 2026

## Evidencia

Pedidos 59 y 60: se generaron seis eventos (creado para negocio, aceptado y listo para cliente). Ninguno tiene una entrega push asociada. No existen endpoints para las cuentas de cliente/propietario de esos pedidos. Las rutas client/restaurant están habilitadas con proveedor Expo. Esto sitúa el problema antes del transporte: falta registro del dispositivo; no hay recibos de proveedor que permitan atribuirlo a batería o a un fallo de Expo.

Las identidades Android y EAS de cliente y negocio son distintas. La tabla usa UNIQUE(app,provider,token): instalar las dos apps en el mismo teléfono no hace que una sobrescriba a la otra. Cada app requiere su permiso y registro. Con datos actuales no se puede confirmar qué permiso tiene cada app en el Redmi.

La configuración revisada carece de googleServicesFile/google-services.json y el proyecto Android del cliente no contiene aplicación de Google Services ni google_app_id. Es una carencia de configuración FCM que debe resolverse antes del próximo binario. Revisar también la credencial FCM V1 en EAS; no asumir que subirla resuelve por sí solo la configuración nativa.

Referencia: https://docs.expo.dev/push-notifications/fcm-credentials/

## Pendiente de acceso

La CLI Firebase no pudo listar proyectos. Se solicitó renovar sesión con `firebase login --reauth`. No copiar claves privadas en Git ni en documentación. Después: obtener configuración Android para cada package correcto, integrar Google Services (el cliente conserva android/ nativo), verificar credencial FCM V1 en EAS y solo entonces compilar. No se lanzó otro AAB ni se enviaron notificaciones de prueba.

## Verificación que falta en dispositivo

Permitir notificaciones por app, abrir cada app autenticada, confirmar endpoints separados activos, crear un pedido y observar entrega y recibo del proveedor. Probar primer plano, segundo plano y pantalla bloqueada. Un recibo aceptado no garantiza que el usuario haya visto el aviso. No reutilizar eventos vencidos de los pedidos antiguos para simular éxito.

## Repartidor

Ambos perfiles Samuel ya tienen código individual de 36 caracteres. No se regeneraron. Se guardaron en el archivo local de accesos (fuera de Git). El formulario antiguo de alta propia no devolvía el código; Ajustes ahora permite consultarlo por repartidor, compartirlo u ocultarlo. La consulta limita id y negocio y respeta RLS. El alta propia indica explícitamente OWN; el formulario temporal refresca la lista tras crear.

Los cambios de UI requieren nueva APK de negocio. Los códigos existentes se pueden usar inmediatamente desde el archivo local, luego activar disponibilidad del turno.
