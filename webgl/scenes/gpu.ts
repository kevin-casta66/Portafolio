import { Mesh, MeshBasicNodeMaterial, PlaneGeometry, Scene } from "three/webgpu";
import { createPixelCamera, fitPixelCamera } from "../core/camera";
import { sectionRange } from "../core/layout";
import { twinPosition, twins } from "../core/twins";
import type { SceneInstance } from "../core/types";
import { uAccent, uBg, uBorder, uText } from "../nodes/globals";
import { meshNodes } from "../nodes/mesh";
import { TSL } from "../nodes/tsl";

const { vec2, vec3, vec4, float, uv, uniform, mix, smoothstep, clamp, max, mrt } = TSL;

/**
 * Escena GPU · pipeline gráfico sobre el escenario `data-twin="pipeline"`: la malla del chip pasa
 * por vértices → triángulos → rasterización → píxeles. El progreso (0..1) es una FUNCIÓN PURA de la
 * posición del escenario en el viewport, así que es reversible por construcción: retroceder el
 * scroll recorre las etapas en orden inverso sin saltos y sin estado.
 */
export const gpuRange = () => sectionRange("gpu", "gpu", 0);

/** Progreso del pipeline: 0 con el escenario entrando por abajo, 1 cuando sale por arriba. */
export function pipelineProgress(top: number, height: number, viewH: number): number {
  const enter = viewH * 0.9; // el escenario asoma por abajo
  const leave = viewH * 0.1 - height * 0.5; // casi sale por arriba
  return Math.min(1, Math.max(0, (enter - top) / Math.max(1, enter - leave)));
}

/** Etapa activa (0–3) para un progreso dado. */
export const stageOf = (p: number): number => Math.min(3, Math.floor(p * 4));

export function createGpuScene(): SceneInstance {
  const scene = new Scene();
  const camera = createPixelCamera();
  const uSize = uniform(vec2(100, 100));
  const uP = uniform(0);

  const material = new MeshBasicNodeMaterial({ transparent: true, depthTest: false, depthWrite: false });
  const p = vec2(uv().x.sub(0.5).mul(uSize.x), float(0.5).sub(uv().y).mul(uSize.y));
  const half = uSize.y.mul(0.4);
  const mesh = meshNodes(half);

  // Etapa 0 → 1: aparecen los vértices y luego las aristas.
  const dotsA = mesh.dots(p, mix(float(2.2), float(4), smoothstep(0, 0.2, uP))).mul(smoothstep(0.0, 0.1, uP));
  const edgesA = mesh.edges(p, float(1.4)).mul(smoothstep(0.2, 0.34, uP));
  // Etapa 1 → 2: los triángulos se rellenan (sombreado plano) por separado de la rasterización.
  const flat = mesh.sample(p);
  const flatFill = flat.coverage.mul(smoothstep(0.34, 0.5, uP)).mul(float(1).sub(smoothstep(0.5, 0.6, uP)));
  // Etapa 2 → 3: rasterización: la celda pasa de bloques grandes a píxeles finos.
  const cell = mix(float(38), float(3), smoothstep(0.52, 0.95, uP));
  const raster = mesh.raster(p, cell);
  const rasterA = raster.coverage
    .mul(raster.inCell)
    .mul(smoothstep(0.5, 0.6, uP));

  const shade = mix(flat.shade, raster.shade, smoothstep(0.5, 0.6, uP));
  const fill = max(flatFill, rasterA);
  const body = mix(mix(uBg, uBorder, 0.4), mix(uBg, uAccent, 0.55).add(uAccent.mul(shade).mul(0.55)), clamp(shade.mul(1.2), 0, 1));
  const lines = max(dotsA, edgesA);
  const color = mix(mix(body, uText, 0.0), uAccent, lines.mul(0.85));
  material.colorNode = vec3(color);
  material.opacityNode = clamp(max(fill.mul(0.92), lines.mul(0.95)), 0, 1);
  material.mrtNode = mrt({ glow: vec4(uAccent.mul(lines), lines.mul(0.8)) });

  const quad = new Mesh(new PlaneGeometry(1, 1), material);
  quad.frustumCulled = false;
  scene.add(quad);
  const release = twins.acquire();
  let lastP = -1;

  return {
    scene,
    camera,
    emits: true,
    update(frame) {
      fitPixelCamera(camera, frame.viewW, frame.viewH);
      const twin = twins.get("pipeline");
      if (!twin) {
        quad.visible = false;
        return false;
      }
      quad.visible = twin.visible;
      const pos = twinPosition(twin.rect);
      quad.position.set(pos.x, pos.y, 0);
      quad.scale.set(twin.rect.w, twin.rect.h, 1);
      uSize.value.set(twin.rect.w, twin.rect.h);
      const progress = pipelineProgress(twin.rect.y, twin.rect.h, frame.viewH);
      uP.value = progress;
      // Etapa activa en el DOM (aria-current) para quien vea o lea la lista de etapas.
      if (Math.abs(progress - lastP) > 0.001) {
        lastP = progress;
        const stage = stageOf(progress);
        document.querySelectorAll<HTMLElement>("[data-pipeline-label]").forEach((el, i) => {
          if (i === stage) el.setAttribute("aria-current", "step");
          else el.removeAttribute("aria-current");
        });
      }
      return false;
    },
    dispose() {
      release();
      quad.geometry.dispose();
      material.dispose();
      document.querySelectorAll("[data-pipeline-label]").forEach((el) => el.removeAttribute("aria-current"));
    },
  };
}
