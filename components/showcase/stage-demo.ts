import {
  posterSrc,
  stageHref,
  type DemoId,
  type DemoSpeed,
  type StageApi,
  type StageInfo,
  type TransitionDemo,
} from "@/motion/showcase";

/** Ancho lógico del escenario: con él las transiciones se comportan como en un escritorio (no `compact`). */
export const STAGE_WIDTH = 1280;
export const STAGE_HEIGHT = 720;

const LOAD_MS = 20000;

/**
 * Adaptador común de las 11 demos (design D1): monta el escenario aislado `/stage/<locale>/<Tn>` en un
 * iframe del mismo origen y habla con su `StageApi`. Retirar el iframe (`dispose`) libera de golpe el
 * contexto gráfico, las escenas y los render targets de esa demo. El código que se ejecuta dentro es el
 * de producción: la demo no reimplementa nada.
 */
export function createStageDemo(id: DemoId, locale: string, query = ""): TransitionDemo {
  let frame: HTMLIFrameElement | null = null;

  const api = (): StageApi | undefined => frame?.contentWindow?.__showcaseStage;

  const waitForApi = async (): Promise<StageApi> => {
    const start = performance.now();
    while (performance.now() - start < LOAD_MS) {
      const found = api();
      if (found) return found;
      await new Promise((resolve) => setTimeout(resolve, 60));
    }
    throw new Error(`El escenario ${id} no respondió.`);
  };

  return {
    id,
    async mount(el: HTMLElement): Promise<StageInfo> {
      const iframe = document.createElement("iframe");
      iframe.src = stageHref(locale, id, query);
      iframe.title = `Escenario ${id}`;
      iframe.tabIndex = -1;
      iframe.setAttribute("aria-hidden", "true");
      iframe.setAttribute("inert", "");
      iframe.setAttribute("data-stage-frame", id);
      iframe.width = String(STAGE_WIDTH);
      iframe.height = String(STAGE_HEIGHT);
      iframe.style.cssText = `position:absolute;left:0;top:0;width:${STAGE_WIDTH}px;height:${STAGE_HEIGHT}px;border:0;transform-origin:0 0;`;
      frame = iframe;
      el.append(iframe);
      const stage = await waitForApi();
      return stage.ready;
    },
    async replay() {
      const stage = api();
      if (!stage) throw new Error(`El escenario ${id} no está montado.`);
      await stage.replay();
    },
    setSpeed(speed: DemoSpeed) {
      api()?.setSpeed(speed);
    },
    setInternals(on: boolean) {
      return api()?.setInternals(on) ?? false;
    },
    setVisible(visible: boolean) {
      const stage = api();
      if (visible) stage?.resume();
      else stage?.pause();
    },
    renderPoster: () => posterSrc(id),
    dispose() {
      frame?.remove();
      frame = null;
    },
  };
}
