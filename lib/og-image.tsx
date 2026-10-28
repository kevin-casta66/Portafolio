import { ImageResponse } from "next/og";
import { tokenColor } from "@/lib/og-colors";

export const ogSize = { width: 1200, height: 630 };
export const ogContentType = "image/png";

export type OgPhase = "source" | "lexer" | "parser" | "bytecode" | "runtime" | "gpu";

interface OgOptions {
  /** Línea superior, con el acento de la fase (p. ej. dirección de memoria · etiqueta). */
  kicker: string;
  title: string;
  /** Texto secundario bajo el título (descripción o métrica principal). */
  subtitle: string;
  phase: OgPhase;
  /** Línea inferior (autor). */
  footer: string;
}

/**
 * Imagen Open Graph de 1200×630 con el estilo de una fase: fondo y texto de los tokens, acento de
 * la fase y un motivo de circuito (pistas y nodos) en la esquina. Compartida por home, casos,
 * `/heap` y `/motion`.
 */
export function renderOgImage({ kicker, title, subtitle, phase, footer }: OgOptions): ImageResponse {
  const bg = tokenColor("--bg");
  const fg = tokenColor("--text");
  const muted = tokenColor("--text-muted");
  const accent = tokenColor(`--accent-${phase}`);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          background: bg,
          color: fg,
        }}
      >
        <svg
          width="1200"
          height="630"
          viewBox="0 0 1200 630"
          style={{ position: "absolute", top: 0, left: 0 }}
        >
          <g fill="none" stroke={accent} strokeWidth="3" strokeOpacity="0.35">
            <path d="M760 90 H980 L1040 150 H1200" />
            <path d="M820 150 H940 L990 200 V300 H1200" />
            <path d="M900 40 V110 L960 170" />
            <path d="M1000 630 V520 L1060 460 H1200" />
          </g>
          <g fill={accent} fillOpacity="0.55">
            <circle cx="760" cy="90" r="9" />
            <circle cx="980" cy="90" r="7" />
            <circle cx="990" cy="300" r="9" />
            <circle cx="960" cy="170" r="7" />
            <circle cx="1060" cy="460" r="9" />
          </g>
        </svg>
        <div
          style={{
            display: "flex",
            width: "100%",
            height: "100%",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: 72,
          }}
        >
          <div style={{ display: "flex", fontSize: 34, color: accent }}>{kicker}</div>
          <div style={{ display: "flex", flexDirection: "column", maxWidth: 1000 }}>
            <div style={{ display: "flex", fontSize: 80, fontWeight: 700, lineHeight: 1.05 }}>{title}</div>
            <div style={{ display: "flex", marginTop: 28, fontSize: 34, color: muted, lineHeight: 1.25 }}>
              {subtitle}
            </div>
          </div>
          <div style={{ display: "flex", fontSize: 30, color: muted }}>{footer}</div>
        </div>
      </div>
    ),
    ogSize,
  );
}
