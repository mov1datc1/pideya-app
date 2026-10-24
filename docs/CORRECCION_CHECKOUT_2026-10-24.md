# Corrección de creación de pedidos — 24/10/2026

Causa confirmada: CheckoutScreen enviaba siempre $25 de envío a domicilio. El trigger checkout_prices valida las tarifas guardadas por negocio y la distancia geográfica. La discrepancia generaba P0001 «Los precios o cargos cambiaron; revisa el carrito antes de confirmar», convertido por parseAppError en un error temporal genérico.

Verificación remota con rol authenticated, cuenta propietaria de pruebas y transacciones BEGIN/ROLLBACK: Forno 21 rechaza envío 25 y acepta 0; Birriería La Abuela rechaza 25 y acepta 50, en su primer rango de distancia. Los insert aceptados devolvieron una fila antes del rollback. No se conservaron pedidos ni eventos de notificación. No se modificaron tarifas, cuentas, RLS ni triggers.

Corrección: leer tarifas reales del negocio, calcular distancia con la misma fórmula/rangos del servidor, comprobar cobertura, bloquear confirmación sin tarifa y permitir reintento. Antes de insertar se vuelven a leer negocio y comisión; si cambian los importes se muestra el nuevo total y se exige otra confirmación. Los errores operativos conocidos se muestran claramente sin exponer errores SQL arbitrarios.

Se retira la suma de propina del checkout: el contrato de orders no tiene campo tip y su validador no la incluye. La interfaz explica que puede entregarse voluntariamente en efectivo al recibir, fuera del total. No se cambian silenciosamente totales en servidor.

Versión correctiva 1.3.2, versionCode administrado por EAS. Expo Doctor 18/18, TypeScript correcto, 27 regresiones (incluyendo rangos de envío, cobertura, tarifa cero y mensajes). La app 1.3.1 instalada necesita actualizarse; no basta con cambiar datos en backend.
