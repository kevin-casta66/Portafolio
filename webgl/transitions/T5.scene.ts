import { Mesh, MeshBasicNodeMaterial, PlaneGeometry, Scene } from "three/webgpu";
import { createPixelCamera, fitPixelCamera } from "../core/camera";
import { bayer } from "../nodes/bayer";
import { uAccents } from "../nodes/globals";
import { TSL } from "../nodes/tsl";
import { chipBoot } from "../objects/chip-state";
import type { TransitionSceneFactory } from "./state";

const { vec3, vec4, float, uniform, uv, floor, step, smoothstep, clamp, mrt, screenCoordinate } = TSL;

/**
 * Escena de T5. Un quad a pantalla completa: el frente del barrido baja con el progreso y detrás de
 * él la máscara de Bayer pasa de rala a densa (borde dithered de ≈ 40 % del alto) hasta un cuerpo
 * teñido de ámbar; al terminar, el barrido sale por abajo. El acento ámbar es el de RUNTIME (índice 4).
 */
const DITHER_CELL = 3; // px físicos por celda de la matriz (patrón visible, no ruido)
const BODY_ALPHA = 0.16; // mismo cuerpo tintado que la versión DOM
const RUNTIME_ACCENT = 4;

/** Quart in-out (la curva de escena) en JS: la misma que `--ease-scene`. */
const easeScene = (p: number) => (p < 0.5 ? 8 * p ** 4 : 1 - (-2 * p + 2) ** 4 / 2);

export const createT5Scene: TransitionSceneFactory = (_ctx, state) => {
  const scene = new Scene();
  const camera = createPixelCamera();
  const uFront = uniform(-0.3);
  const uAlpha = uniform(1);

  const material = new MeshBasicNodeMaterial({ transparent: true, depthTest: false, depthWrite: false });
  const yN = uv().y.oneMinus(); // 0 arriba, 1 abajo
  const behind = uFront.sub(yN); // alto de pantalla por detrás del frente: > 0 = ya barrido
  const edgeT = clamp(behind.div(0.4), 0, 1); // densidad de la máscara: 0 en el frente → 1 a 40 % detrás
  const cell = floor(screenCoordinate.div(DITHER_CELL));
  const dithered = step(bayer(cell.x, cell.y, 3), edgeT).mul(step(0, behind));
  // El cuerpo se desvanece ≈ 1 alto de pantalla por detrás del frente: el barrido «sale» al final.
  const tail = float(1).sub(smoothstep(0.95, 1.2, behind));
  const amber = vec3(uAccents.element(RUNTIME_ACCENT));
  const edgeGlow = dithered.mul(step(edgeT, 0.5)).mul(tail);

  material.colorNode = amber;
  material.opacityNode = dithered.mul(tail).mul(BODY_ALPHA).mul(uAlpha);
  material.mrtNode = mrt({ glow: vec4(amber.mul(edgeGlow), edgeGlow.mul(0.5).mul(uAlpha)) });

  const quad = new Mesh(new PlaneGeometry(1, 1), material);
  quad.frustumCulled = false;
  scene.add(quad);

  return {
    scene,
    camera,
    emits: true,
    update(frame) {
      fitPixelCamera(camera, frame.viewW, frame.viewH);
      quad.position.set(frame.viewW / 2, -frame.viewH / 2, 0);
      quad.scale.set(frame.viewW, frame.viewH, 1);
      const p = state.p;
      // El frente baja de −0,3 a 1,6 (alto de pantalla), igual que el barrido de la versión DOM.
      uFront.value = -0.3 + easeScene(p) * 1.9;
      uAlpha.value = p <= 0 || p >= 1 ? 0 : 1;
      // Los núcleos del chip se encienden uno a uno bajo el barrido.
      chipBoot.value = Math.min(1, Math.max(0, (p - 0.3) / 0.45));
      return false;
    },
    dispose() {
      chipBoot.value = 1;
      quad.geometry.dispose();
      material.dispose();
    },
  };
};
