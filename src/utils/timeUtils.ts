export const isRestaurantOpenNow = (openTime: string, closeTime: string, isOpenManual: boolean): boolean => {
  if (!isOpenManual) return false;
  if (!openTime || !closeTime) return false;

  try {
    const now = new Date();
    const currentHours = now.getHours();
    const currentMinutes = now.getMinutes();
    const currentTotal = currentHours * 60 + currentMinutes;

    const [oH, oM] = openTime.split(':').map(Number);
    const [cH, cM] = closeTime.split(':').map(Number);
    
    if (isNaN(oH) || isNaN(oM) || isNaN(cH) || isNaN(cM)) return true; // Fallback

    const openTotal = oH * 60 + oM;
    const closeTotal = cH * 60 + cM;

    // Manejar casos donde cierran después de medianoche (ej: 18:00 a 03:00)
    if (closeTotal < openTotal) {
      if (currentTotal <= closeTotal) return true; // madrugada antes de cerrar
      if (currentTotal >= openTotal) return true; // tarde/noche después de abrir
      return false;
    }

    // Horario normal (ej: 08:00 a 22:00)
    return currentTotal >= openTotal && currentTotal <= closeTotal;
  } catch (error) {
    console.error('Error parsing time:', error);
    return true; // Fallback in case of parsing errors so we don't accidentally close all restaurants
  }
};
