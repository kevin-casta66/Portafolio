import { BufferAttribute, BufferGeometry, Mesh, MeshBasicNodeMaterial, Scene } from "three/webgpu";
import { createPixelCamera, fitPixelCamera } from "../core/camera";
import { uAccent } from "../nodes/globals";
import { TSL } from "../nodes/tsl";
import { prototypeMode, type TransitionSceneFactory } from "./state";
import { buildRibbons, parentIndices, type Branch } from "./ribbons";

const {
  vec3,
  vec4,
  float,
  uniform,
  attribute,
  positionLocal,
  smoothstep,
  clamp,
  sqrt,
  fract,
  abs,
  mix,
  mrt,
  max,
  step,
} = TSL;

/** Ancho de los tubos (px) y tramo de progreso en el que crece cada uno. */
const TUBE_WIDTH = 8;
const GROW = 0.32;

/**
 * Escena de T3 para los escenarios de /motion y /prototypes: un solo mesh con TODAS las ramas del
 * árbol (un draw call). Cada rama sale del borde derecho de su padre (sin cruzar el rótulo), crece
 * según el progreso y su retardo, y un pulso de luz la recorre; al final (p > 0,9) se desvanece sobre
 * los nodos reales. En la página no dibuja: los tubos persistentes son la escena de fase PARSER.
 */
export const createT3Scene: TransitionSceneFactory = (_ctx, state, tctx) => {
  const scene = new Scene();
  const camera = createPixelCamera();
  const uP = uniform(0);
  const uScroll = uniform(0);
  /** «Ver internos» (change 08): 0 = vista normal (idéntica), 1 = curva de cada rama + mapa del pulso. */
  const uInternals = uniform(0);

  // En la página los tubos del árbol son la escena de fase PARSER (`webgl/scenes/parser.ts`), que
  // crece con el scroll y permanece; esta escena solo dibuja en los escenarios de /motion y
  // /prototypes (`prototypeMode`), donde la transición se recorre con el tiempo y no con el scroll.
  const rows = prototypeMode.active
    ? Array.from(tctx.root.querySelectorAll<HTMLElement>("#parser [role='treeitem']"))
    : [];
  const levels = rows.map((row) => Number(row.getAttribute("aria-level") ?? 1));
  const parents = parentIndices(levels);
  const boxes = rows.map((row) => {
    const r = row.getBoundingClientRect();
    const left = r.left + window.scrollX;
    // Ancho sin transformar: la fila puede estar aún encogida por su revelado (escala 0,85).
    return { left, right: left + row.offsetWidth, y: r.top + window.scrollY + r.height / 2 };
  });
  const branches: Branch[] = [];
  parents.forEach((parent, i) => {
    if (parent < 0) return;
    const a = boxes[parent] as (typeof boxes)[number];
    const b = boxes[i] as (typeof boxes)[number];
    // Del borde derecho del padre al izquierdo del hijo: el tubo va por el hueco entre columnas.
    branches.push({
      from: [a.right + 2, a.y],
      to: [b.left - 2, b.y],
      delay: (branches.length / Math.max(1, rows.length)) * 0.5,
    });
  });

  const ribbons = buildRibbons(branches, 24, TUBE_WIDTH);
  const geometry = new BufferGeometry();
  const pos3 = new Float32Array(ribbons.vertexCount * 3);
  for (let i = 0; i < ribbons.vertexCount; i++) {
    pos3[i * 3] = ribbons.positions[i * 2] as number;
    pos3[i * 3 + 1] = ribbons.positions[i * 2 + 1] as number;
  }
  geometry.setAttribute("position", new BufferAttribute(pos3, 3));
  geometry.setAttribute("params", new BufferAttribute(ribbons.params, 4));
  geometry.setIndex(new BufferAttribute(ribbons.indices, 1));

  const material = new MeshBasicNodeMaterial({
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });
  const params = attribute("params", "vec4");
  const u = params.x;
  const v = params.y;
  const delay = params.z;
  // Posición de documento → viewport (y hacia arriba en el mundo del motor).
  material.positionNode = vec3(positionLocal.x, positionLocal.y.sub(uScroll).negate(), 0);

  const grow = clamp(uP.sub(delay).div(GROW), 0, 1);
  const reached = step(u, grow); // la rama ya llegó hasta este punto
  const head = smoothstep(0.12, 0, abs(u.sub(grow))).mul(step(0.001, grow)); // brillo en la punta que crece
  const profile = sqrt(clamp(float(1).sub(v.mul(v)), 0, 1)); // sección circular: aspecto de tubo
  const pulse = smoothstep(0.1, 0, abs(u.sub(fract(uP.mul(3.2).add(delay.mul(2)))))).mul(reached);
  const fade = float(1).sub(smoothstep(0.88, 0.99, uP));
  const light = profile.mul(0.7).add(pulse.mul(0.9)).add(head.mul(0.8));
  const normalColor = vec3(
    mix(uAccent.mul(0.65), vec3(1, 1, 1), clamp(pulse.add(head).mul(0.6), 0, 1)),
  ).mul(light.mul(0.8).add(0.35));
  const normalOpacity = reached.mul(profile.mul(0.8).add(0.2)).mul(fade).mul(step(0.001, uP));
  // Internos (docs/MOTION-SPEC.md §3, T3): la CURVA de cada rama como línea central blanca (visible
  // también antes de crecer) y el MAPA DE INTENSIDAD del pulso a lo largo del tubo: del acento tenue
  // al blanco según lo que ilumina el pulso y la punta.
  const intensity = clamp(pulse.add(head), 0, 1);
  const centerline = smoothstep(0.2, 0.08, abs(v));
  const internalsColor = mix(
    mix(uAccent.mul(0.3), uAccent, intensity),
    vec3(1, 1, 1),
    max(centerline.mul(0.9), intensity.mul(intensity)),
  );
  const internalsOpacity = reached.mul(0.65).add(0.3).mul(fade);
  material.colorNode = mix(normalColor, internalsColor, uInternals);
  material.opacityNode = mix(normalOpacity, internalsOpacity, uInternals);
  material.mrtNode = mrt({
    glow: vec4(uAccent.mul(pulse.add(head)), max(pulse, head).mul(fade)).mul(
      float(1).sub(uInternals.mul(0.6)),
    ),
  });

  const mesh = new Mesh(geometry, material);
  mesh.frustumCulled = false;
  scene.add(mesh);

  return {
    scene,
    camera,
    emits: true,
    update(frame) {
      fitPixelCamera(camera, frame.viewW, frame.viewH);
      uP.value = state.p;
      uScroll.value = frame.scrollY;
      uInternals.value = state.internals ? 1 : 0;
      return false;
    },
    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
};
