import type { CaseMetric } from "@/lib/cases/schema";

export type Verdict = "improved" | "worsened" | "same";

export interface MetricRow {
  id: string;
  label: string;
  unit: string;
  before: number;
  after: number;
  /** Cambio relativo en % (con signo: negativo = baja). `null` si el valor de partida es 0. */
  changePct: number | null;
  verdict: Verdict;
  /** Longitud de cada barra (0..1) respecto al mayor de los dos valores de esa métrica. */
  beforeBar: number;
  afterBar: number;
}

/** Datos del gráfico y de su tabla equivalente: ambos salen de aquí, así nunca difieren. */
export function metricRows(metrics: readonly CaseMetric[]): MetricRow[] {
  return metrics.map((m) => {
    const max = Math.max(m.before, m.after, Number.EPSILON);
    const changePct = m.before === 0 ? null : ((m.after - m.before) / m.before) * 100;
    const delta = m.after - m.before;
    const better = m.better === "lower" ? delta < 0 : delta > 0;
    return {
      id: m.id,
      label: m.label,
      unit: m.unit,
      before: m.before,
      after: m.after,
      changePct,
      verdict: delta === 0 ? "same" : better ? "improved" : "worsened",
      beforeBar: m.before / max,
      afterBar: m.after / max,
    };
  });
}

/** `-67 %`, `+12 %`; el signo menos tipográfico y sin decimales salvo que importen. */
export function formatChange(pct: number | null): string {
  if (pct === null) return "—";
  const rounded = Math.abs(pct) < 10 ? Math.round(pct * 10) / 10 : Math.round(pct);
  const sign = rounded > 0 ? "+" : rounded < 0 ? "−" : "";
  return `${sign}${Math.abs(rounded).toLocaleString("es-ES")} %`;
}
