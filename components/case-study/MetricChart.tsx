import { getLocale, getTranslations } from "next-intl/server";
import type { CaseMetric } from "@/lib/cases/schema";
import { formatChange, metricRows } from "./metrics";

const BAR_W = 360;
const BAR_H = 14;
const ROW_H = 54;

/**
 * Métricas de resultados: un gráfico de barras en SVG (antes/después) y, siempre visible justo debajo,
 * la tabla con los mismos valores, que es la fuente de verdad para lectores de pantalla (el gráfico es
 * decorativo, `aria-hidden`). Las barras se dibujan al entrar en viewport (`motion/choreography/case.ts`);
 * sin JavaScript o con movimiento reducido se ven ya completas.
 */
export async function MetricChart({ metrics }: { metrics: readonly CaseMetric[] }) {
  const t = await getTranslations("Case.chart");
  const locale = await getLocale();
  const rows = metricRows(metrics);
  const fmt = (n: number, unit: string) => `${n.toLocaleString(locale)}${unit ? ` ${unit}` : ""}`;

  return (
    <div data-case-chart className="my-6 space-y-6">
      <svg
        aria-hidden="true"
        viewBox={`0 0 ${BAR_W + 120} ${rows.length * ROW_H}`}
        className="block h-auto w-full max-w-2xl"
      >
        {rows.map((row, i) => (
          <g key={row.id} transform={`translate(0 ${i * ROW_H})`}>
            <text x={0} y={11} className="fill-fg-muted font-mono" fontSize={12}>
              {row.label}
            </text>
            <rect x={0} y={18} width={BAR_W * row.beforeBar} height={BAR_H / 2 + 3} rx={3} data-chart-bar className="fill-border" />
            <rect x={0} y={32} width={BAR_W * row.afterBar} height={BAR_H / 2 + 3} rx={3} data-chart-bar className="fill-accent" />
            <text x={BAR_W * Math.max(row.beforeBar, row.afterBar) + 8} y={38} className="fill-fg font-mono" fontSize={12}>
              {fmt(row.after, row.unit)}
            </text>
          </g>
        ))}
      </svg>

      <div tabIndex={0} role="region" aria-label={t("tableRegion")} className="overflow-x-auto">
        <table className="w-full min-w-[30rem] border-collapse text-left text-base">
          <caption className="pb-2 text-left font-mono text-sm text-fg-muted">{t("caption")}</caption>
          <thead>
            <tr className="border-b border-border font-mono text-sm text-fg-muted">
              <th scope="col" className="py-2 pr-4 font-normal">
                {t("metric")}
              </th>
              <th scope="col" className="py-2 pr-4 font-normal">
                {t("before")}
              </th>
              <th scope="col" className="py-2 pr-4 font-normal">
                {t("after")}
              </th>
              <th scope="col" className="py-2 font-normal">
                {t("change")}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-border">
                <th scope="row" className="py-2 pr-4 font-normal">
                  {row.label}
                </th>
                <td className="py-2 pr-4 font-mono">{fmt(row.before, row.unit)}</td>
                <td className="py-2 pr-4 font-mono text-accent">{fmt(row.after, row.unit)}</td>
                <td className="py-2 font-mono">
                  {formatChange(row.changePct)} <span className="text-fg-muted">({t(row.verdict)})</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
