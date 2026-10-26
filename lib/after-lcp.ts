/**
 * Resuelve cuando es seguro cargar código que no es necesario para el primer pintado: después de
 * que el navegador haya pintado el elemento LCP y de la carga de la página, y en un momento de
 * inactividad del hilo principal. Garantiza que la capa de animación NUNCA compite con el LCP.
 *
 * Tope de seguridad: pasados `maxWaitMs` se continúa igualmente (p. ej. si no hay candidato LCP).
 */
export function afterLcp(maxWaitMs = 4000): Promise<void> {
  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      const idle = window.requestIdleCallback;
      if (idle) idle(() => resolve(), { timeout: 1500 });
      else setTimeout(resolve, 200);
    };

    const loaded = new Promise<void>((res) => {
      if (document.readyState === "complete") res();
      else window.addEventListener("load", () => res(), { once: true });
    });

    const lcp = new Promise<void>((res) => {
      try {
        const observer = new PerformanceObserver((list) => {
          if (list.getEntries().length > 0) {
            observer.disconnect();
            res();
          }
        });
        observer.observe({ type: "largest-contentful-paint", buffered: true });
      } catch {
        res(); // navegador sin LCP: basta con la carga
      }
    });

    void Promise.all([loaded, lcp]).then(finish);
    setTimeout(finish, maxWaitMs);
  });
}
