# Pedidos listos y asignación de repartidor

## Diagnóstico

Los pedidos de prueba #59 y #60 estaban en READY y sin repartidor; no se habían entregado. El cliente omitía PREPARING y READY del tipo, etiquetas y lista de estados activos, enviándolos al historial y perdiendo el seguimiento.

La asignación en el negocio era rechazada por `Repartidor sin turno disponible`: ambos perfiles estaban activos, pero no existían turnos. El mensaje genérico de la app ocultaba la causa. No se debe quitar este control, necesario para disponibilidad, cola y retorno de efectivo.

Además, con turno activo la regla de integridad 043 rechazaba `delivery_assigned_at`, enviado por la app. La migración 054 calcula esa fecha en el servidor al cambiar el repartidor, ignora fechas del dispositivo y conserva la prohibición de cambiar importes u otros campos protegidos.

## Corrección

Cliente: PREPARING y READY son estados activos, tienen etiquetas y colores; el mapa sigue visible hasta que corresponda. READY se muestra como listo, esperando asignación, sin confundirlo con entregado. La moto y ETA de reparto corresponden a la salida y ubicación real del repartidor.

Negocio: la asignación explica el requisito de activar turno y muestra mensajes específicos para turno ausente, turno insuficiente, cola llena, afiliación inválida y entrega con custodia. No expone errores SQL desconocidos.

## Prueba en teléfonos

1. En PideYa Repartidor iniciar sesión con el código del repartidor de ese negocio.
2. En Mi turno y efectivo activar disponibilidad suficiente para recorrido y regreso (pedido de prueba: ciclo estimado de 45 minutos; usar dos horas para la prueba).
3. Volver al negocio y asignar el pedido READY. No hace falta crear otro pedido.
4. Recoger/iniciar el recorrido desde el repartidor y verificar ON_THE_WAY en cliente.
5. Completar entrega, cobro y retorno de efectivo según el flujo.

Un mismo repartidor no puede mantener turnos simultáneos en dos negocios: finalizar y liquidar el primero antes de activar el siguiente.

Las correcciones visuales requieren nuevas compilaciones instaladas; cambiar código en GitHub no cambia el AAB/APK del teléfono. El requisito de turno ya existe en la versión actual: se puede probar inmediatamente sin esperar una compilación.
