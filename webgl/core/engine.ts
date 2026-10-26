import { Color, RenderPipeline, type WebGPURenderer } from "three/webgpu";
import { appStore } from "@/lib/store";
import { PHASES } from "@/motion/phase";
import { phaseState } from "@/motion/phase-state";
import { prefersReducedMotion } from "@/motion/reduced";
import { velocity } from "@/motion/velocity";
import { effectiveDpr } from "../rt-size";
import { PRESETS, createFpsMonitor, stepTierDown, type QualityPreset, type Tier } from "../quality";
import { buildOutput, type LayerTextures } from "../postfx";
import { TSL, type N } from "../nodes/tsl";
import {
  uAccent,
  uAccents,
  uBg,
  uBorder,
  uChroma,
  uKeyword,
  uPointer,
  uScrollVelocity,
  uString,
  uText,
  uTime,
  uType,
  uView,
} from "../nodes/globals";
import { backendOf } from "./backend";
import { accentRgb, readTokenColors, type TokenColors } from "./color";
import { frame } from "./frame";
import { twins } from "./twins";
import { layout, measureLayout, watchLayout, type Range } from "./layout";
import type { EngineContext, SceneDef, SceneInstance } from "./types";

/** ¿El viewport [top, bottom] (con margen) toca alguno de los rangos? */
export function overlaps(
  range: Range | Range[] | null,
  top: number,
  bottom: number,
  margin: number,
): boolean {
  if (!range) return false;
  const list = Array.isArray(range) ? range : [range];
  return list.some((r) => top < r.end + margin && bottom > r.start - margin);
}

/** Tiempo que una escena fuera de rango conserva sus recursos antes de liberarlos. */
export const RELEASE_MS = 3000;
/** Duración del pulso de aberración al cambiar de fase (< 300 ms exigidos). */
export const CHROMA_PULSE_MS = 240;

interface DefState {
  def: SceneDef;
  instance: SceneInstance | null;
  loading: boolean;
  failed: boolean;
  /** Última vez (ms) que la escena estuvo dentro de su rango. */
  lastInRange: number;
  animating: boolean;
}

export interface EngineStats {
  drawCalls: number;
  frames: number;
  fps: number;
  geometries: number;
  textures: number;
  /** Draw calls estimados por escena (objetos visibles que dibujan). */
  perScene: Record<string, number>;
}

export interface EngineOptions {
  /** El dispositivo gráfico se perdió (WebGPU `device.lost` / `webglcontextlost`). */
  onLost?: (reason: string) => void;
  /** Mensaje de error de render no recuperable. */
  onError?: (error: unknown) => void;
}

const lin = (rgb: [number, number, number]) => new Color().setRGB(rgb[0], rgb[1], rgb[2], "srgb");

/**
 * Motor 3D: UN renderer, UN registro de escenas, UN reloj. Cada tick (suscrito al reloj único con
 * prioridad 100) decide qué escenas están en rango, las carga/libera, las actualiza y renderiza la
 * composición con el `RenderPipeline`. Si nada cambió (scroll, puntero, tamaño o animación), no se
 * renderiza ningún frame.
 */
export class Engine {
  readonly pipeline: RenderPipeline;
  readonly stats: EngineStats = {
    drawCalls: 0,
    frames: 0,
    fps: 60,
    geometries: 0,
    textures: 0,
    perScene: {},
  };

  private readonly states = new Map<string, DefState>();
  private activeStates: DefState[] = [];
  private builtKey = "";
  private passes: { dispose?: () => void }[] = [];
  private colors: TokenColors;
  private dirty = true;
  private lastScroll = Number.NaN;
  private lastNow = 0;
  private readonly t0 = performance.now();
  private readonly fps = createFpsMonitor();
  private sweepTimer: ReturnType<typeof setTimeout> | undefined;
  private chromaUntil = 0;
  private disposed = false;
  private lost = false;
  private readonly cleanups: (() => void)[] = [];
  private tierLocked: Tier;
  private resizeVersion = 0;
  private readonly pointer = { x: 0, y: 0, active: false, moved: false };
  /** Marca de «hubo un cambio de fase» consumida por el pulso de aberración. */
  private lastPhase = frame.phase;

