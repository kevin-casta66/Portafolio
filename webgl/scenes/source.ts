import { Mesh, MeshBasicNodeMaterial, OrthographicCamera, PlaneGeometry, Scene } from "three/webgpu";
import type { FrameState } from "../core/frame";
import { sectionRange } from "../core/layout";
import type { EngineContext, SceneInstance } from "../core/types";
import { uAccent, uBorder, uPointer, uTime, uView } from "../nodes/globals";
import { TSL, type N } from "../nodes/tsl";
import { createFluid, type Fluid } from "./fluid";

const { Fn, vec2, vec3, vec4, float, uv, uniform, floor, fract, abs, max, step, smoothstep, mix, dot, mrt, clamp, length } = TSL;

/**
 * Escena SOURCE · retícula de circuito. Un único quad a pantalla completa con un shader TSL:
 * cuadrícula + pistas ortogonales con pulsos de luz del acento activo, dos capas con parallax de
 * puntero y de scroll. En tier alto (WebGPU) suma la estela de calor de la simulación de fluido.
 * Solo es capa visual: el hero DOM no cambia, y la intensidad está calibrada para mantener AA.
 */
const CELL_NEAR = 56;
const CELL_FAR = 112;

const hash2 = Fn(([p]: [N]) => {
  const q = fract(p.mul(vec2(0.1031, 0.103)));
  const d = q.add(dot(q, q.yx.add(33.33)));
  return fract(d.x.add(d.y).mul(d.x.mul(d.y).add(0.31)).mul(43.5453));
});

export const sourceRange = () => sectionRange("source", "source", 0);

