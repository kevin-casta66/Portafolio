/**
 * Definición de los controles de cada experimento del laboratorio. Es la ÚNICA fuente de verdad de
 * rangos, valores por defecto y texto de valor accesible (`aria-valuetext`): la usan el panel DOM de
 * controles (inputs nativos con etiqueta) y las escenas 3D que leen esos parámetros. Datos puros.
 */
export type ExperimentKind = "shader" | "physics" | "dataviz" | "microinteraction";

export interface RangeControl {
  type: "range";
  key: string;
  /** Clave de mensajes (`Gpu.lab.controls.<labelKey>`). */
  labelKey: string;
  min: number;
  max: number;
  step: number;
  default: number;
  /** Texto del valor para tecnologías de asistencia. */
  valueText(value: number): string;
}

export interface SelectControl {
  type: "select";
  key: string;
  labelKey: string;
  options: readonly string[];
  default: string;
}

export type Control = RangeControl | SelectControl;

const pct = (v: number) => `${Math.round(v * 100)} %`;

export const CONTROLS: Record<ExperimentKind, readonly Control[]> = {
  shader: [
    {
      type: "range",
      key: "scale",
      labelKey: "scale",
      min: 0.5,
      max: 6,
      step: 0.1,
      default: 2.4,
      valueText: (v) => `×${v.toFixed(1)}`,
    },
    {
      type: "range",
      key: "speed",
      labelKey: "speed",
      min: 0,
      max: 2,
      step: 0.05,
      default: 0.5,
      valueText: (v) => (v === 0 ? "0 (detenido)" : `×${v.toFixed(2)}`),
    },
    {
      type: "range",
      key: "warp",
      labelKey: "warp",
      min: 0,
      max: 1,
      step: 0.01,
      default: 0.55,
      valueText: pct,
    },
  ],
  physics: [
    {
      type: "range",
      key: "gravity",
      labelKey: "gravity",
      min: 0,
      max: 2,
      step: 0.05,
      default: 1,
      valueText: (v) => `${(v * 9.8).toFixed(1)} m/s²`,
    },
    {
      type: "range",
      key: "bounce",
      labelKey: "bounce",
      min: 0,
      max: 1,
      step: 0.01,
      default: 0.45,
      valueText: pct,
    },
  ],
  dataviz: [
    { type: "select", key: "metric", labelKey: "metric", options: ["years", "projects"], default: "years" },
    { type: "select", key: "order", labelKey: "order", options: ["alphabetical", "value"], default: "value" },
  ],
  microinteraction: [
    {
      type: "range",
      key: "strength",
      labelKey: "strength",
      min: 0,
      max: 1,
      step: 0.01,
      default: 0.6,
      valueText: pct,
    },
    {
      type: "range",
      key: "radius",
      labelKey: "radius",
      min: 40,
      max: 240,
      step: 5,
      default: 120,
      valueText: (v) => `${Math.round(v)} px`,
    },
  ],
};

export type Params = Record<string, number | string>;

export function defaultParams(kind: ExperimentKind): Params {
  const out: Params = {};
  for (const control of CONTROLS[kind]) out[control.key] = control.default;
  return out;
}