  constructor(
    readonly renderer: WebGPURenderer,
    tier: Tier,
    mobile: boolean,
    private readonly options: EngineOptions = {},
  ) {
    this.tierLocked = tier;
    frame.tier = tier;
    frame.preset = PRESETS[tier];
    frame.mobile = mobile;
    frame.gpuCompute = backendOf(renderer) === "webgpu";
    frame.reduced = prefersReducedMotion();
    this.colors = readTokenColors();
    this.applyColorUniforms();

    renderer.setClearColor(new Color(0, 0, 0), 0);
    renderer.info.autoReset = false;
    this.pipeline = new RenderPipeline(renderer);
    this.pipeline.outputNode = TSL.vec4(0, 0, 0, 0);

    renderer.onDeviceLost = (info) => {
      this.lost = true;
      this.options.onLost?.(info.message ?? info.reason ?? "device lost");
    };

    this.cleanups.push(
      watchLayout(() => {
        this.resizeVersion++;
        this.dirty = true;
      }),
    );
    this.listen();
    this.resize();
  }

  // ── Registro ──────────────────────────────────────────────────────────────

  register(def: SceneDef): () => void {
    this.states.set(def.id, {
      def,
      instance: null,
      loading: false,
      failed: false,
      lastInRange: -Infinity,
      animating: false,
    });
    this.dirty = true;
    return () => this.unregister(def.id);
  }

  unregister(id: string): void {
    const st = this.states.get(id);
    if (!st) return;
    this.releaseState(st);
    this.states.delete(id);
    this.dirty = true;
  }

  get tier(): Tier {
    return this.tierLocked;
  }

  /** Cambia el tier en caliente (también lo usa el monitor de FPS): sin recargar ni perder el scroll. */
  setTier(tier: Tier): void {
    if (tier === this.tierLocked) return;
    this.tierLocked = tier;
    frame.tier = tier;
    frame.preset = PRESETS[tier];
    for (const st of this.states.values()) st.instance?.applyQuality?.(frame.preset);
    this.builtKey = ""; // fuerza la reconstrucción de la cadena (bloom, grano, resolución)
    this.dirty = true;
    appStore.getState().setTier(tier);
  }

  /** Releer los tokens (cambio de tema). */
  refreshColors(): void {
    this.colors = readTokenColors();
    this.applyColorUniforms();
    for (const st of this.states.values()) st.instance?.applyColors?.(this.colors);
    this.dirty = true;
  }

  markDirty(): void {
    this.dirty = true;
  }

  /** Pulso de aberración cromática (cambio de fase): intensidad que decae en < 300 ms. */
  pulseChroma(now = performance.now()): void {
    this.chromaUntil = now + CHROMA_PULSE_MS;
    this.dirty = true;
  }

  // ── Bucle ─────────────────────────────────────────────────────────────────

  needsFrame(): boolean {
    if (this.disposed || this.lost) return false;
    if (document.hidden) return false;
    if (this.dirty || this.pointer.moved) return true;
    if (window.scrollY !== this.lastScroll) return true;
    if (performance.now() < this.chromaUntil) return true;
    // Un gemelo que se mueve solo (animación FLIP de las tarjetas, cambio de layout) también pide frame.
    if (twins.active && twins.read(window.innerHeight)) return true;
    for (const st of this.states.values()) if (st.animating && st.instance) return true;
    return false;
  }

