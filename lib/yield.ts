/**
 * Cede el hilo principal al navegador (change 09, INP/TBT): cada trozo de trabajo largo se parte con
 * `await yieldToMain()` para que ninguna tarea supere ~50 ms y las interacciones pendientes se atiendan entre
 * trozos. Usa `scheduler.yield()` (prioridad de continuación) y cae a `setTimeout(0)`.
 */
export function yieldToMain(): Promise<void> {
  const scheduler = (globalThis as { scheduler?: { yield?: () => Promise<void> } }).scheduler;
  if (scheduler?.yield) return scheduler.yield();
  return new Promise((resolve) => setTimeout(resolve, 0));
}