export function createSourceScene(ctx: EngineContext): SceneInstance {
  const scene = new Scene();
  const camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);

  const uScroll = uniform(0);
  const uFade = uniform(1);
  const uIntensity = uniform(1);
  // Columna de texto del hero (px de viewport: x, y, w, h): la retícula se atenúa bajo ella para
  // que el nombre, el rol y la propuesta de valor mantengan contraste AA.
  const uTextBox = uniform(TSL.vec4(0, 0, 0, 0));
  const uAnimate = uniform(1);

  let fluid: Fluid | null = null;
  const material = new MeshBasicNodeMaterial({ transparent: true, depthTest: false, depthWrite: false });

  /** Una capa de la retícula: [líneas de rejilla y pista, luz (pulsos y vías)]. */
  const layer = (cell: number, depth: number, seed: number): [N, N] => {
    const parallax = uPointer.sub(uView.mul(0.5)).div(uView.x).mul(depth * 140);
    const px = vec2(uv().x.mul(uView.x), uv().y.oneMinus().mul(uView.y));
    const p = px.add(parallax).add(vec2(0, uScroll.mul(depth * 0.35 + 0.1)));
    const g = fract(p.div(cell));
    const id = floor(p.div(cell));
    const h = hash2(id.add(seed));
    // Anchura de línea ≈ 1 px independientemente del tamaño de celda.
    const w = float(1.1 / cell);
    const gridLine = max(step(g.x, w), step(g.y, w));
    // Pista: horizontal o vertical según la celda; vía en el centro de algunas celdas.
    const horizontal = step(h, 0.5);
    const across = mix(g.x, g.y, horizontal);
    const along = mix(g.y, g.x, horizontal);
    const hasTrace = step(0.3, fract(h.mul(7.3)));
    const trace = step(abs(across.sub(0.5)), w.mul(1.5)).mul(hasTrace);
    const via = step(length(g.sub(0.5)), w.mul(6)).mul(step(0.6, h)).mul(hasTrace);
    // Pulso de luz que recorre la pista (quieto con movimiento reducido).
    const speed = h.mul(0.5).add(0.25);
    const pulsePos = fract(uTime.mul(speed).mul(uAnimate).add(h.mul(9.7)));
    const pulse = smoothstep(0.24, 0.0, abs(along.sub(pulsePos))).mul(trace);
    return [gridLine.mul(0.5).add(trace.mul(0.9)), pulse.add(via.mul(0.3))];
  };

  /** (Re)construye los nodos de color/opacidad según haya o no fluido. */
  const buildNodes = () => {
    const [farLine, farLit] = layer(CELL_FAR, 0.35, 3.0);
    const [nearLine, nearLit] = layer(CELL_NEAR, 0.9, 11.0);
    const heat: N = fluid
      ? fluid.heatAt(vec2(uv().x, uv().y.oneMinus()))
      : float(0);
    const lines = farLine.mul(0.55).add(nearLine);
    const lit = clamp(farLit.mul(0.6).add(nearLit), 0, 1);
    const edge = smoothstep(0.0, 0.22, uv().y).mul(smoothstep(0.0, 0.18, uv().y.oneMinus()));
    const px2 = vec2(uv().x.mul(uView.x), uv().y.oneMinus().mul(uView.y));
    const inX = smoothstep(uTextBox.x.sub(24), uTextBox.x, px2.x).mul(smoothstep(uTextBox.x.add(uTextBox.z).add(24), uTextBox.x.add(uTextBox.z), px2.x));
    const inY = smoothstep(uTextBox.y.sub(24), uTextBox.y, px2.y).mul(smoothstep(uTextBox.y.add(uTextBox.w).add(24), uTextBox.y.add(uTextBox.w), px2.y));
    const textMask = float(1).sub(inX.mul(inY).mul(0.92));
    const fade = uFade.mul(edge).mul(uIntensity).mul(textMask);
    const glow = clamp(lit.add(heat.mul(2)), 0, 1);
    material.colorNode = vec3(mix(uBorder, uAccent, glow));
    material.opacityNode = clamp(lines.mul(0.1).add(lit.mul(0.55)).add(heat.mul(0.8)), 0, 1).mul(fade);
    // Canal `glow` del MRT: lo usa el bloom selectivo (solo tier alto).
    material.mrtNode = mrt({
      glow: vec4(uAccent.mul(lit.add(heat.mul(1.4))), clamp(lit.add(heat), 0, 1).mul(fade)),
    });
    material.needsUpdate = true;
  };
  buildNodes();

  const quad = new Mesh(new PlaneGeometry(2, 2), material);
  quad.frustumCulled = false;
  scene.add(quad);

  const ensureFluid = (frame: FrameState) => {
    const wanted = frame.preset.fluid && frame.gpuCompute;
    if (wanted === (fluid !== null)) return;
    if (wanted) fluid = createFluid(ctx.renderer, frame.preset.fluidResolution);
    else {
      fluid?.dispose();
      fluid = null;
    }
    buildNodes();
  };

  return {
    scene,
    camera,
    emits: true,
    update(frame) {
      const r = sourceRange();
      uScroll.value = frame.scrollY;
      const column = document.getElementById("source-title")?.parentElement?.getBoundingClientRect();
      if (column) uTextBox.value.set(column.left, column.top, column.width, column.height);
      uAnimate.value = frame.reduced ? 0 : 1;
      // Se desvanece al avanzar por el hero: así no compite con LEXER.
      if (r) {
        const p = Math.min(1, Math.max(0, (frame.scrollY - r.start) / Math.max(1, r.end - r.start)));
        uFade.value = 1 - Math.min(1, p * 1.25);
      }
      uIntensity.value = frame.tier === "low" ? 0.7 : 1;
      ensureFluid(frame);
      const fluidAnimating = fluid?.update(frame) ?? false;
      // Los pulsos de las pistas se animan mientras la escena es visible (salvo movimiento reducido).
      return !frame.reduced || fluidAnimating;
    },
    compute(renderer, frame) {
      fluid?.compute(renderer, frame);
    },
    applyQuality() {
      /* el fluido se crea/destruye en `update` según el preset vigente */
    },
    debug: () => ({ fluid: fluid !== null }),
    dispose() {
      fluid?.dispose();
      fluid = null;
      material.dispose();
      quad.geometry.dispose();
    },
  };
}
