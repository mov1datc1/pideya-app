# Domicilios y seguimiento — 23 de octubre de 2026

Estado: cambios para revisión y pruebas en rama de trabajo. No se solicita compilación EAS, publicación ni despliegue.

## Domicilios

El cliente puede guardar referencias con su dirección y editar las indicaciones del pedido en checkout. El pedido incluye dirección e indicaciones. Cambiar el destino limpia la selección anterior. El repartidor puede leer las instrucciones completas. No guardar códigos permanentes de acceso; los códigos temporales se indican para ese pedido. El efectivo requiere recibir al repartidor.

## Seguimiento

- Moto en la última coordenada real recibida; no se simula avance continuo.
- Se muestra la antigüedad de la posición. Después de 90 segundos sin posición reciente se considera desactualizada y se retira ETA/ruta de viaje hasta recibir una posición válida.
- En Android se suavizan cambios de hasta 150 metros separados por un máximo de 30 segundos; reconexiones, saltos grandes y tiempos inválidos se posicionan directamente. iOS utiliza la coordenada recibida.
- Botón 3D inclina la cámara 45 grados; 2D vuelve a vista plana. No representa edificios modelados ni asegura cobertura 3D en localidades rurales.
- Centrar vuelve a vista general plana de negocio, destino y repartidor. Se permite explorar sin que cada actualización fuerce la cámara.
- Las rutas se consultan cada 30 segundos; la posición conserva la suscripción y consulta de respaldo existentes. La frescura se revisa cada 15 segundos. Todo depende de conectividad y permisos GPS.

## Verificación

TypeScript de cliente y repartidor; regresiones del cliente, incluidas posiciones antiguas, relojes futuros y saltos de reconexión. La visualización nativa de Google Maps requiere Android: no se considera validada mediante navegador.

Prueba pendiente en Redmi con una futura compilación que incluya esta rama:
1. Guardar casa con referencias, reabrir, cambiar destino y comprobar instrucciones completas en el pedido y repartidor.
2. Pedido aceptado: origen/destino; en camino: moto, ruta y ETA si están disponibles.
3. Probar 2D/3D, centrar, zoom, arrastre y tarjeta del pedido sin solapamientos.
4. Dejar de transmitir GPS por más de 90 segundos: última posición, aviso, sin ETA. Recuperar señal: punto real, sin animación atravesando toda la distancia perdida.
5. Probar cierre/reapertura, GPS denegado, Directions no disponible y entrega completada.

## Referencias

Uber describe estado, mapa y progreso del repartidor: https://help.uber.com/en-GB/ubereats/stores/article/check-the-status-of-my-order-?nodeId=14ad371a-cc67-408c-8d62-34bf738dc8c6

Uber contempla posiciones detenidas por GPS o tráfico: https://help.uber.com/ubereats/restaurants/article/delivery-partner-does-not-move-on-the-map?nodeId=44077948-ae58-42fc-9206-880d965c2b7d

Rappi describe geolocalización del repartidor para la operación del negocio; esta fuente no permite afirmar cómo es la interfaz actual del cliente: https://merchants.rappi.com/es-mx/como-perfeccionar-entregas-a-repartidores-de-rappi
