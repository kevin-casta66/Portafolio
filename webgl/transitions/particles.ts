/**
 * Reparto de partículas entre un conjunto de «orígenes» (glifos de la línea de código) y un conjunto
 * de «destinos» (los tokens del Lexer) agrupados por carril. Lógica pura y determinista (generador
 * con semilla): la comparten T2 y los tests. Cada partícula nace en un píxel de un glifo y termina
 * en un píxel de un token de SU carril, así los tokens coloreados se forman con el color de origen.
 */
export interface PointSet {
  /** x, y alternados. */
  points: Float32Array;
  lane: string;
  color: [number, number, number];
}

export interface ParticleBuffers {
  start: Float32Array; // x, y
  end: Float32Array; // x, y
  seed: Float32Array; // a, b ∈ [0,1)
  color: Float32Array; // r, g, b
  count: number;
}

/** Generador pseudoaleatorio mulberry32 (determinista por semilla). */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pickWeighted(sets: readonly PointSet[], random: () => number, total: number): PointSet {
  let r = random() * total;
  for (const set of sets) {
    r -= set.points.length / 2;
    if (r <= 0) return set;
  }
  return sets[sets.length - 1] as PointSet;
}

export function assignParticles(
  sources: readonly PointSet[],
  targets: readonly PointSet[],
  count: number,
  seed = 1,
): ParticleBuffers {
  const random = rng(seed);
  const start = new Float32Array(count * 2);
  const end = new Float32Array(count * 2);
  const seeds = new Float32Array(count * 2);
  const color = new Float32Array(count * 3);
  if (sources.length === 0 || targets.length === 0 || count === 0)
    return { start: new Float32Array(0), end: new Float32Array(0), seed: new Float32Array(0), color: new Float32Array(0), count: 0 };

  const sourceTotal = sources.reduce((n, s) => n + s.points.length / 2, 0);
  const byLane = new Map<string, PointSet[]>();
  for (const t of targets) byLane.set(t.lane, [...(byLane.get(t.lane) ?? []), t]);
  const targetTotal = new Map<string, number>();
  for (const [lane, sets] of byLane)
    targetTotal.set(lane, sets.reduce((n, s) => n + s.points.length / 2, 0));
  const allTotal = targets.reduce((n, s) => n + s.points.length / 2, 0);

  for (let i = 0; i < count; i++) {
    const src = pickWeighted(sources, random, sourceTotal);
    const sp = Math.floor(random() * (src.points.length / 2));
    const lane = byLane.get(src.lane);
    const dst = lane
      ? pickWeighted(lane, random, targetTotal.get(src.lane) as number)
      : pickWeighted(targets, random, allTotal);
    const dp = Math.floor(random() * (dst.points.length / 2));
    // Sub-píxel: dispersa las partículas dentro del píxel muestreado.
    start[i * 2] = (src.points[sp * 2] as number) + (random() - 0.5) * 0.4;
    start[i * 2 + 1] = (src.points[sp * 2 + 1] as number) + (random() - 0.5) * 0.4;
    end[i * 2] = (dst.points[dp * 2] as number) + (random() - 0.5) * 0.4;
    end[i * 2 + 1] = (dst.points[dp * 2 + 1] as number) + (random() - 0.5) * 0.4;
    seeds[i * 2] = random();
    seeds[i * 2 + 1] = random();
    color[i * 3] = src.color[0];
    color[i * 3 + 1] = src.color[1];
    color[i * 3 + 2] = src.color[2];
  }
  return { start, end, seed: seeds, color, count };
}
