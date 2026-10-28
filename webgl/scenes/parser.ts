import { BufferAttribute, BufferGeometry, Mesh, MeshBasicNodeMaterial, Scene } from "three/webgpu";
import { APPEAR } from "@/motion/choreography/tree-reveal";
import { createPixelCamera, fitPixelCamera } from "../core/camera";
import type { SceneFactory } from "../core/types";
import { uAccent } from "../nodes/globals";
import { TSL } from "../nodes/tsl";
import { parentIndices } from "../transitions/ribbons";
import { buildPathRibbons, treePaths, type TreeNode } from "./tree-paths";

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

/** Ancho de los tubos (px) y radio de sus codos. */
const TUBE_WIDTH = 6;
const ELBOW_RADIUS = 10;
/** Recorrido de scroll (px) en el que crece una derivación: termina justo cuando su nodo aparece. */
const LEAD_PX = 90;
/** Suavizado (px) del frente por el que avanzan troncos y tramos. */
const SOFT_PX = 12;

/**
 * PARSER · tubos iluminados de TODO el árbol de habilidades (escena de fase, un draw call). El
 * trazado (`tree-paths.ts`) es el del propio árbol: un tronco recto por grupo sobre su línea, y un
 * codo de cuarto de círculo idéntico hacia cada tecnología. Crecen con el scroll al ritmo del árbol
 * DOM (`buildTreeGrowth`): los troncos avanzan con el frente de aparición y cada derivación llega a su
 * nodo cuando la fila de este alcanza `APPEAR` de la ventana. Todo se calcula en el shader a partir
 * del scroll: sin trabajo por frame en JS ni frames continuos (el pulso de luz también avanza con el
 * scroll). Se dibuja a resolución completa (`resolutionScale: 1`): son trazos finos y con escalado se
 * verían pixelados. Plegar o desplegar una rama, o arrastrar el árbol, reconstruye la geometría.
 */
