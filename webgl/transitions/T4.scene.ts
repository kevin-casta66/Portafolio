import {
  Mesh,
  MeshBasicNodeMaterial,
  PerspectiveCamera,
  RingGeometry,
  Scene,
  BufferAttribute,
  BufferGeometry,
  LineSegments,
  LineBasicNodeMaterial,
  DoubleSide,
} from "three/webgpu";
import { uAccents } from "../nodes/globals";
import { TSL } from "../nodes/tsl";
import type { TransitionSceneFactory } from "./state";
import { cameraZ, tunnelEnvelope, tunnelRings } from "./tunnel";

const { vec3, vec4, float, uniform, uv, atan, fract, step, smoothstep, mix, clamp, abs, mrt, positionWorld } = TSL;

/** z de la cámara como uniform (los materiales atenúan por distancia a ella). */
const uniformZ = uniform(0);

const BYTECODE_ACCENT = 3;
const RUNTIME_ACCENT = 4;
const STREAKS = 28;

/**
 * Escena de T4: túnel infinito. Cada empleo es un anillo (con marcas tipo bus de datos) a una
 * profundidad creciente; la cámara perspectiva avanza con el progreso del scroll y atraviesa los
 * anillos en el orden del DOM. Unas líneas longitudinales dan la sensación de túnel. Una envolvente
 * de opacidad lo hace aparecer y desaparecer sin cortes.
 */
export const createT4Scene: TransitionSceneFactory = (_ctx, state, tctx) => {
  const scene = new Scene();
  const camera = new PerspectiveCamera(58, 1, 0.1, 120);
  const uEnv = uniform(0);

  const ids = Array.from(tctx.root.querySelectorAll<HTMLElement>("#bytecode li[data-anim='function']")).map(
    (el) => el.dataset.stageId ?? "",
  );
  const rings = tunnelRings(ids);
  const materials: MeshBasicNodeMaterial[] = [];
  const meshes: Mesh[] = [];

  for (const ring of rings) {
    const material = new MeshBasicNodeMaterial({ transparent: true, depthTest: false, depthWrite: false, side: DoubleSide });
    const angle = atan(uv().y.sub(0.5), uv().x.sub(0.5)).div(Math.PI * 2).add(0.5);
    const ticks = step(0.55, fract(angle.mul(48)));
    const tint = mix(uAccents.element(BYTECODE_ACCENT), uAccents.element(RUNTIME_ACCENT), ring.tint);
    // Brillo: el anillo es más intenso cuanto más cerca de la cámara (se calcula en el vertex stage por z).
    const near = clamp(float(1).sub(abs(positionWorld.z.sub(uniformZ.value)).mul(0.05)), 0.15, 1);
    material.colorNode = vec3(tint);
    material.opacityNode = clamp(ticks.mul(0.25).add(0.75), 0, 1).mul(near).mul(uEnv);
    material.mrtNode = mrt({ glow: vec4(tint.mul(near), near.mul(uEnv).mul(0.8)) });
    const mesh = new Mesh(new RingGeometry(1.5, 1.62, 96, 1), material);
    mesh.position.z = ring.z;
    mesh.frustumCulled = false;
    scene.add(mesh);
    materials.push(material);
    meshes.push(mesh);
  }

  // Líneas longitudinales (paredes del túnel): de la cámara al fondo, con fundido por la distancia.
  const total = (rings.length + 2) * 3;
  const verts = new Float32Array(STREAKS * 2 * 3);
  for (let i = 0; i < STREAKS; i++) {
    const a = (i / STREAKS) * Math.PI * 2;
    verts.set([Math.cos(a) * 1.56, Math.sin(a) * 1.56, 0, Math.cos(a) * 1.56, Math.sin(a) * 1.56, -total], i * 6);
  }
  const streakGeo = new BufferGeometry();
  streakGeo.setAttribute("position", new BufferAttribute(verts, 3));
  const streakMat = new LineBasicNodeMaterial({ transparent: true, depthTest: false, depthWrite: false });
  streakMat.colorNode = vec3(uAccents.element(BYTECODE_ACCENT));
  streakMat.opacityNode = smoothstep(float(total), float(0), abs(positionWorld.z.sub(uniformZ.value))).mul(0.18).mul(uEnv);
  const streaks = new LineSegments(streakGeo, streakMat);
  streaks.frustumCulled = false;
  scene.add(streaks);

  return {
    scene,
    camera,
    emits: true,
    update(frame) {
      camera.aspect = frame.viewW / Math.max(1, frame.viewH);
      camera.updateProjectionMatrix();
      const z = cameraZ(state.p, rings.length);
      camera.position.set(0, 0, z);
      uniformZ.value = z;
      uEnv.value = tunnelEnvelope(state.p);
      for (const m of meshes) m.visible = uEnv.value > 0.001;
      streaks.visible = uEnv.value > 0.001;
      return false;
    },
    dispose() {
      meshes.forEach((m) => m.geometry.dispose());
      materials.forEach((m) => m.dispose());
      streakGeo.dispose();
      streakMat.dispose();
    },
  };
};

