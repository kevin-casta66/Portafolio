import { Group, Mesh, MeshBasicNodeMaterial, PlaneGeometry, PointsNodeMaterial, Sprite, InstancedBufferAttribute, type WebGPURenderer } from "three/webgpu";
import { uAccent, uAccents, uBg, uBorder } from "../nodes/globals";
import { TSL, type N } from "../nodes/tsl";
import { placeOnTwin, type Experiment, type ExperimentFactory } from "./base";

const { Fn, vec2, vec3, vec4, uniform, instanceIndex, instancedBufferAttribute, instancedArray, smoothstep, mix, length, normalize, mrt, max } = TSL;

export const GRID_COLS = 28;
export const GRID_ROWS = 14;

/** Posición de reposo de cada punto en px, centrada en el escenario (y hacia abajo). */
export function homePositions(width: number, height: number): Float32Array {
  const out = new Float32Array(GRID_COLS * GRID_ROWS * 2);
  const sx = width / (GRID_COLS + 1);
  const sy = height / (GRID_ROWS + 1);
  for (let r = 0; r < GRID_ROWS; r++)
    for (let c = 0; c < GRID_COLS; c++) {
      const i = r * GRID_COLS + c;
      out[i * 2] = (c + 1) * sx - width / 2;
      out[i * 2 + 1] = (r + 1) * sy - height / 2;
    }
  return out;
}

/**
 * Experimento 4 · micro-interacción compleja: una rejilla de puntos que se deforma hacia un imán
 * que sigue al puntero (o al teclado). En tier alto con WebGPU, cada punto es un muelle simulado en
 * un compute shader (posición y velocidad en storage buffers, con inercia y rebote); en el resto, el
 * desplazamiento es analítico en el vertex shader con el imán suavizado en JS. Controles: intensidad
 * y radio. Táctil: el dedo es el imán; teclado: flechas lo mueven y R lo centra.
 */
