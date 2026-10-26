import { Group, InstancedBufferAttribute, Mesh, MeshBasicNodeMaterial, PlaneGeometry, PointsNodeMaterial, Sprite } from "three/webgpu";
import { uAccent, uAccents, uBg, uBorder } from "../nodes/globals";
import { TSL } from "../nodes/tsl";
import { placeOnTwin, type ExperimentFactory } from "./base";
import {
  BODY_COUNT,
  WORLD_H,
  WORLD_W,
  bodySpec,
  bodyStart,
  stageToWorld,
  type FromWorker,
  type ToWorker,
} from "./physics-protocol";

const { vec2, vec3, vec4, float, uniform, instancedBufferAttribute, instanceIndex, smoothstep, length, mix, uv, mrt, hash, uint } = TSL;

/**
 * Experimento 2 · simulación física. Los cuerpos (círculos y cuadrados) los simula Rapier en un Web
 * Worker a 60 Hz fijos; aquí solo se pintan como sprites instanciados con las transformaciones que
 * llegan por `postMessage`. Se arrastran con puntero y toque (el cuerpo persigue al puntero con
 * colisiones y gravedad reales) y con teclado: flechas = impulso, R = reiniciar. En tier alto, un
 * desenfoque de profundidad de campo suaviza los cuerpos fuera del plano de foco.
 */
export const createPhysicsExperiment: ExperimentFactory = (ctx) => {
  const group = new Group();
  const uCinematic = uniform(0);
  const uStage = uniform(vec2(300, 200));

  // Atributo por instancia: x, y, ángulo, radio (en metros). Se actualiza con cada estado del worker.
  const data = new Float32Array(BODY_COUNT * 4);
  for (let i = 0; i < BODY_COUNT; i++) {
    const s = bodyStart(i);
    data.set([s.x, s.y, 0, bodySpec(i).size], i * 4);
  }
  const attr = new InstancedBufferAttribute(data, 4);
  const body = instancedBufferAttribute(attr);

  const material = new PointsNodeMaterial({ transparent: true, depthTest: false, depthWrite: false });
  const px = uStage.x.div(WORLD_W); // píxeles por metro
  // Profundidad pseudoaleatoria por cuerpo → fuera de foco en tier alto.
  const depth = hash(instanceIndex.add(uint(7919)));
  const blur = depth.mul(0.5).mul(uCinematic);
  material.positionNode = vec3(body.x.sub(WORLD_W / 2).mul(px), body.y.sub(WORLD_H / 2).mul(px), 1);
  material.sizeNode = vec2(body.w.mul(2).mul(px).mul(float(1).add(blur.mul(0.5))));
  const tint = mix(uAccents.element(1), uAccents.element(5), hash(instanceIndex.add(uint(31))));
  material.colorNode = vec3(mix(tint, uAccent, 0.25));
  const dist = length(uv().sub(0.5));
  material.opacityNode = float(1).sub(smoothstep(float(0.5).sub(blur.add(0.04)), 0.5, dist)).mul(float(1).sub(blur.mul(0.7)));
  material.mrtNode = mrt({ glow: vec4(vec3(tint).mul(0.4).mul(uCinematic), float(0.25).mul(uCinematic)) });
  const sprite = new Sprite(material);
  sprite.count = BODY_COUNT;
  sprite.frustumCulled = false;
  sprite.position.z = 0;
  group.add(sprite);

  // Fondo del escenario: cubre la imagen estática mientras el experimento está vivo.
  const backdropMat = new MeshBasicNodeMaterial({ depthTest: false, depthWrite: false });
  backdropMat.colorNode = vec3(mix(uBg, uBorder, 0.22));
  const backdrop = new Mesh(new PlaneGeometry(1, 1), backdropMat);
  backdrop.frustumCulled = false;
  group.add(backdrop);

  // ── Worker ──────────────────────────────────────────────────────────────────────────────────────
  let worker: Worker | null = null;
  let ready = false;
  const send = (msg: ToWorker) => worker?.postMessage(msg);
  try {
    worker = new Worker(new URL("../workers/physics.worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = (event: MessageEvent<FromWorker>) => {
      const msg = event.data;
      if (msg.type === "ready") ready = true;
      else if (msg.type === "state") {
        data.set(msg.bodies);
        attr.needsUpdate = true;
        ctx.markDirty();
      }
    };
    send({ type: "init", gravity: 1, bounce: 0.45 });
  } catch {
    worker = null;
  }

  let dragIndex = -1;
  let lastParams = "";
  return {
    group,
    update(frame, twin, input, params) {
      placeOnTwin(group, twin);
      uStage.value.set(twin.rect.w, twin.rect.h);
      backdrop.scale.set(twin.rect.w, twin.rect.h, 1);
      uCinematic.value = frame.preset.cinematic ? 1 : 0;
      const key = `${params.gravity}|${params.bounce}`;
      if (key !== lastParams) {
        lastParams = key;
        send({ type: "params", gravity: Number(params.gravity ?? 1), bounce: Number(params.bounce ?? 0.45) });
      }
      if (ready && twin.visible) {
        const w = stageToWorld(input.x, input.y);
        if (input.down && dragIndex < 0 && input.inside) {
          // Recoge el cuerpo más cercano al puntero (dentro de su radio + margen).
          let best = -1;
          let bestD = Infinity;
          for (let i = 0; i < BODY_COUNT; i++) {
            const d = Math.hypot((data[i * 4] as number) - w.x, (data[i * 4 + 1] as number) - w.y);
            if (d < (data[i * 4 + 3] as number) + 0.25 && d < bestD) {
              best = i;
              bestD = d;
            }
          }
          dragIndex = best;
        }
        if (input.down && dragIndex >= 0) send({ type: "drag", index: dragIndex, x: w.x, y: w.y });
        if (!input.down && dragIndex >= 0) {
          dragIndex = -1;
          send({ type: "release" });
        }
        if (input.keyX !== 0 || input.keyY !== 0) {
          send({ type: "impulse", x: input.keyX, y: -input.keyY });
          input.keyX = 0;
          input.keyY = 0;
        }
        if (input.reset) {
          input.reset = false;
          send({ type: "reset" });
        }
      }
      // El render lo pide cada estado nuevo del worker (`markDirty`): con los cuerpos dormidos, ninguno.
      return input.down;
    },
    dispose() {
      send({ type: "stop" });
      worker?.terminate();
      worker = null;
      material.dispose();
      backdrop.geometry.dispose();
      backdropMat.dispose();
    },
  };
};
