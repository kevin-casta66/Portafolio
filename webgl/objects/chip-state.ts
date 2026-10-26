/**
 * Arranque del chip (0 = núcleos apagados, 1 = todos encendidos). La transición T5 lo anima con el
 * scroll: los núcleos se encienden uno a uno bajo el barrido de dithering. Sin transición en canvas
 * (tier bajo, movimiento reducido o sin cargar) el chip se muestra completo. Objeto mutable fuera de React.
 */
export const chipBoot = { value: 1 };
