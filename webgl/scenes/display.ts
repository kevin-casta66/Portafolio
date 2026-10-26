import { Mesh, MeshBasicNodeMaterial, PlaneGeometry, Scene } from "three/webgpu";
import { createPixelCamera, fitPixelCamera } from "../core/camera";
import { sectionRange } from "../core/layout";
import { twinPosition, twins } from "../core/twins";
import type { SceneInstance } from "../core/types";
import { BEZEL, MONITOR_PAD, monitorNodes } from "../objects/monitor";
import { monitorAssembly } from "../objects/monitor-state";
import { TSL } from "../nodes/tsl";

const { vec2, vec3, vec4, float, uv, uniform, mix, clamp, mrt } = TSL;

/**
 * Escena DISPLAY: la silueta de un monitor con el gradiente espectral enmarca el formulario de
 * contacto (gemelo `data-twin="monitor"`). El interior queda transparente y el canvas no recibe
 * eventos, así que todos los campos siguen siendo operables con ratón, teclado y táctil.
 */
export const displayRange = () => sectionRange("display", "display", 0);

export function createDisplayScene(): SceneInstance {
  const scene = new Scene();
  const camera = createPixelCamera();
  const uHalf = uniform(vec2(100, 100));
  const uFull = uniform(vec2(120, 220)); // tamaño total del quad (formulario + márgenes)
  const uAssemble = uniform(1);

  const material = new MeshBasicNodeMaterial({ transparent: true, depthTest: false, depthWrite: false });
  // Centro del formulario relativo al quad: el quad añade bisel por los lados y arriba, y bisel + peana abajo.
  const q = vec2(uv().x.sub(0.5).mul(uFull.x), float(0.5).sub(uv().y).mul(uFull.y));
  const p = q.add(vec2(0, (MONITOR_PAD.bottom - MONITOR_PAD.top) / 2));
  const m = monitorNodes(p, uHalf);
  const bodyColor = mix(m.bodyColor, m.edgeColor, m.edge.mul(0.9));
  material.colorNode = vec3(bodyColor);
  material.opacityNode = clamp(m.body.mul(0.9).add(m.edge.mul(0.9)), 0, 1).mul(uAssemble);
  material.mrtNode = mrt({ glow: vec4(m.edgeColor.mul(m.edge), m.edge.mul(uAssemble).mul(0.8)) });

  const quad = new Mesh(new PlaneGeometry(1, 1), material);
  quad.frustumCulled = false;
  scene.add(quad);
  const release = twins.acquire();

  return {
    scene,
    camera,
    emits: true,
    update(frame) {
      fitPixelCamera(camera, frame.viewW, frame.viewH);
      const twin = twins.get("monitor");
      if (!twin) {
        quad.visible = false;
        return false;
      }
      quad.visible = twin.visible;
      const { w, h } = twin.rect;
      const padW = (BEZEL + 6) * 2; // margen extra para el contorno y el brillo
      const padH = MONITOR_PAD.top + MONITOR_PAD.bottom + 12;
      const fullW = w + padW;
      const fullH = h + padH;
      // El quad se centra en el centro del formulario desplazado por la peana.
      const pos = twinPosition(twin.rect);
      quad.position.set(pos.x, pos.y - (MONITOR_PAD.bottom - MONITOR_PAD.top) / 2, 0);
      quad.scale.set(fullW, fullH, 1);
      uFull.value.set(fullW, fullH);
      uHalf.value.set(w / 2, h / 2);
      uAssemble.value = monitorAssembly.value;
      return false;
    },
    dispose() {
      release();
      quad.geometry.dispose();
      material.dispose();
    },
  };
}
