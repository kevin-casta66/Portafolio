import {
  Group,
  Mesh,
  MeshBasicNodeMaterial,
  PlaneGeometry,
  PointsNodeMaterial,
  Sprite,
  Vector4,
} from "three/webgpu";
import { DIE_INSET, coreLayout } from "../chip-layout";
import { twinPosition, type TwinRect } from "../core/twins";
import { uAccent, uBg, uBorder, uText } from "../nodes/globals";
import { fillSd, gridLines, hash21, sdRoundRect, strokeSd } from "../nodes/sdf";
import { TSL, type N } from "../nodes/tsl";

const { vec2, vec3, vec4, float, uv, uniform, uniformArray, instanceIndex, mix, max, floor, fract, step, cos, sin, clamp, mrt } = TSL;

/**
 * Objeto «chip»: el die visto desde arriba con un núcleo por proyecto y, alrededor de cada núcleo,
 * un hotspot de partículas que reacciona al hover. Lo usan la escena RUNTIME y la transición T8
 * (que lo pixela hasta una malla de vértices). Todo en TSL, coordenadas en px CSS del escenario.
 */
export const MAX_CORES = 12;
const TAU = Math.PI * 2;

export interface ChipObject {
  group: Group;
  /** Coloca el chip sobre el rectángulo del escenario (px CSS de viewport). */
  place(rect: TwinRect): void;
  /** Activación 0..1 de cada núcleo (hover/foco); el resto se suaviza en `update`. */
  setTargets(targets: readonly number[]): void;
  /** Progreso de arranque 0..1: los núcleos se encienden uno a uno (T5). */
  setBoot(progress: number): void;
  /** Avanza la suavización y las partículas; devuelve `true` mientras haya algo animándose. */
  update(dt: number): boolean;
  /** Muestra u oculta las partículas (tier). */
  setParticles(perCore: number): void;
  dispose(): void;
}

