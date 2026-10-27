/**
 * Presupuesto de voces (ADDENDUM-v3 §10: máximo 12 simultáneas) y limitador de frecuencia de disparo.
 * Lógica PURA con reloj inyectado (los tiempos son los del reloj de audio): se prueba sin Tone.
 *
 * Las voces persistentes (las 3 del pad) se reservan; las notas de música solo entran si quedan
 * `sfxReserve` huecos libres para los efectos, y los efectos pueden usar todo el presupuesto.
 */
export interface VoiceBudgetOptions {
  max?: number;
  /** Huecos que la música NO puede ocupar (quedan para los efectos). */
  sfxReserve?: number;
}

interface ActiveVoice {
  end: number;
  kind: "music" | "sfx";
}

export class VoiceBudget {
  readonly max: number;
  readonly sfxReserve: number;
  private reserved = 0;
  private active: ActiveVoice[] = [];
  /** Máximo de voces simultáneas observado (para el gancho de pruebas). */
  peak = 0;
  /** Cuántas peticiones se rechazaron por falta de hueco. */
  rejected = 0;

  constructor({ max = 12, sfxReserve = 3 }: VoiceBudgetOptions = {}) {
    this.max = max;
    this.sfxReserve = sfxReserve;
  }

  /** Reserva voces persistentes (el pad). */
  reserve(count: number): void {
    this.reserved = count;
  }

  private purge(now: number): void {
    if (this.active.length) this.active = this.active.filter((v) => v.end > now);
  }

  /** Voces sonando en un instante (incluye las reservadas). */
  count(now: number): number {
    this.purge(now);
    return this.reserved + this.active.length;
  }

  /**
   * Intenta ocupar una voz que empieza en `start` y deja de sonar en `start + dur + release`.
   * Devuelve `false` si no hay hueco (el llamador no dispara la nota). Las notas de música con
   * `priority >= 2` (bajo, teclas, bombo) pueden usar un hueco más de los reservados a efectos.
   */
  acquire(kind: "music" | "sfx", start: number, dur: number, release: number, priority = 0): boolean {
    this.purge(start);
    const used = this.reserved + this.active.length;
    const limit = kind === "music" ? this.max - this.sfxReserve + (priority >= 2 ? 1 : 0) : this.max;
    if (used >= limit) {
      this.rejected++;
      return false;
    }
    this.active.push({ end: start + dur + release, kind });
    this.peak = Math.max(this.peak, used + 1);
    return true;
  }

  reset(): void {
    this.active = [];
    this.peak = 0;
    this.rejected = 0;
  }
}

/** Limita la frecuencia con que puede dispararse cada efecto (p. ej. teclas de la terminal). */
export class RateLimiter {
  private last = new Map<string, number>();

  /** `true` si el efecto puede sonar ahora (y lo anota); `false` si aún no pasó `gapMs` desde el último. */
  allow(id: string, nowMs: number, gapMs: number): boolean {
    const prev = this.last.get(id);
    if (prev !== undefined && nowMs - prev < gapMs) return false;
    this.last.set(id, nowMs);
    return true;
  }

  reset(): void {
    this.last.clear();
  }
}
