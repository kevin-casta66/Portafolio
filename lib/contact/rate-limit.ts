/**
 * Límite de frecuencia en memoria por cliente (ventana deslizante). Es suficiente para un
 * portafolio, pero NO se comparte entre instancias serverless: si hay abuso, migrar a un KV.
 * El honeypot es la primera barrera.
 */
export const RATE_LIMIT = { max: 5, windowMs: 10 * 60 * 1000 } as const;

const hits = new Map<string, number[]>();

/** Registra un intento y devuelve `true` si está permitido. */
export function allowRequest(key: string, now: number = Date.now()): boolean {
  const recent = (hits.get(key) ?? []).filter((t) => now - t < RATE_LIMIT.windowMs);
  if (recent.length >= RATE_LIMIT.max) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);
  return true;
}

/** Solo para tests. */
export function resetRateLimit(): void {
  hits.clear();
}
