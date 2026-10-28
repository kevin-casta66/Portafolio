import type { TransitionContext, TransitionDef, TransitionHandle, Variant } from "./contract";
import { resolveVariant, selectVariant, type VariantInputs } from "./select";

/**
 * Controlador de transiciones: elige la variante de cada una, la engancha a su tramo de scroll
 * (scrubbed) y, si la variante cambia a MITAD de recorrido (el canvas termina de cargar, baja el tier
 * o cambia la preferencia de movimiento), crea la nueva con el progreso actual: sin saltos.
 *
 * El enganche concreto al scroll se inyecta (`attach`) para poder probar la lógica sin DOM.
 */
export interface Attachment {
  /** Progreso actual 0..1 del tramo de scroll. */
  progress(): number;
  destroy(): void;
}

export type Attach = (
  def: TransitionDef,
  handle: TransitionHandle,
  ctx: TransitionContext,
) => Attachment | null;

interface Active {
  variant: Variant;
  handle: TransitionHandle;
  attachment: Attachment | null;
}

export interface TransitionController {
  /** Crea y engancha todas las transiciones con las entradas actuales. */
  mount(): void;
  /**
   * Igual que `mount` pero cediendo el hilo tras cada transición (`yieldToMain`), para que el montaje no sea
   * una única tarea larga (change 09, TBT). Salta las que ya existan y se detiene si `isCancelled()`.
   */
  mountSliced(yieldToMain: () => Promise<void>, isCancelled: () => boolean): Promise<void>;
  /** Reevalúa la variante de cada transición (llamar cuando cambie una de las entradas). */
  refresh(): void;
  /** Recrea todas las transiciones activas conservando su progreso (tras un redimensionado, p. ej.). */
  rebuild(): void;
  setInputs(inputs: Partial<VariantInputs>): void;
  variantOf(id: string): Variant | undefined;
  progressOf(id: string): number | undefined;
  destroy(): void;
}

export function createTransitionController(
  defs: readonly TransitionDef[],
  ctx: TransitionContext,
  attach: Attach,
  initial: VariantInputs,
): TransitionController {
  const inputs: VariantInputs = { ...initial };
  const active = new Map<string, Active>();

  const build = (def: TransitionDef, startProgress = 0) => {
    const wanted = selectVariant(inputs);
    const variant = resolveVariant(wanted, Object.keys(def.variants) as Variant[]);
    if (!variant) return;
    const factory = def.variants[variant];
    if (!factory) return;
    const handle = factory(ctx);
    // El progreso previo se aplica ANTES de enganchar, así la transición nueva arranca donde estaba.
    if (startProgress > 0) handle.timeline.progress(startProgress);
    active.set(def.id, { variant, handle, attachment: attach(def, handle, ctx) });
  };

  const teardown = (id: string): number => {
    const entry = active.get(id);
    if (!entry) return 0;
    const progress = entry.attachment?.progress() ?? 0;
    entry.attachment?.destroy();
    entry.handle.timeline.kill();
    entry.handle.destroy();
    active.delete(id);
    return progress;
  };

  return {
    mount() {
      defs.forEach((def) => build(def));
    },
    async mountSliced(yieldToMain, isCancelled) {
      for (const def of defs) {
        if (isCancelled()) return;
        if (!active.has(def.id)) build(def);
        await yieldToMain();
      }
    },
    refresh() {
      for (const def of defs) {
        const current = active.get(def.id);
        const wanted = selectVariant(inputs);
        const next = resolveVariant(wanted, Object.keys(def.variants) as Variant[]);
        if (!next || current?.variant === next) continue;
        const progress = teardown(def.id);
        build(def, progress);
      }
    },
    rebuild() {
      for (const def of defs) {
        if (!active.has(def.id)) continue;
        const progress = teardown(def.id);
        build(def, progress);
      }
    },
    setInputs(patch) {
      Object.assign(inputs, patch);
      this.refresh();
    },
    variantOf: (id) => active.get(id)?.variant,
    progressOf: (id) => active.get(id)?.attachment?.progress(),
    destroy() {
      [...active.keys()].forEach(teardown);
    },
  };
}