  render(nowMs: number): void {
    if (this.disposed || this.lost) return;
    const dtMs = this.lastNow === 0 ? 16 : nowMs - this.lastNow;
    this.lastNow = nowMs;

    this.readFrame(nowMs, dtMs);
    this.refreshDirtyLayout();
    twins.read(frame.viewH); // lectura de rects en lote, antes de que ninguna escena escriba nada
    const visible = this.visibleStates(nowMs);
    this.ensureLoaded(visible, nowMs);

    const active = visible
      .filter((st) => st.instance !== null)
      .sort((a, b) => a.def.order - b.def.order);
    this.activeStates = active;
    this.rebuildIfNeeded(active);

    let animating = false;
    for (const st of active) {
      const inst = st.instance as SceneInstance;
      st.animating = inst.update(frame);
      animating ||= st.animating;
      if (frame.preset.scenes3d) inst.compute?.(this.renderer, frame);
    }
    for (const st of this.states.values()) if (!active.includes(st)) st.animating = false;

    this.renderer.info.reset();
    try {
      this.pipeline.render();
    } catch (error) {
      this.options.onError?.(error);
      return;
    }

    this.dirty = false;
    this.pointer.moved = false;
    this.lastScroll = frame.scrollY;
    this.publishStats(nowMs, active);
    if (this.fps.frame(nowMs) && this.tierLocked !== "low") this.setTier(stepTierDown(this.tierLocked));
  }

  // ── Interno ───────────────────────────────────────────────────────────────

  private readFrame(nowMs: number, dtMs: number): void {
    frame.time = (nowMs - this.t0) / 1000;
    frame.dt = Math.min(0.1, Math.max(0, dtMs / 1000));
    frame.scrollY = window.scrollY;
    frame.viewW = window.innerWidth;
    frame.viewH = window.innerHeight;
    frame.dpr = effectiveDpr(window.devicePixelRatio);
    frame.velocity = velocity.value;
    frame.reduced = prefersReducedMotion();
    frame.pointer.x = this.pointer.x;
    frame.pointer.y = this.pointer.y;
    frame.pointer.active = this.pointer.active;
    frame.pointer.moved = this.pointer.moved;
    frame.phase = phaseState.phase;
    frame.phaseTo = phaseState.to;
    frame.phaseMix = phaseState.mix;

    if (frame.phase !== this.lastPhase) {
      this.lastPhase = frame.phase;
      if (!frame.reduced) this.pulseChroma(nowMs);
    }

    uTime.value = frame.time;
    uScrollVelocity.value = frame.reduced ? 0 : frame.velocity;
    const pulse = Math.max(0, (this.chromaUntil - nowMs) / CHROMA_PULSE_MS);
    // Velocidad ACOTADA (≤ 0,35): el texto nunca pierde legibilidad por la aberración del scroll.
    uChroma.value = frame.reduced ? 0 : Math.min(1, pulse + Math.min(0.35, Math.abs(frame.velocity) * 0.35));
    uPointer.value.set(frame.pointer.x, frame.pointer.y);
    uView.value.set(frame.viewW, frame.viewH);
    uAccent.value.copy(lin(accentRgb(this.colors, frame.phase, frame.phaseTo, frame.phaseMix)));
  }

  private applyColorUniforms(): void {
    uBg.value.copy(lin(this.colors.bg));
    uText.value.copy(lin(this.colors.text));
    uBorder.value.copy(lin(this.colors.border));
    uKeyword.value.copy(lin(this.colors.keyword));
    uType.value.copy(lin(this.colors.type));
    uString.value.copy(lin(this.colors.string));
    PHASES.forEach((phase, i) => (uAccents.array[i] as Color).copy(lin(this.colors.accents[phase])));
  }

  private lastStatsPush = 0;
  private lastLayoutVersion = -1;
  private refreshDirtyLayout(): void {
    if (this.lastLayoutVersion !== layout.version) {
      this.lastLayoutVersion = layout.version;
      for (const st of this.states.values())
        st.instance?.resize?.(window.innerWidth, window.innerHeight);
    }
  }

  private resize(): void {
    measureLayout();
  }

