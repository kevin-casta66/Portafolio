import { OrthographicCamera, Scene } from "three/webgpu";
import { canvasState } from "@/motion/shared";
import { landOnBar } from "@/motion/audio-sync";
import { onPhaseChange } from "@/motion/phase-state";
import { layout } from "../core/layout";
import type { EngineContext, SceneInstance } from "../core/types";
import { loadMsdfFont, type MsdfFont } from "../text/msdf-font";
import { setTitleInternals, TitleText, titleInternals } from "../text/title-text";
import { transitionStates, type TransitionState } from "../transitions/state";
import { TEXT_MARGIN as MARGIN } from "./text-ranges";

/**
 * Capa de texto MSDF (change 04): un gemelo 3D por título marcado con `data-msdf`. Mientras el
 * gemelo está activo el título DOM se hace transparente (sigue ahí, accesible y con su foco); si el
 * atlas no carga o falta un glifo, el DOM se ve como siempre. También hace el glitch T11 de los
 * títulos en cada cambio de fase y en la 404.
 */
export async function createTextScene(ctx: EngineContext): Promise<SceneInstance> {
  const font: MsdfFont = await loadMsdfFont("unbounded-600");
  const scene = new Scene();
  const camera = new OrthographicCamera(0, 1, 0, -1, -10, 10);
  const titles = new Map<HTMLElement, TitleText>();
  let lastScan = -1;
  let scanRequested = true;

  const mo = new MutationObserver(() => {
    scanRequested = true;
  });
  mo.observe(document.body, { childList: true, subtree: true });

  const scan = () => {
    scanRequested = false;
    lastScan = layout.version;
    const live = new Set(document.querySelectorAll<HTMLElement>("[data-msdf]"));
    for (const [el, title] of titles) {
      if (!live.has(el)) {
        scene.remove(title.group);
        title.dispose();
        titles.delete(el);
      }
    }
    for (const el of live) {
      if (titles.has(el)) continue;
      const title = new TitleText(el, font, ctx.colors());
      titles.set(el, title);
      scene.add(title.group);
    }
  };

  /** Glitch de un título por el canvas; `false` si no tiene gemelo activo (→ glitch DOM). */
  const glitchByCanvas = (el: HTMLElement, speed = 1): boolean => {
    if (scanRequested || lastScan !== layout.version) scan();
    const title = titles.get(el);
    // El título puede estar entrando en pantalla en este mismo frame: basta con que su gemelo se
    // pueda construir (todos los glifos en el atlas); el siguiente update lo cubre y anima.
    if (!title || !title.sync(layout.version)) return false;
    // Solo títulos en pantalla (un cambio de fase rápido no deja glitches pendientes fuera de vista).
    const r = el.getBoundingClientRect();
    if (r.bottom < 0 || r.top > window.innerHeight) return false;
    title.glitch(performance.now(), speed);
    ctx.markDirty();
    return true;
  };
  canvasState.glitch = glitchByCanvas;
  titleInternals.invalidate = () => ctx.markDirty();
  // T11 SDF no es una variante de scroll: se registra como «estado vivo» con el mismo contrato que las
  // demás transiciones, así `setTransitionInternals("T11", on)` enciende «Ver internos» de los títulos.
  const t11State: TransitionState = {
    p: 0,
    get internals() {
      return titleInternals.on;
    },
    set internals(on: boolean) {
      setTitleInternals(on);
    },
  };
  transitionStates.set("T11", t11State);
  const stopPhase = onPhaseChange((phase) => {
    if (ctx.frame.reduced) return;
    const el = document.getElementById(`${phase}-title`);
    if (el) landOnBar(() => glitchByCanvas(el)); // con audio activo, cae en el primer tiempo del compás
  });

  return {
    scene,
    camera,
    // El texto MSDF siempre a resolución completa: nítido en cualquier tier y densidad.
    resolutionScale: 1,
    update(frame) {
      if (scanRequested || lastScan !== layout.version) scan();
      camera.right = frame.viewW;
      camera.bottom = -frame.viewH;
      camera.updateProjectionMatrix();
      const now = performance.now();
      let animating = false;
      for (const [el, title] of titles) {
        const rect = el.getBoundingClientRect();
        const onScreen = rect.bottom > -MARGIN && rect.top < frame.viewH + MARGIN;
        title.group.visible = onScreen;
        if (!onScreen) {
          title.setCovered(false);
          title.stopGlitch();
          continue;
        }
        const ok = title.sync(layout.version);
        title.group.visible = ok;
        title.setCovered(ok);
        // La opacidad efectiva incluye la del contenedor (revelado nativo por scroll del encabezado).
        const parent = el.parentElement;
        const opacity = parent ? Number.parseFloat(getComputedStyle(parent).opacity) : 1;
        animating = title.update(now, Number.isFinite(opacity) ? opacity : 1) || animating;
      }
      return animating;
    },
    debug: () => ({ glitching: [...titles.values()].some((t) => t.glitching), covered: [...titles.values()].filter((t) => t.el.classList.contains("msdf-covered")).length, titles: titles.size }),
    applyColors(colors) {
      titles.forEach((t) => t.applyColors(colors));
    },
    resize() {
      scanRequested = true;
    },
    dispose() {
      if (canvasState.glitch === glitchByCanvas) canvasState.glitch = null;
      titleInternals.invalidate = null;
      if (transitionStates.get("T11") === t11State) transitionStates.delete("T11");
      stopPhase();
      mo.disconnect();
      titles.forEach((t) => t.dispose());
      titles.clear();
      font.dispose();
    },
  };
}
