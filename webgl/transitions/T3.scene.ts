import { BufferAttribute, BufferGeometry, Mesh, MeshBasicNodeMaterial, Scene } from "three/webgpu";
import { createPixelCamera, fitPixelCamera } from "../core/camera";
import { uAccent } from "../nodes/globals";
import { TSL } from "../nodes/tsl";
import type { TransitionSceneFactory } from "./state";
import { buildRibbons, parentIndices, type Branch } from "./ribbons";

const { vec3, vec4, float, uniform, attribute, positionLocal, smoothstep, clamp, sqrt, fract, abs, mix, mrt, max, step } = TSL;

/** Ancho de los tubos (px) y tramo de progreso en el que crece cada uno. */
const TUBE_WIDTH = 8;
const GROW = 0.32;

/**
 * Escena de T3: un solo mesh con TODAS las ramas del árbol (un draw call). Cada rama crece según el
 * progreso y su retardo; el perfil transversal da aspecto de tubo y un pulso de luz la recorre. Al
 * final (p > 0,9) los tubos se desvanecen sobre los nodos reales del DOM.
 */
export const createT3Scene: TransitionSceneFactory = (_ctx, state, tctx) => {
  const scene = new Scene();
  const camera = createPixelCamera();
  const uP = uniform(0);
  const uScroll = uniform(0);

  const rows = Array.from(tctx.root.querySelectorAll<HTMLElement>("#parser [role='treeitem']"));
  const levels = rows.map((row) => Number(row.getAttribute("aria-level") ?? 1));
  const parents = parentIndices(levels);
  const boxes = rows.map((row) => {
    const r = row.getBoundingClientRect();
    return { x: r.left + window.scrollX, y: r.top + window.scrollY + r.height / 2 };
  });
  const branches: Branch[] = [];
  parents.forEach((parent, i) => {
    if (parent < 0) return;
    const a = boxes[parent] as { x: number; y: number };
    const b = boxes[i] as { x: number; y: number };
    branches.push({ from: [a.x + 10, a.y + 8], to: [b.x - 2, b.y], delay: branches.length / Math.max(1, rows.length) * 0.5 });
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

  const material = new MeshBasicNodeMaterial({ transparent: true, depthTest: false, depthWrite: false });
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
  material.colorNode = vec3(mix(uAccent.mul(0.65), vec3(1, 1, 1), clamp(pulse.add(head).mul(0.6), 0, 1))).mul(light.mul(0.8).add(0.35));
  material.opacityNode = reached.mul(profile.mul(0.8).add(0.2)).mul(fade).mul(step(0.001, uP));
  material.mrtNode = mrt({ glow: vec4(uAccent.mul(pulse.add(head)), max(pulse, head).mul(fade)) });

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
      return false;
    },
    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
};