  private visibleStates(nowMs: number): DefState[] {
    const top = window.scrollY;
    const bottom = top + window.innerHeight;
    const out: DefState[] = [];
    for (const st of this.states.values()) {
      if (st.def.enabled && !st.def.enabled(frame.preset, frame)) continue;
      if (overlaps(st.def.range(), top, bottom, 0)) {
        st.lastInRange = nowMs;
        out.push(st);
      }
    }
    return out;
  }

  /** Pide el código de las escenas dentro del margen de precarga (un chunk por escena). */
  private ensureLoaded(visible: DefState[], nowMs: number): void {
    const top = window.scrollY;
    const bottom = top + window.innerHeight;
    for (const st of this.states.values()) {
      if (st.instance || st.loading || st.failed) continue;
      if (st.def.enabled && !st.def.enabled(frame.preset, frame)) continue;
      const margin = st.def.preload ?? window.innerHeight;
      if (overlaps(st.def.range(), top, bottom, margin)) this.load(st, nowMs);
    }
    this.scheduleSweep();
  }

  private load(st: DefState, nowMs: number): void {
    st.loading = true;
    const ctx: EngineContext = {
      renderer: this.renderer,
      frame,
      colors: () => this.colors,
      markDirty: () => this.markDirty(),
      pulseChroma: () => this.pulseChroma(),
    };
    void st.def
      .load()
      .then(async (factory) => {
        if (this.disposed || !this.states.has(st.def.id)) return;
        const instance = await factory(ctx);
        if (this.disposed || !this.states.has(st.def.id)) {
          instance.dispose();
          return;
        }
        instance.resize?.(window.innerWidth, window.innerHeight);
        instance.applyQuality?.(frame.preset);
        st.instance = instance;
        st.lastInRange = nowMs;
        this.builtKey = "";
        this.dirty = true;
      })
      .catch((error: unknown) => {
        // Una escena que falla al cargar no rompe nada: su sección sigue siendo DOM completo.
        st.failed = true;
        this.options.onError?.(error);
      })
      .finally(() => {
        st.loading = false;
      });
  }

  private scheduleSweep(): void {
    clearTimeout(this.sweepTimer);
    this.sweepTimer = setTimeout(() => this.sweep(), RELEASE_MS + 100);
  }

  /**
   * Libera las escenas que llevan más de `RELEASE_MS` fuera de rango. Se mira el rango ACTUAL (con el
   * motor en reposo no hay frames que actualicen `lastInRange`): una escena visible nunca se libera.
   * Si quedan escenas fuera de rango que aún no cumplen el plazo, se vuelve a comprobar a tiempo.
   */
  sweep(nowMs = performance.now()): void {
    if (this.disposed) return;
    const top = window.scrollY;
    const bottom = top + window.innerHeight;
    let next = Infinity;
    for (const st of this.states.values()) {
      if (!st.instance) continue;
      if (overlaps(st.def.range(), top, bottom, 0)) {
        st.lastInRange = nowMs;
        continue;
      }
      const left = RELEASE_MS - (nowMs - st.lastInRange);
      if (left <= 0) {
        this.releaseState(st);
        this.builtKey = "";
        this.dirty = true;
      } else next = Math.min(next, left);
    }
    if (Number.isFinite(next)) {
      clearTimeout(this.sweepTimer);
      this.sweepTimer = setTimeout(() => this.sweep(), next + 50);
    }
  }

  private releaseState(st: DefState): void {
    if (!st.instance) return;
    st.instance.dispose();
    st.instance = null;
    st.animating = false;
    st.failed = false;
  }

