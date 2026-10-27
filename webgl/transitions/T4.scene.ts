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
  PlaneGeometry,
} from "three/webgpu";
import { uAccents, uBg } from "../nodes/globals";
import { TSL } from "../nodes/tsl";
import type { TransitionSceneFactory } from "./state";
import { cameraZ, RING_GAP, tunnelEnvelope, tunnelRings } from "./tunnel";

const { vec3, vec4, float, uniform, uv, atan, fract, step, smoothstep, mix, clamp, abs, mrt, max, positionWorld } = TSL;

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
  /** «Ver internos» (change 08): 0 = vista normal (idéntica), 1 = código de color por empleo + regla de profundidad. */
  const uInternals = uniform(0);
  /** Posición de la cámara normalizada sobre el túnel (0 = entrada, 1 = fondo) para el marcador de la regla. */
  const uCam = uniform(0);

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
    // Internos (docs/MOTION-SPEC.md §3, T4): cada empleo con su color (acentos de fase, en el orden del
    // DOM) y la profundidad visible como atenuación; apagado, la fórmula normal sale intacta.
    const code = uAccents.element(ring.index % 7);
    material.colorNode = mix(vec3(tint), vec3(code), uInternals);
    material.opacityNode = mix(
      clamp(ticks.mul(0.25).add(0.75), 0, 1).mul(near).mul(uEnv),
      clamp(near.mul(0.65).add(0.35), 0, 1).mul(uEnv),
      uInternals,
    );
    material.mrtNode = mrt({ glow: vec4(tint.mul(near), near.mul(uEnv).mul(0.8)).mul(float(1).sub(uInternals.mul(0.5))) });
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

  // Regla de profundidad (solo con «Ver internos»): una tira vertical a la derecha con una marca por
  // anillo, del color de su empleo, y una línea blanca con la posición de la cámara.
  const SPAN = (rings.length + 1) * RING_GAP;
  const rulerMat = new MeshBasicNodeMaterial({ transparent: true, depthTest: false, depthWrite: false });
  const rv = uv().y;
  let barsColor: ReturnType<typeof vec3> = vec3(0, 0, 0);
  let barsAlpha: ReturnType<typeof float> = float(0);
  for (const ring of rings) {
    const mark = smoothstep(0.014, 0.006, abs(rv.sub(float(1).add(ring.z / SPAN)))).mul(step(0.2, uv().x)).mul(step(uv().x, 0.8));
    barsColor = barsColor.add(vec3(uAccents.element(ring.index % 7)).mul(mark));
    barsAlpha = max(barsAlpha, mark);
  }
  const camMark = smoothstep(0.012, 0.004, abs(rv.sub(float(1).sub(uCam))));
  rulerMat.colorNode = mix(mix(uBg, barsColor.div(max(barsAlpha, 0.0001)), barsAlpha), vec3(1, 1, 1), camMark);
  rulerMat.opacityNode = float(0.55).add(max(barsAlpha, camMark).mul(0.45));
  const rulerGeo = new PlaneGeometry(1, 1);
  const ruler = new Mesh(rulerGeo, rulerMat);
  ruler.frustumCulled = false;
  ruler.renderOrder = 10;
  ruler.visible = false;
  scene.add(ruler);

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
      uInternals.value = state.internals ? 1 : 0;
      uCam.value = Math.min(1, Math.max(0, -z / SPAN));
      ruler.visible = state.internals;
      if (ruler.visible) {
        // A 3 unidades de la cámara: la mitad de alto visible es 3·tan(fov/2); la tira va junto al borde derecho.
        const halfH = 3 * Math.tan((camera.fov * Math.PI) / 360);
        ruler.position.set(halfH * camera.aspect - 0.3, 0, z - 3);
        ruler.scale.set(0.22, halfH * 1.7, 1);
      }
      for (const m of meshes) m.visible = uEnv.value > 0.001;
      streaks.visible = uEnv.value > 0.001;
      return false;
    },
    dispose() {
      meshes.forEach((m) => m.geometry.dispose());
      materials.forEach((m) => m.dispose());
      streakGeo.dispose();
      streakMat.dispose();
      scene.remove(ruler);
      rulerGeo.dispose();
      rulerMat.dispose();
    },
  };
};