export function createChip(coreCount: number, emits: boolean): ChipObject {
  const count = Math.min(MAX_CORES, coreCount);
  const group = new Group();

  const uSize = uniform(vec2(100, 50));
  const uBoot = uniform(1);
  const uPhase = uniform(0);
  const uCores = uniformArray(
    Array.from({ length: MAX_CORES }, () => new Vector4(0, 0, 1, 1)),
    "vec4",
  );
  const uLit = uniformArray(Array.from({ length: MAX_CORES }, () => 0), "float");

  // ── Die, pines y núcleos (un solo quad con shader) ─────────────────────────────────────────────
  const material = new MeshBasicNodeMaterial({ transparent: true, depthTest: false, depthWrite: false });
  const p = vec2(uv().x.sub(0.5).mul(uSize.x), float(0.5).sub(uv().y).mul(uSize.y));
  const dieHalf = vec2(uSize.x.mul(0.5 - DIE_INSET.x + 0.02), uSize.y.mul(0.5 - DIE_INSET.y + 0.02));
  const dDie = sdRoundRect(p, dieHalf, float(14));
  const substrate = mix(uBg, uBorder, 0.45);
  const dieBody = fillSd(dDie);
  const dieEdge = strokeSd(dDie, 1.5);
  const board = gridLines(p, 22, 1).mul(dieBody).mul(0.12);

  // Pines: pequeños rectángulos a lo largo del perímetro, fuera del die.
  const outside = float(1).sub(step(0, dDie.negate())); // 1 fuera del die
  const band = step(0, dDie.sub(3)).mul(step(dDie.sub(11), 0));
  const pinsH = step(fract(p.x.div(13)), 0.5).mul(step(dieHalf.y.add(1), abs2(p.y)));
  const pinsV = step(fract(p.y.div(13)), 0.5).mul(step(dieHalf.x.add(1), abs2(p.x)));
  const pins = band.mul(outside).mul(max(pinsH, pinsV)).mul(0.65);

  let coreColor: N = vec3(0, 0, 0);
  let coreAlpha: N = float(0);
  let glowSum: N = float(0);
  for (let i = 0; i < count; i++) {
    const c = uCores.element(i);
    const lit = uLit.element(i);
    const gate = clamp(uBoot.mul(count).sub(i), 0, 1); // los núcleos se encienden en secuencia
    const dCore = sdRoundRect(p.sub(vec2(c.x, c.y)), vec2(c.z, c.w), float(6));
    const body = fillSd(dCore);
    const rim = strokeSd(dCore, 1.5);
    const inner = gridLines(p.sub(vec2(c.x, c.y)), 8, 1).mul(body).mul(0.2);
    const level = lit.mul(0.72).add(0.28).mul(gate);
    const halo = TSL.exp(max(dCore, 0).negate().div(9)).mul(lit).mul(gate);
    const tint = mix(mix(uBg, uBorder, 0.3), uAccent, level);
    coreColor = mix(coreColor, tint.add(inner.mul(uAccent)), body);
    coreAlpha = max(coreAlpha, max(body, rim.mul(0.9)));
    coreColor = mix(coreColor, uAccent, rim.mul(level));
    glowSum = glowSum.add(halo);
  }
  const base = mix(substrate, uBorder, dieEdge.mul(0.7));
  const color = mix(mix(base, uAccent, pins.mul(0.5)), coreColor, coreAlpha);
  const alpha = clamp(max(max(dieBody.mul(0.96), dieEdge), pins).add(glowSum.mul(0.35)), 0, 1);
  material.colorNode = vec3(mix(color, uAccent, clamp(glowSum, 0, 1).mul(0.6)).add(board.mul(uText)));
  material.opacityNode = alpha;
  if (emits)
    material.mrtNode = mrt({ glow: vec4(uAccent.mul(glowSum.add(coreAlpha.mul(0.05))), clamp(glowSum, 0, 1)) });
  const quad = new Mesh(new PlaneGeometry(1, 1), material);
  quad.frustumCulled = false;
  group.add(quad);

  // ── Hotspots de partículas ─────────────────────────────────────────────────────────────────────
  let sprite: Sprite | null = null;
  let spriteMat: PointsNodeMaterial | null = null;
  let perCore = 0;

  const buildParticles = (n: number) => {
    if (sprite) {
      group.remove(sprite);
      spriteMat?.dispose();
      sprite = null;
      spriteMat = null;
    }
    perCore = n;
    if (n <= 0 || count === 0) return;
    const mat = new PointsNodeMaterial({ transparent: true, depthTest: false, depthWrite: false });
    const idx = instanceIndex.toFloat();
    const core = floor(idx.div(n));
    const k = idx.sub(core.mul(n));
    const coreI = core.toInt();
    const c = uCores.element(coreI);
    const lit = uLit.element(coreI);
    const s1 = hash21(vec2(k, core));
    const s2 = hash21(vec2(k.add(17), core.add(3)));
    const angle = s1.mul(TAU).add(uPhase.mul(s2.mul(0.6).add(0.5)));
    const radius = max(c.z, c.w).mul(s2.mul(0.45).add(0.8)).add(lit.mul(9).mul(sin(uPhase.mul(2).add(s1.mul(TAU)))));
    mat.positionNode = vec3(
      c.x.add(cos(angle).mul(radius)),
      c.y.negate().sub(sin(angle).mul(radius)),
      1,
    );
    mat.sizeNode = vec2(lit.mul(1.8).add(1.4));
    mat.colorNode = vec3(uAccent);
    mat.opacityNode = lit.mul(0.8).add(0.14).mul(clamp(uBoot.mul(count).sub(core), 0, 1));
    const s = new Sprite(mat);
    s.count = n * count;
    s.frustumCulled = false;
    sprite = s;
    spriteMat = mat;
    group.add(s);
  };

  const targets = Array.from({ length: MAX_CORES }, () => 0);
  const lits = Array.from({ length: MAX_CORES }, () => 0);
  let lastSize = "";

  return {
    group,
    place(rect) {
      const pos = twinPosition(rect);
      group.position.set(pos.x, pos.y, 0);
      quad.scale.set(rect.w, rect.h, 1);
      const key = `${Math.round(rect.w)}x${Math.round(rect.h)}`;
      if (key === lastSize) return;
      lastSize = key;
      uSize.value.set(rect.w, rect.h);
      const slots = coreLayout(count, rect.w / Math.max(1, rect.h));
      slots.forEach((s, i) => {
        // Centro relativo al centro del escenario, en px con y hacia abajo; semitamaño en px.
        uCores.array[i].set((s.cx - 0.5) * rect.w, (s.cy - 0.5) * rect.h, (s.w * rect.w) / 2, (s.h * rect.h) / 2);
      });
    },
    setTargets(t) {
      for (let i = 0; i < MAX_CORES; i++) targets[i] = t[i] ?? 0;
    },
    setBoot(progress) {
      uBoot.value = progress;
    },
    setParticles(n) {
      if (n !== perCore) buildParticles(n);
    },
    update(dt) {
      let busy = false;
      let peak = 0;
      for (let i = 0; i < count; i++) {
        const diff = (targets[i] as number) - (lits[i] as number);
        if (Math.abs(diff) > 0.002) {
          lits[i] = (lits[i] as number) + diff * Math.min(1, dt * 12);
          busy = true;
        } else lits[i] = targets[i] as number;
        uLit.array[i] = lits[i];
        peak = Math.max(peak, lits[i] as number);
      }
      // Las partículas solo se mueven mientras algún núcleo está activo: en reposo el chip es estático.
      if (peak > 0.02) {
        uPhase.value += dt * (0.4 + peak * 2.2);
        busy = true;
      }
      return busy;
    },
    dispose() {
      if (sprite) group.remove(sprite);
      spriteMat?.dispose();
      quad.geometry.dispose();
      material.dispose();
    },
  };
}

/** |x| como nodo (TSL `abs` se importa aquí para no repetir la desestructuración). */
function abs2(x: N): N {
  return TSL.abs(x);
}
