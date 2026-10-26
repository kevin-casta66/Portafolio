import { useSyncExternalStore } from "react";

/**
 * Interruptor de «hay un reordenado por filtro en curso» (T10). Los `<ViewTransition>` de las tarjetas
 * solo animan mientras está activo: así ni la transición a un caso (T6) ni el cambio de tema ni la
 * apertura de un menú los hacen participar con el fundido por defecto. Lo activa `ProcessFilter` justo
 * antes de pedir la lista filtrada y lo apaga cuando la lista nueva ya está pintada.
 */
let active = false;
const listeners = new Set<() => void>();

export function setFilterTransition(next: boolean): void {
  if (active === next) return;
  active = next;
  listeners.forEach((listener) => listener());
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const useFilterTransition = (): boolean =>
  useSyncExternalStore(subscribe, () => active, () => false);
