/**
 * Tipografia — Pide ya
 * Playfair Display para headings y precios
 * Outfit para body y UI
 */

export const fonts = {
  playfair: {
    regular: 'PlayfairDisplay_400Regular',
    italic: 'PlayfairDisplay_400Regular_Italic',
    semiBold: 'PlayfairDisplay_600SemiBold',
    bold: 'PlayfairDisplay_700Bold',
  },
  outfit: {
    light: 'Outfit_300Light',
    regular: 'Outfit_400Regular',
    medium: 'Outfit_500Medium',
    semiBold: 'Outfit_600SemiBold',
    bold: 'Outfit_700Bold',
  },
} as const;

export const textStyles = {
  h1: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 30,
  },
  h2: {
    fontFamily: 'PlayfairDisplay_600SemiBold',
    fontSize: 22,
  },
  h3: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 17,
  },
  body: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 15,
  },
  caption: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 13,
  },
  label: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 11,
    textTransform: 'uppercase' as const,
    letterSpacing: 1.2,
  },
} as const;