export const createMicroExperiment: ExperimentFactory = (ctx) => {
  const group = new Group();
  const frame0 = ctx.frame;
  const useCompute = frame0.preset.cinematic && frame0.gpuCompute;
  const count = GRID_COLS * GRID_ROWS;

  const uMagnet = uniform(vec2(0, 0)); // px relativos al centro (y hacia abajo)
  const uStrength = uniform(0.6);
  const uRadius = uniform(120);
  const uActive = uniform(0);
  const uDt = uniform(1 / 60);

  const home = homePositions(640, 400);
  let homeAttr: InstancedBufferAttribute | null = null;
  let kernel: N = null;
  let posBuf: N = null;

  const material = new PointsNodeMaterial({ transparent: true, depthTest: false, depthWrite: false });
  let position: N;
  let proximity: N;

  if (useCompute) {
    // Compute: muelles con inercia. Estado en storage buffers (posición, velocidad, reposo).
    posBuf = instancedArray(Float32Array.from(home), "vec2");
    const velBuf = instancedArray(count, "vec2");
    const homeBuf = instancedArray(Float32Array.from(home), "vec2");
    kernel = Fn(() => {
      const i = instanceIndex;
      const p = posBuf.element(i);
      const v = velBuf.element(i);
      const h = homeBuf.element(i);
      const d = uMagnet.sub(p);
      const dist = max(length(d), 1);
      const pull = normalize(d).mul(smoothstep(uRadius, 0, dist)).mul(uStrength).mul(2600).mul(uActive);
      const spring = h.sub(p).mul(70);
      const nv = v.add(spring.add(pull).mul(uDt)).mul(0.9);
      velBuf.element(i).assign(nv);
      posBuf.element(i).assign(p.add(nv.mul(uDt)));
    })().compute(count);
    const p = posBuf.element(instanceIndex);
    position = vec3(p.x, p.y.negate(), 1);
    proximity = smoothstep(uRadius, 0, length(uMagnet.sub(p))).mul(uActive);
  } else {
    // Analítico: el punto se acerca al imán según la distancia (sin estado por punto).
    homeAttr = new InstancedBufferAttribute(Float32Array.from(home), 2);
    const h = instancedBufferAttribute(homeAttr);
    const d = uMagnet.sub(h);
    const dist = max(length(d), 1);
    const fall = smoothstep(uRadius, 0, dist).mul(uStrength).mul(uActive);
    const p = h.add(normalize(d).mul(fall).mul(dist.min(uRadius.mul(0.45))));
    position = vec3(p.x, p.y.negate(), 1);
    proximity = fall;
  }
  material.positionNode = position;
  material.sizeNode = vec2(proximity.mul(3.5).add(2.6));
  material.colorNode = vec3(mix(uAccents.element(5), uAccent, proximity));
  material.opacityNode = proximity.mul(0.7).add(0.45);
  material.mrtNode = mrt({ glow: vec4(vec3(uAccent).mul(proximity), proximity.mul(0.7)) });
  const sprite = new Sprite(material);
  sprite.count = count;
  sprite.frustumCulled = false;

  const backdropMat = new MeshBasicNodeMaterial({ depthTest: false, depthWrite: false });
  backdropMat.colorNode = vec3(mix(uBg, uBorder, 0.18));
  const backdrop = new Mesh(new PlaneGeometry(1, 1), backdropMat);
  backdrop.frustumCulled = false;
  group.add(backdrop);
  group.add(sprite);

  let lastSize = "";
  const keyMagnet = { x: 0, y: 0 };
  let activeUntil = 0;
  let magnetX = 0;
  let magnetY = 0;

  const experiment: Experiment & { compute?: (renderer: WebGPURenderer) => void } = {
    group,
    update(frame, twin, input, params) {
      placeOnTwin(group, twin);
      backdrop.scale.set(twin.rect.w, twin.rect.h, 1);
      uStrength.value = Number(params.strength ?? 0.6);
      // En modo compute el estado vive en un espacio fijo de 640×400: imán y radio se convierten a él.
      const sx = useCompute ? 640 / Math.max(1, twin.rect.w) : 1;
      const sy = useCompute ? 400 / Math.max(1, twin.rect.h) : 1;
      uRadius.value = Number(params.radius ?? 120) * sx;
      uDt.value = Math.min(1 / 30, frame.dt || 1 / 60);
      const size = `${Math.round(twin.rect.w)}x${Math.round(twin.rect.h)}`;
      if (size !== lastSize) {
        lastSize = size;
        const h = homePositions(twin.rect.w, twin.rect.h);
        if (homeAttr) {
          (homeAttr.array as Float32Array).set(h);
          homeAttr.needsUpdate = true;
        }
        if (useCompute) sprite.scale.set(twin.rect.w / 640, twin.rect.h / 400, 1);
      }
      // Imán: puntero/dedo, o teclado (flechas lo desplazan, R lo centra).
      if (input.reset) {
        input.reset = false;
        keyMagnet.x = 0;
        keyMagnet.y = 0;
        activeUntil = frame.time + 1;
      }
      if (input.keyX !== 0 || input.keyY !== 0) {
        keyMagnet.x = Math.max(-0.5, Math.min(0.5, keyMagnet.x + input.keyX * 0.08));
        keyMagnet.y = Math.max(-0.5, Math.min(0.5, keyMagnet.y + input.keyY * 0.08));
        input.keyX = input.keyY = 0;
        activeUntil = frame.time + 2.5;
      }
      let tx = (input.x - 0.5) * twin.rect.w;
      let ty = (input.y - 0.5) * twin.rect.h;
      let wantActive = input.inside || input.down;
      if (!wantActive && frame.time < activeUntil) {
        tx = keyMagnet.x * twin.rect.w;
        ty = keyMagnet.y * twin.rect.h;
        wantActive = true;
      }
      // El imán persigue al objetivo (suavizado) y se apaga al salir.
      const k = frame.reduced ? 1 : 1 - Math.exp(-frame.dt * 14);
      magnetX += (tx - magnetX) * k;
      magnetY += (ty - magnetY) * k;
      uMagnet.value.set(magnetX * sx, magnetY * sy);
      const act = wantActive ? 1 : 0;
      const prev = uActive.value as number;
      uActive.value = prev + (act - prev) * Math.min(1, frame.dt * 10);
      const settled = Math.abs(act - (uActive.value as number)) < 0.01 && !wantActive;
      return twin.visible && (wantActive || !settled || useCompute);
    },
    dispose() {
      sprite.material.dispose();
      backdrop.geometry.dispose();
      backdropMat.dispose();
    },
  };
  if (useCompute) {
    experiment.compute = (renderer) => {
      renderer.compute(kernel);
    };
  }
  return experiment;
};
