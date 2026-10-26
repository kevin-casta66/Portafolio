import { Scene } from "three/webgpu";
import { createPixelCamera, fitPixelCamera } from "../core/camera";
import { twins } from "../core/twins";
import { uAccents } from "../nodes/globals";
import { TSL } from "../nodes/tsl";
import { BEZEL, STAND, spectral } from "../objects/monitor";
import { createParticles } from "../objects/particles";
import { particlesFor } from "../quality";
import type { TransitionSceneFactory } from "./state";

const { vec2, vec3, vec4, float, uniform, instanceIndex, hash, uint, mix, smoothstep, clamp, sin, step, select, atan } = TSL;

const GPU_ACCENT = 5;
const TAU = Math.PI * 2;

/**
 * Escena de T9. Cada partícula es una FUNCIÓN de su índice y del progreso (sin buffers por
 * partícula): nace en un punto del campo de píxeles de la fase GPU (el rectángulo del pipeline) y
 * migra a un punto de la silueta del monitor —bisel, cuello o base— que enmarca el formulario. Su
 * color pasa del acento de GPU al gradiente espectral al aterrizar.
 */
export const createT9Scene: TransitionSceneFactory = (_ctx, state) => {
  const scene = new Scene();
  const camera = createPixelCamera();
  const uP = uniform(0);
  const uScroll = uniform(0);
  const uField = uniform(vec4(0, 0, 600, 300)); // campo de píxeles de origen (documento): x, y, w, h
  const uForm = uniform(vec4(0, 0, 600, 400)); // formulario (documento): x, y, w, h

  let system: ReturnType<typeof createParticles> | null = null;
  let built = -1;
  const release = twins.acquire();

  const build = (count: number) => {
    if (system) {
      scene.remove(system.sprite);
      system.dispose();
      system = null;
    }
    built = count;
    if (count <= 0) return;
    // Cuatro números pseudoaleatorios independientes por partícula (hash PCG de TSL sobre el índice).
    const rnd = (k: number) => hash(instanceIndex.add(uint(k * 100_003)));
    const r1 = rnd(1);
    const r2 = rnd(2);
    const r3 = rnd(3);
    const r4 = rnd(4);

    // Origen: punto aleatorio del campo de píxeles.
    const start = vec2(uField.x.add(r1.mul(uField.z)), uField.y.add(r2.mul(uField.w)));

    // Destino: 72 % bisel (perímetro del rectángulo exterior), 14 % cuello, 14 % base.
    const outerW = uForm.z.add(BEZEL * 2);
    const outerH = uForm.w.add(BEZEL * 2);
    const cx = uForm.x.add(uForm.z.mul(0.5));
    const cy = uForm.y.add(uForm.w.mul(0.5));
    const perim = outerW.add(outerH).mul(2);
    const s = r3.div(0.72).mul(perim);
    const inset = r4.mul(BEZEL);
    // Recorrido del perímetro: arriba → derecha → abajo → izquierda.
    const topEdge = vec2(cx.sub(outerW.mul(0.5)).add(s), cy.sub(outerH.mul(0.5)).add(inset));
    const rightEdge = vec2(cx.add(outerW.mul(0.5)).sub(inset), cy.sub(outerH.mul(0.5)).add(s.sub(outerW)));
    const bottomEdge = vec2(cx.add(outerW.mul(0.5)).sub(s.sub(outerW).sub(outerH)), cy.add(outerH.mul(0.5)).sub(inset));
    const leftEdge = vec2(cx.sub(outerW.mul(0.5)).add(inset), cy.add(outerH.mul(0.5)).sub(s.sub(outerW.mul(2)).sub(outerH)));
    const onRing = select(s.lessThan(outerW), topEdge, select(s.lessThan(outerW.add(outerH)), rightEdge, select(s.lessThan(outerW.mul(2).add(outerH)), bottomEdge, leftEdge)));
    const neck = vec2(cx.add(r1.sub(0.5).mul(52)), cy.add(outerH.mul(0.5)).add(r2.mul(STAND * 0.55)));
    const base = vec2(cx.add(r1.sub(0.5).mul(172)), cy.add(outerH.mul(0.5)).add(STAND * 0.62).add(r2.mul(STAND * 0.34)));
    const group = r3;
    const target = select(group.lessThan(0.72), onRing, select(group.lessThan(0.86), neck, base));

    // Movimiento: cada partícula sale en su momento y viaja con un arco; es función pura del progreso.
    const delay = r4.mul(0.32);
    const rel = clamp(uP.sub(delay).div(0.58), 0, 1);
    const e = rel.mul(rel).mul(float(3).sub(rel.mul(2)));
    const swirl = vec2(r1.sub(0.5), r2.sub(0.5)).mul(sin(rel.mul(Math.PI))).mul(220);
    const doc = mix(start, target, e).add(swirl);
    const view = vec2(doc.x, doc.y.sub(uScroll));

    const angle = atan(target.y.sub(cy), target.x.sub(cx)).div(TAU).add(0.5);
    const color = mix(vec3(uAccents.element(GPU_ACCENT)), spectral(angle), smoothstep(0.55, 1, rel));
    const alive = smoothstep(0, 0.03, uP.sub(delay)).mul(float(1).sub(smoothstep(0.93, 1, uP)));
    const landed = step(0.999, rel);
    const front = float(1).sub(smoothstep(0, 0.18, rel)).mul(alive).add(landed.mul(alive).mul(0.25));

    system = createParticles(count, {
      position: vec3(view.x, view.y.negate(), 0),
      size: vec2(r3.mul(0.0).add(1.9), 1.9),
      color,
      opacity: alive.mul(0.9),
      glow: vec4(color.mul(front), front.mul(0.7)),
    });
    scene.add(system.sprite);
  };

  return {
    scene,
    camera,
    emits: true,
    update(frame) {
      fitPixelCamera(camera, frame.viewW, frame.viewH);
      const want = particlesFor(frame.tier, frame.mobile);
      if (want !== built) build(want);
      const field = twins.get("pipeline");
      const form = twins.get("monitor");
      if (field) uField.value.set(field.rect.x, field.rect.y + frame.scrollY, field.rect.w, field.rect.h);
      if (form) uForm.value.set(form.rect.x, form.rect.y + frame.scrollY, form.rect.w, form.rect.h);
      uP.value = state.p;
      uScroll.value = frame.scrollY;
      return false;
    },
    applyQuality() {
      built = -1;
    },
    dispose() {
      release();
      if (system) {
        scene.remove(system.sprite);
        system.dispose();
      }
    },
  };
};
