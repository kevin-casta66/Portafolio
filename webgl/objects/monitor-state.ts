/**
 * Estado compartido del ensamblaje del monitor (0 = sin monitor, 1 = completo). La transición T9
 * lo anima con el scroll al converger los píxeles; sin transición en canvas (tier bajo, movimiento
 * reducido o aún sin cargar) el monitor se muestra completo. Objeto mutable fuera de React.
 */
export const monitorAssembly = { value: 1 };