export const createParserScene: SceneFactory = (ctx) => {
  const scene = new Scene();
  const camera = createPixelCamera();
  const uScroll = uniform(0);
  const uView = uniform(1);
  const uShiftX = uniform(0);

  const material = new MeshBasicNodeMaterial({
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });
  const params = attribute("params", "vec4");
  const u = params.x;
  const v = params.y;
  const gate = params.z; // −1: revelado por frente · ≥ 0: y del hijo de la derivación
  const docY = params.w;
  material.positionNode = vec3(
    positionLocal.x.sub(uShiftX),
    positionLocal.y.sub(uScroll).negate(),
    0,
  );

  const front = uView.mul(APPEAR).add(LEAD_PX);
  // Troncos y tramos: visibles hasta el frente, con borde suave.
  const byFront = clamp(front.sub(docY.sub(uScroll)).div(SOFT_PX), 0, 1);
  // Derivaciones: crecen a lo largo (u) al acercarse su hijo a la línea de aparición.
  const grow = clamp(front.sub(gate.sub(uScroll)).div(LEAD_PX), 0, 1);
  const byGrow = clamp(grow.sub(u).mul(25), 0, 1);
  const isBranch = step(0, gate);
  const reached = mix(byFront, byGrow, isBranch);
  const head = mix(
    smoothstep(SOFT_PX * 3, 0, abs(front.sub(docY.sub(uScroll)))),
    smoothstep(0.15, 0, abs(u.sub(grow))).mul(step(grow, 0.999)),
    isBranch,
  ).mul(reached);

  const profile = sqrt(clamp(float(1).sub(v.mul(v)), 0, 1)); // sección circular: aspecto de tubo
  const edge = smoothstep(1, 0.6, abs(v)); // borde antialias
  const pulse = smoothstep(0.08, 0, abs(u.sub(fract(uScroll.div(900).add(docY.mul(0.0013)))))).mul(
    reached,
  );
  const light = profile.mul(0.75).add(pulse.mul(0.7)).add(head.mul(0.6));
  material.colorNode = vec3(
    mix(uAccent.mul(0.7), vec3(1, 1, 1), clamp(pulse.add(head).mul(0.5), 0, 1)),
  ).mul(light.mul(0.8).add(0.3));
  material.opacityNode = reached.mul(edge).mul(profile.mul(0.7).add(0.3));
  material.mrtNode = mrt({
    glow: vec4(uAccent.mul(pulse.add(head).mul(0.8)), max(pulse, head).mul(0.8)),
  });

  let mesh: Mesh | null = null;
  const tree = document.querySelector<HTMLElement>("#parser [role='tree']");

  const rebuild = () => {
    if (mesh) {
      scene.remove(mesh);
      mesh.geometry.dispose();
      mesh = null;
    }
    if (!tree) return;
    const rows = Array.from(tree.querySelectorAll<HTMLElement>("[role='treeitem']"));
    const parents = parentIndices(rows.map((row) => Number(row.getAttribute("aria-level") ?? 1)));
    const shiftX = window.scrollX + tree.scrollLeft;
    const nodes: TreeNode[] = rows.map((row, i) => {
      const r = row.getBoundingClientRect();
      // Medidas sin transformar (la fila puede estar encogida por su revelado) y sin el arrastre.
      const left = r.left + shiftX;
      const group = row.closest("li")?.querySelector<HTMLElement>(":scope > [role='group']");
      return {
        left,
        right: left + row.offsetWidth,
        y: r.top + window.scrollY + row.offsetHeight / 2,
        parent: parents[i] as number,
        groupX: group ? group.getBoundingClientRect().left + shiftX + 0.5 : undefined,
      };
    });
    const paths = treePaths(nodes, ELBOW_RADIUS);
    if (paths.length === 0) return;
    const ribbons = buildPathRibbons(paths, TUBE_WIDTH);
    const geometry = new BufferGeometry();
    const pos3 = new Float32Array(ribbons.vertexCount * 3);
    for (let i = 0; i < ribbons.vertexCount; i++) {
      pos3[i * 3] = ribbons.positions[i * 2] as number;
      pos3[i * 3 + 1] = ribbons.positions[i * 2 + 1] as number;
    }
    geometry.setAttribute("position", new BufferAttribute(pos3, 3));
    geometry.setAttribute("params", new BufferAttribute(ribbons.params, 4));
    geometry.setIndex(new BufferAttribute(ribbons.indices, 1));
    mesh = new Mesh(geometry, material);
    mesh.frustumCulled = false;
    scene.add(mesh);
    ctx.markDirty();
  };

  let pending: ReturnType<typeof setTimeout> | undefined;
  const schedule = () => {
    // Agrupa ráfagas (el plegado dispara varias medidas): un solo rebuild al asentarse.
    clearTimeout(pending);
    pending = setTimeout(rebuild, 60);
  };
  rebuild();
  // Plegar/desplegar cambia el tamaño del árbol; las fuentes o el viewport, la posición de sus filas.
  const observer = new ResizeObserver(schedule);
  if (tree) observer.observe(tree);
  const onDrag = () => ctx.markDirty();
  tree?.addEventListener("scroll", onDrag, { passive: true });

  return {
    scene,
    camera,
    emits: true,
    resolutionScale: 1,
    update(frame) {
      fitPixelCamera(camera, frame.viewW, frame.viewH);
      uScroll.value = frame.scrollY;
      uView.value = frame.viewH;
      uShiftX.value = tree?.scrollLeft ?? 0;
      return false;
    },
    resize: schedule,
    debug: () => ({ tubes: mesh ? 1 : 0 }),
    dispose() {
      clearTimeout(pending);
      observer.disconnect();
      tree?.removeEventListener("scroll", onDrag);
      mesh?.geometry.dispose();
      material.dispose();
    },
  };
};
