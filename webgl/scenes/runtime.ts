import { Mesh, MeshBasicNodeMaterial, PlaneGeometry, Scene } from "three/webgpu";
import { createPixelCamera, fitPixelCamera } from "../core/camera";
import { sectionRange } from "../core/layout";
import { twinPosition, twins } from "../core/twins";
import type { EngineContext, SceneInstance } from "../core/types";
import { createChip, type ChipObject } from "../objects/chip";
import { chipBoot } from "../objects/chip-state";
import { uAccent } from "../nodes/globals";
import { sdRoundRect } from "../nodes/sdf";
import { TSL } from "../nodes/tsl";

const { vec2, vec3, uv, uniform, float, exp, max, clamp } = TSL;

/**
 * Escena RUNTIME: el die del chip con un núcleo por proyecto, sobre el escenario `data-twin="chip"`,
 * y un marco luminoso sobre el gemelo de la tarjeta que se enfoca o sobre la que se pasa el puntero.
 * Un núcleo se enciende cuando se activa su botón del escenario o su tarjeta (hover/foco), que son
 * la misma información: el chip es una capa visual, el contenido real está en el DOM.
 */
export const runtimeRange = () => sectionRange("runtime", "runtime", 0);

/** Slug de la tarjeta de proyecto que contiene `target`, si lo hay. */
function cardSlug(target: EventTarget | null): string | null {
  if (!(target instanceof Element)) return null;
  const card = target.closest<HTMLElement>("[data-twin^='card:']");
  return card?.dataset.twin?.slice("card:".length) ?? null;
}

export function createRuntimeScene(ctx: EngineContext): SceneInstance {
  const scene = new Scene();
  const camera = createPixelCamera();

  const stage = () => document.querySelector<HTMLElement>("[data-chip-stage]");
  const slugs = () =>
    [...document.querySelectorAll<HTMLElement>("[data-chip-stage] [data-core]")].map(
      (el) => el.dataset.core ?? "",
    );

  let chip: ChipObject | null = null;
  let chipCount = -1;
  const ensureChip = (frame: EngineContext["frame"]) => {
    const n = slugs().length;
    if (n === chipCount) return;
    if (chip) {
      scene.remove(chip.group);
      chip.dispose();
    }
    chipCount = n;
    chip = createChip(n, true);
    scene.add(chip.group);
    chip.setParticles(particlesPerCore(frame));
  };
  const particlesPerCore = (frame: EngineContext["frame"]) => {
    const budget = frame.preset.particles;
    if (budget === 0) return 0;
    const base = budget >= 200_000 ? 90 : 40;
    return frame.mobile ? Math.floor(base * 0.3) : base;
  };

  // ── Marco luminoso de la tarjeta activa (usa su gemelo DOM↔3D) ──────────────────────────────────
  const uRect = uniform(vec2(0, 0)); // centro (px, y hacia abajo)
  const uHalf = uniform(vec2(1, 1));
  const uGlow = uniform(0);
  const uView2 = uniform(vec2(1, 1));
  const frameMat = new MeshBasicNodeMaterial({ transparent: true, depthTest: false, depthWrite: false });
  {
    const px = vec2(uv().x.mul(uView2.x), float(1).sub(uv().y).mul(uView2.y));
    const d = sdRoundRect(px.sub(uRect), uHalf, float(8));
    const ring = float(1).sub(clamp(d.abs().div(1.6), 0, 1));
    const halo = exp(max(d, 0).negate().div(14)).mul(TSL.step(0, d)); // solo por fuera: el contenido de la tarjeta no se tiñe
    const a = clamp(ring.mul(0.95).add(halo.mul(0.28)), 0, 1).mul(uGlow);
    frameMat.colorNode = vec3(uAccent);
    frameMat.opacityNode = a;
  }
  const frameQuad = new Mesh(new PlaneGeometry(1, 1), frameMat);
  frameQuad.frustumCulled = false;
  frameQuad.renderOrder = 5;
  scene.add(frameQuad);

  // ── Qué proyecto está activo (hover/foco de tarjeta o de botón del escenario) ───────────────────
  let cardActive: string | null = null;
  const setCard = (slug: string | null) => {
    if (slug === cardActive) return;
    cardActive = slug;
    ctx.markDirty();
  };
  const onOver = (e: Event) => setCard(cardSlug(e.target));
  const onOut = (e: PointerEvent | FocusEvent) => {
    if (cardSlug(e.relatedTarget) === null) setCard(null);
  };
  document.addEventListener("pointerover", onOver);
  document.addEventListener("pointerout", onOut as EventListener);
  document.addEventListener("focusin", onOver);
  document.addEventListener("focusout", onOut as EventListener);

  // El botón de un núcleo (hover/foco/toque) escribe `data-active-core` en el escenario: otro frame.
  const stageObserver = new MutationObserver(() => ctx.markDirty());
  const observeStage = () => {
    const el = stage();
    if (el) stageObserver.observe(el, { attributes: true, attributeFilter: ["data-active-core"] });
  };
  observeStage();
  const release = twins.acquire();
  let glow = 0;
  let lastLit: number[] = [];

  return {
    scene,
    camera,
    emits: true,
    update(frame) {
      fitPixelCamera(camera, frame.viewW, frame.viewH);
      ensureChip(frame);
      const stageEl = stage();
      const chipTwin = twins.get("chip");
      let animating = false;

      if (chip && chipTwin) {
        chip.place(chipTwin.rect);
        chip.group.visible = chipTwin.visible;
        chip.setParticles(particlesPerCore(frame));
        chip.setBoot(chipBoot.value);
        // Activo = botón del escenario (dataset) o tarjeta bajo el puntero/foco.
        const active = stageEl?.dataset.activeCore ?? cardActive;
        const list = slugs();
        lastLit = list.map((s) => (s === active ? 1 : 0));
        chip.setTargets(lastLit);
        animating = chip.update(frame.dt) || animating;
      }

      // Marco de la tarjeta: el MISMO rectángulo que lee el gemelo en este frame.
      const active = stageEl?.dataset.activeCore ?? cardActive;
      const cardTwin = active ? twins.get(`card:${active}`) : undefined;
      const wantGlow = cardTwin?.visible ? 1 : 0;
      if (cardTwin) {
        const pos = twinPosition(cardTwin.rect);
        uRect.value.set(pos.x, -pos.y);
        uHalf.value.set(cardTwin.rect.w / 2, cardTwin.rect.h / 2);
      }
      glow += (wantGlow - glow) * Math.min(1, frame.dt * 14);
      if (Math.abs(wantGlow - glow) < 0.01) glow = wantGlow;
      else animating = true;
      uGlow.value = glow;
      uView2.value.set(frame.viewW, frame.viewH);
      frameQuad.scale.set(frame.viewW, frame.viewH, 1);
      frameQuad.position.set(frame.viewW / 2, -frame.viewH / 2, 0);
      return animating;
    },
    applyQuality() {
      /* el número de partículas se relee del preset en cada update */
    },
    debug: () => ({ cores: lastLit.length, active: lastLit.indexOf(1), card: cardActive, glow }),
    dispose() {
      stageObserver.disconnect();
      release();
      document.removeEventListener("pointerover", onOver);
      document.removeEventListener("pointerout", onOut as EventListener);
      document.removeEventListener("focusin", onOver);
      document.removeEventListener("focusout", onOut as EventListener);
      chip?.dispose();
      frameQuad.geometry.dispose();
      frameMat.dispose();
    },
  };
}
