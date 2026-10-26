/**
 * Desmontaje del renderer. En three r186 `Renderer.dispose()` es ASÍNCRONO: hay que esperarlo antes
 * de crear otro renderer, o conviven dos contextos gráficos (y en móvil el segundo falla). R3F no
 * espera esa promesa al desmontar el `<Canvas>`, así que todo desmontaje pasa por aquí.
 *
 * `pendingDispose` encadena los desmontajes: `whenDisposed()` resuelve cuando no queda ninguno en
 * curso (la creación de un renderer nuevo lo espera) y `liveContexts()` permite comprobar que nunca
 * hay más de uno vivo.
 */
export interface Disposable {
  dispose(): void | Promise<void>;
}

let pending: Promise<void> = Promise.resolve();
let live = 0;

export function trackContext(): void {
  live++;
}

export function liveContexts(): number {
  return live;
}

export function disposeRenderer(renderer: Disposable): Promise<void> {
  pending = pending.then(async () => {
    try {
      await renderer.dispose();
    } catch {
      /* un renderer ya perdido puede fallar al liberarse: el contexto está igualmente muerto */
    } finally {
      live = Math.max(0, live - 1);
    }
  });
  return pending;
}

/** Resuelve cuando todos los desmontajes pedidos hasta ahora terminaron. */
export function whenDisposed(): Promise<void> {
  return pending;
}
