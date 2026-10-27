import { useStore } from "zustand";
import { createStore } from "zustand/vanilla";
import type { DemoId } from "@/motion/showcase";

/**
 * Estado de la vitrina `/motion` (change 08, design D2): qué demo está viva. Hay COMO MÁXIMO una a la
 * vez: al activar otra, la anterior pierde su escenario (la tarjeta retira su iframe y con él el
 * contexto, las escenas y los render targets) y vuelve a su fotograma estático.
 */
export type DemoStatus = "idle" | "loading" | "playing" | "done" | "error";

export interface ShowcaseState {
  activeDemoId: DemoId | null;
  status: Partial<Record<DemoId, DemoStatus>>;
  /** Marca `id` como la demo viva; devuelve la que estaba antes (para esperar a que se retire). */
  activate(id: DemoId): DemoId | null;
  release(id: DemoId): void;
  setStatus(id: DemoId, status: DemoStatus): void;
}

export const createShowcaseStore = () =>
  createStore<ShowcaseState>((set, get) => ({
    activeDemoId: null,
    status: {},
    activate(id) {
      const previous = get().activeDemoId;
      set((s) => ({
        activeDemoId: id,
        status: previous && previous !== id ? { ...s.status, [previous]: "idle" } : s.status,
      }));
      return previous && previous !== id ? previous : null;
    },
    release(id) {
      set((s) =>
        s.activeDemoId === id ? { activeDemoId: null, status: { ...s.status, [id]: "idle" } } : s,
      );
    },
    setStatus(id, status) {
      set((s) => ({ status: { ...s.status, [id]: status } }));
    },
  }));

export const showcaseStore = createShowcaseStore();

export const useShowcase = <T>(selector: (state: ShowcaseState) => T): T =>
  useStore(showcaseStore, selector);
