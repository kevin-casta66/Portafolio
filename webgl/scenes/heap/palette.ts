/**
 * Mezclas de color (en espacio LINEAL, como el shader) de los bloques del heap. Están en un módulo
 * aparte porque el contraste AA del texto sobre el bloque —en reposo, con hover y bajo la lente— se
 * comprueba contra EXACTAMENTE estos valores (`scratchpad/v07-contrast.mjs`, tarea 5.3): subir un tinte
 * sin revisar el contraste rompe la legibilidad.
 */
export const PALETTE = {
  /** Relleno del bloque: fondo → texto. */
  blockMix: 0.016,
  /** Añadido al relleno con hover/selección. */
  hoverMix: 0.03,
  /** Tinte de acento de la franja de la dirección y del cuerpo con hover. */
  headerTint: 0.06,
  hoverTint: 0.03,
  /** Tinte del aro de la lente sobre el contenido ampliado. */
  rimTint: 0.05,
  /** Texto apagado (tipo · año): fondo → texto. */
  mutedMix: 0.86,
} as const;
