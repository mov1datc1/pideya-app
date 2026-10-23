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


## Diseño aprobado por referencia — implementación del 23/10

Se unificaron la pestaña de seguimiento y el seguimiento individual en `DeliveryTrackingView`. Encabezado con logo oficial (la vista individual conserva regresar), tarjeta blanca, ETA destacada, pasos horizontales, teléfono funcional y negocio/destino. Los detalles del pedido individual se conservan dentro de la tarjeta desplazable. Las pantallas de ajustes, cancelación y recogida conservan sus reglas.

La tarjeta se limita al 52% de la altura y se puede minimizar; el mapa se encuadra según la altura medida del encabezado y tarjeta. El mapa nativo termina sobre la tarjeta para mantener su atribución visible. Calles con mayor contraste y parques discretos. Moto de 58 puntos sin círculo, ruta agave con contorno blanco. Vista inclinada opcional: no se garantiza la geometría de edificios ni árboles de la imagen conceptual.

No se inventa un rango de llegada ni un estado «Cerca de ti»: se muestra ETA real disponible y pasos Confirmado / Preparando (o Surtiendo) / En camino / Entregado. «Tu destino» evita asumir que todas las direcciones son casa. El tiempo se retira si la posición pierde frescura.

Asset nuevo: `assets/scooter-tracking.png`, PNG RGBA con transparencia, 256 × 256. Generado con la herramienta integrada image_gen; original conservado, sin sustituir el asset anterior. Prompt: “Create one production mobile map marker PNG asset with TRUE TRANSPARENT background alpha. A compact tasteful 3D isometric delivery scooter with rider and square delivery box, facing upper right, viewed from elevated 45 degree perspective. Agave teal #2D8B7A body and helmet, charcoal wheels, ivory small accents, rider in dark teal uniform. No text, no logo, no circle backing, no ground plane, no scenery. Clean silhouette extremely legible at 52 pixels, simplified large forms without tiny detail. Entire scooter and rider visible, tightly centered within square image with 8% padding, very subtle contact shadow only underneath wheels. Premium polished miniature, not toy caricature. This is a new asset for PideYa delivery tracking map. Transparent outside subject, no white square.”

Validación: TypeScript y 25 regresiones. Asset inspeccionado visualmente y firma PNG/transparencia verificada. Pendiente validación visual nativa en Redmi (sin SDK/emulador Android en la ruta local habitual); no se afirma equivalencia exacta con el concepto. Revisar pantalla pequeña, fuente ampliada, minimizar/expandir, logo de Google visible, botones, llamadas y reapertura de pedido. No se ejecutan builds ni despliegues en este cambio.

## AAB 1.3.1 — preparación para Google Play

Solicitud expresa de AAB (no APK). Se mantiene `appVersionSource: remote` y `production.autoIncrement: true`. La última compilación terminada consultada fue 1.3.0 / 31. Se actualiza la versión visible a 1.3.1, incluyendo package.json y lockfile; EAS determina el siguiente versionCode.

Seguimiento automático cada 10 segundos si cambiaron posición o ruta; mantiene negocio, destino, moto y geometría de ruta dentro del encuadre. Arrastrar/zoom manual pausa el seguimiento; el botón de navegación lo reactiva. Elegir 3D también lo pausa para respetar esa perspectiva. Ruta de referencia negocio-destino en agave suave, trayecto restante en agave destacado. No se presenta la línea de referencia como historial GPS recorrido.

Google Directions respondió HTTP 200 / OK con polyline y duración a una consulta de prueba en Arandas. Esto verifica la API con la clave comprobada, no la entrega completa en Redmi ni permisos GPS del repartidor. Expo Doctor: 18/18 comprobaciones correctas. TypeScript y 25 regresiones aprobadas. Pendiente prueba física con cliente, negocio y repartidor; no se publica automáticamente en Google Play.

Resultado confirmado: EAS `FINISHED`, versión **1.3.1**, **versionCode 32**, commit compilado `73ad2e8`. Build: https://expo.dev/accounts/pideya1/projects/pide-ya/builds/61554079-3789-474f-9b54-e4235cc54767

AAB: https://expo.dev/artifacts/eas/M6JonPpL5ln8YcGk2SHwJ1JYSCWdoKQJhcnkP8BMtrg.aab

Compilación completada y artefacto publicado en EAS; no se hizo submit a Google Play. La validación funcional/visual en Redmi sigue pendiente.