  private rebuildIfNeeded(active: DefState[]): void {
    const key = `${this.tierLocked}|${active.map((s) => s.def.id).join(",")}`;
    if (key === this.builtKey) return;
    this.builtKey = key;
    for (const p of this.passes) p.dispose?.();
    this.passes = [];

    const layers: LayerTextures[] = active.map((st) => {
      const inst = st.instance as SceneInstance;
      const p: N = TSL.pass(inst.scene, inst.camera);
      p.setResolutionScale(inst.resolutionScale ?? frame.preset.rtScale);
      this.passes.push(p);
      let glow: N | null = null;
      if (inst.emits) {
        // Las escenas que emiten llevan SIEMPRE el canal `glow` (sus materiales lo escriben); solo
        // el tier alto lo usa para el bloom selectivo.
        p.setMRT(TSL.mrt({ output: TSL.output, glow: TSL.vec4(0, 0, 0, 0) }));
        if (frame.preset.bloom) glow = p.getTextureNode("glow");
      }
      return { color: p.getTextureNode("output"), glow };
    });
    this.pipeline.outputNode =
      layers.length === 0 ? TSL.vec4(0, 0, 0, 0) : buildOutput(layers, { preset: frame.preset });
    this.pipeline.needsUpdate = true;
    appStore.getState().setActiveScenes(active.map((s) => s.def.id));
  }

  private publishStats(nowMs: number, active: DefState[]): void {
    const info = this.renderer.info;
    this.stats.drawCalls = info.render.drawCalls;
    this.stats.frames++;
    this.stats.fps = this.fps.fps();
    this.stats.geometries = info.memory.geometries;
    this.stats.textures = info.memory.textures;
    this.stats.perScene = {};
    for (const st of active) {
      let calls = 0;
      st.instance?.scene.traverseVisible((o) => {
        const any = o as { isMesh?: boolean; isPoints?: boolean; isLine?: boolean; isSprite?: boolean };
        if (any.isMesh || any.isPoints || any.isLine || any.isSprite) calls++;
      });
      this.stats.perScene[st.def.id] = calls;
    }
    // Contador por escena en el store (lo leerá el Modo Debug): como mucho cada 500 ms y solo si cambia.
    if (nowMs - this.lastStatsPush > 500) {
      this.lastStatsPush = nowMs;
      const prev = appStore.getState().scenes.drawCalls;
      const same = Object.keys(prev).length === Object.keys(this.stats.perScene).length && Object.entries(this.stats.perScene).every(([k, v]) => prev[k] === v);
      if (!same) appStore.getState().setDrawCalls({ ...this.stats.perScene });
    }
  }

  private listen(): void {
    const onMove = (e: PointerEvent) => {
      this.pointer.x = e.clientX;
      this.pointer.y = e.clientY;
      this.pointer.active = true;
      this.pointer.moved = true;
    };
    const onLeave = () => {
      this.pointer.active = false;
      this.pointer.moved = true;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    const onVisibility = () => {
      if (!document.hidden) this.dirty = true;
    };
    document.addEventListener("visibilitychange", onVisibility);
    this.cleanups.push(() => {
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      document.removeEventListener("visibilitychange", onVisibility);
    });
  }

  /** Preset vigente (lectura). */
  get preset(): QualityPreset {
    return frame.preset;
  }

  get activeIds(): string[] {
    return this.activeStates.map((s) => s.def.id);
  }

  /** Información interna de una escena (pruebas y Modo Debug). */
  sceneDebug(id: string): Record<string, unknown> | null {
    return this.states.get(id)?.instance?.debug?.() ?? null;
  }

  /** Estado de cada escena (pruebas y Modo Debug). */
  sceneStates(): { id: string; loaded: boolean; failed: boolean }[] {
    return [...this.states.values()].map((s) => ({
      id: s.def.id,
      loaded: s.instance !== null,
      failed: s.failed,
    }));
  }

  /** Libera todas las escenas y la cadena; NO destruye el renderer (lo hace `dispose.ts`). */
  destroy(): void {
    this.disposed = true;
    clearTimeout(this.sweepTimer);
    this.cleanups.forEach((fn) => fn());
    for (const st of this.states.values()) this.releaseState(st);
    this.states.clear();
    for (const p of this.passes) p.dispose?.();
    this.passes = [];
    this.pipeline.dispose();
  }
}
