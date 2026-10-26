import { Group, Mesh, MeshBasicNodeMaterial, PlaneGeometry } from "three/webgpu";
import { uAccents, uBg, uBorder, uText } from "../nodes/globals";
import { TSL } from "../nodes/tsl";
import { placeOnTwin, type ExperimentFactory } from "./base";
import { setReadout } from "./store";

const { vec3, vec4, float, uv, uniform, uniformArray, floor, fract, mix, step, clamp, mrt } = TSL;

/** Máximo de barras que dibuja el shader (las barras se desenrollan en JS). */
const MAX_BARS = 12;

export interface Bar {
  label: string;
  value: number;
}

/** Datos ordenados y escalados 0..1 para la métrica y el orden elegidos (puro y probado). */
export function barsFor(
  dataset: readonly { label: string; years: number; projects: number }[],
  metric: string,
  order: string,
): Bar[] {
  const key = metric === "projects" ? "projects" : "years";
  const bars = dataset.map((d) => ({ label: d.label, value: d[key] }));
  if (order === "alphabetical") bars.sort((a, b) => a.label.localeCompare(b.label));
  else bars.sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));
  return bars.slice(0, MAX_BARS);
}

/**
 * Experimento 3 · visualización de datos: una «escultura» de barras con las habilidades (años de
 * experiencia o número de proyectos), dibujada por un solo shader que lee las alturas de un array de
 * uniforms. Las alturas se animan hacia su objetivo al cambiar de métrica u orden; al pasar el
 * puntero se resalta una barra y su lectura se anuncia en el DOM (`aria-live`). La tabla completa
 * está en el DOM del escenario como lista oculta visualmente.
 */
export const createDatavizExperiment: ExperimentFactory = (ctx, exp) => {
  const group = new Group();
  const heights = Array.from({ length: MAX_BARS }, () => 0);
  const uHeights = uniformArray(heights, "float");
  const uCount = uniform(1);
  const uHover = uniform(-1);

  const col = uv().x.mul(uCount);
  const i = floor(col);
  const within = fract(col);
  const h = uHeights.element(i.toInt());
  const y = float(1).sub(uv().y); // 0 abajo, 1 arriba
  const margin = float(0.12);
  const barTop = margin.add(h.mul(float(1).sub(margin.mul(2))));
  const inBar = step(0.16, within).mul(step(within, 0.84)).mul(step(margin, y)).mul(step(y, barTop));
  const cap = step(barTop.sub(0.035), y).mul(inBar); // cara superior (más clara) = volumen
  const hover = step(abs1(i.sub(uHover)), 0.5);
  const tint = mix(uAccents.element(1), uAccents.element(5), clamp(h, 0, 1));
  const body = mix(tint, uText, hover.mul(0.45).add(cap.mul(0.25)));
  const base = mix(uBg, uBorder, 0.2);
  const baseline = step(abs1(y.sub(margin)), 0.006);
  const color = mix(base, body, inBar).add(vec3(baseline).mul(uBorder));
  const glow = inBar.mul(hover.add(cap.mul(0.5)));

  const material = new MeshBasicNodeMaterial({ depthTest: false, depthWrite: false });
  material.colorNode = vec3(color);
  material.mrtNode = mrt({ glow: vec4(vec3(tint).mul(glow), glow.mul(0.5)) });
  const mesh = new Mesh(new PlaneGeometry(1, 1), material);
  mesh.frustumCulled = false;
  group.add(mesh);

  let bars: Bar[] = [];
  let lastKey = "";
  let hoverIndex = -1;
  const target = Array.from({ length: MAX_BARS }, () => 0);

  return {
    group,
    update(frame, twin, input, params) {
      placeOnTwin(group, twin);
      mesh.scale.set(twin.rect.w, twin.rect.h, 1);
      const key = `${params.metric}|${params.order}`;
      if (key !== lastKey) {
        lastKey = key;
        bars = barsFor(exp.dataset, String(params.metric), String(params.order));
        const max = Math.max(1, ...bars.map((b) => b.value));
        target.fill(0);
        bars.forEach((b, k) => (target[k] = b.value / max));
        uCount.value = Math.max(1, bars.length);
      }
      // Hover: la barra bajo el puntero y su lectura (solo se escribe en el DOM al cambiar).
      const nextHover = input.inside && bars.length > 0 ? Math.min(bars.length - 1, Math.floor(input.x * bars.length)) : -1;
      if (nextHover !== hoverIndex) {
        hoverIndex = nextHover;
        uHover.value = hoverIndex;
        const bar = bars[hoverIndex];
        setReadout(ctx_id(exp.id), bar ? `${bar.label}: ${bar.value}` : "");
      }
      // Las alturas se acercan a su objetivo (suavizado exponencial; con movimiento reducido, directo).
      let moving = false;
      const k = frame.reduced ? 1 : 1 - Math.exp(-frame.dt * 9);
      for (let b = 0; b < MAX_BARS; b++) {
        const diff = (target[b] as number) - (heights[b] as number);
        if (Math.abs(diff) > 0.001) {
          heights[b] = (heights[b] as number) + diff * k;
          moving = true;
        } else heights[b] = target[b] as number;
        uHeights.array[b] = heights[b];
      }
      return moving;
    },
    dispose() {
      mesh.geometry.dispose();
      material.dispose();
    },
  };
};

const ctx_id = (id: string) => id;
const abs1 = (x: ReturnType<typeof float>) => TSL.abs(x);
