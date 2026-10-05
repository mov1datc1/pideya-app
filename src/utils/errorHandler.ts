/**
 * Utilidad para traducir errores técnicos (Supabase/Red) a mensajes amigables para el usuario.
 *
 * @param error El error capturado en el bloque catch.
 * @param fallbackMessage El mensaje por defecto si el error no es reconocido.
 * @returns Un string formateado con el mensaje principal y una sugerencia de acción para el usuario.
 */
export const parseAppError = (
  error: unknown,
  fallbackMessage: string,
): string => {
  const err = error as any;
  const message = err?.message || err?.error_description || err?.toString() || '';
  const strMessage = typeof message === 'string' ? message.toLowerCase() : '';

  // 1. Errores de Red (Internet)
  if (
    strMessage.includes('failed to fetch') ||
    strMessage.includes('network request failed') ||
    strMessage.includes('network error')
  ) {
    return 'Problema de conexión.\n\nParece que no tienes internet. Por favor, verifica tu conexión Wi-Fi o datos móviles e intenta nuevamente.';
  }

  // 2. Errores de Timeout (Servidor lento)
  if (
    strMessage.includes('timeout') ||
    strMessage.includes('socket hang up') ||
    strMessage.includes('abort')
  ) {
    return 'El servidor tardó mucho en responder.\n\nPuede haber tráfico en la red o mala señal. Intenta de nuevo en unos momentos.';
  }

  // 3. Errores de Autenticación (Supabase Auth)
  if (strMessage.includes('invalid login credentials')) {
    return 'Credenciales incorrectas.\n\nVerifica que tu correo y contraseña estén bien escritos.';
  }
  if (strMessage.includes('user already registered')) {
    return 'Usuario ya registrado.\n\nEste correo ya tiene una cuenta. Intenta iniciar sesión.';
  }
  if (strMessage.includes('jwt expired')) {
    return 'Tu sesión expiró.\n\nPor seguridad, vuelve a iniciar sesión.';
  }

  // 4. Errores de Base de Datos (PostgREST genérico)
  if (
    strMessage.includes('postgrest') ||
    strMessage.includes('syntax error') ||
    strMessage.includes('relation') ||
    strMessage.includes('column') ||
    strMessage.includes('rls') ||
    strMessage.includes('policy')
  ) {
    return `${fallbackMessage}.\n\nOcurrió un problema interno en la app. Por favor, intenta más tarde.`;
  }

  // Fallback final: Si tenemos un mensaje del servidor, pero es técnico, devolvemos el fallback.
  // Si el mensaje parece amigable (no contiene cosas técnicas muy raras), lo devolvemos,
  // pero generalmente es mejor mostrar el fallback y la instrucción de "no hacer nada".
  if (strMessage.length > 0 && !strMessage.includes('[object')) {
    // Para no asustar al usuario con mensajes raros en inglés, mostramos el fallback
    // pero indicamos que es un problema interno temporal.
    return `${fallbackMessage}.\n\nOcurrió un error temporal en la plataforma. Por favor, intenta de nuevo.`;
  }

  return `${fallbackMessage}.\n\nOcurrió un error inesperado. Por favor, reinicia la aplicación.`;
};
