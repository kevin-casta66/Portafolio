import { triangulateChip, type Triangulation, type TriangulateOptions } from "./triangulate";

/** Cuántas triangulaciones se hicieron realmente en el worker (para las pruebas del navegador). */
export const workerStats = { inWorker: 0, inline: 0 };

/**
 * Pide la triangulación al Web Worker. Si el worker no puede crearse o falla (CSP, navegador
 * antiguo), se calcula en el hilo principal: es una malla pequeña (decenas de ms como máximo) y el
 * resultado es idéntico.
 */
export function triangulateInWorker(options: TriangulateOptions = {}): Promise<Triangulation> {
  return new Promise((resolve) => {
    const inline = () => {
      workerStats.inline++;
      resolve(triangulateChip(options));
    };
    try {
      const worker = new Worker(new URL("../workers/triangulate.worker.ts", import.meta.url), {
        type: "module",
      });
      worker.onmessage = (event: MessageEvent<Triangulation>) => {
        workerStats.inWorker++;
        worker.terminate();
        resolve(event.data);
      };
      worker.onerror = () => {
        worker.terminate();
        inline();
      };
      worker.postMessage(options);
    } catch {
      inline();
    }
  });
}
