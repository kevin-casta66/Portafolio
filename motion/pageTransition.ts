import { appStore } from "@/lib/store";
import { prefersReducedMotion } from "./reduced";
import { armT6, disarmT6, t6 } from "./shared";
import { duration } from "./tokens";
import { resolveTransitionMode, type Intensity, type TransitionMode } from "./transition-mode";
import type { gsap } from "./gsap";
import type { AttachLabel, Rect, Surface, SurfaceState } from "./t6";

/**
 * Transición de página home ⇄ caso de estudio (spec `page-transitions`). Orquesta, sobre el canvas
 * persistente, las cuatro fases de design D3 —captura, expansión, navegación, entrega— y su inversa:
 *
 *  1. CAPTURA   lee el rectángulo de la tarjeta; el DOM de la tarjeta pasa a `opacity: 0` y la superficie
 *               (su gemelo en el canvas) ocupa exactamente ese rectángulo.
 *  2. EXPANSIÓN la superficie crece hasta la pantalla completa con distorsión de lente y aberración; el
 *               rótulo «Attaching debugger…» (DOM) se lee en el centro limpio.
 *  3. NAVEGACIÓN a mitad de la expansión se llama a `navigate()` (router de Next); la página del caso se
 *               monta oculta (`html[data-page-transition="in"]`).
 *  4. ENTREGA   cuando la cabecera tiene un rectángulo estable (fuentes cargadas, doble frame) la superficie
 *               se contrae hasta él y se funde con la cabecera real; el foco pasa al `h1`.
 *
 * El módulo es ligero (sin GSAP): `./t6` (GSAP) se importa solo cuando hay una expansión. Con movimiento
 * reducido es un fundido de WAAPI y no se carga nada más. Un fallo en cualquier punto «rescata»: restaura
 * la tarjeta y la página y deja la navegación hecha.
 */
const RECORD_KEY = "portafolio:t6";
/** Tope de espera a que la página destino se monte antes de rescatar con un fundido. */
const ARRIVAL_TIMEOUT_MS = 3000;
/** Tope para que el rectángulo de la cabecera se estabilice antes de rescatar con un fundido. */
const STABLE_TIMEOUT_MS = 300;
/** Cuánto se espera a que la escena del canvas exista antes de caer a la versión 2D. */
const SCENE_WAIT_MS = 350;

export interface StartOptions {
  card: HTMLElement;
  /** Slug del caso (`data-hold`). */
  slug: string;
  title: string;
  intensity: Intensity;
  attachingLabel: string;
  navigate(): void;
}

/** Registro de sesión de la última tarjeta ejecutada: permite devolver el scroll del home al volver. */
interface CaseRecord {
  slug: string;
  scrollY: number;
}

// ───────────────────────────── utilidades ─────────────────────────────

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

async function waitFor(predicate: () => boolean, timeoutMs: number): Promise<boolean> {
  const end = performance.now() + timeoutMs;
  while (!predicate()) {
    if (performance.now() >= end) return false;
    await wait(16);
  }
  return true;
}

/** Espera `n` frames del navegador (la maquetación ya está asentada tras el segundo). */
const frames = (n: number) =>
  new Promise<void>((resolve) => {
    const step = (left: number) => requestAnimationFrame(() => (left <= 1 ? resolve() : step(left - 1)));
    step(n);
  });

interface Deferred {
  promise: Promise<void>;
  resolve(): void;
}
const deferred = (): Deferred => {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => (resolve = r));
  return { promise, resolve };
};

/** Promesa que se cumple al terminar una animación de GSAP (no se hace `await` del tween: es «thenable»). */
const finished = (animation: gsap.core.Animation) =>
  new Promise<void>((resolve) => {
    animation.eventCallback("onComplete", () => resolve());
  });

const html = () => document.documentElement;

function readRecord(): CaseRecord | null {
  try {
    const raw = sessionStorage.getItem(RECORD_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<CaseRecord>;
    return typeof value.slug === "string" && typeof value.scrollY === "number"
      ? { slug: value.slug, scrollY: value.scrollY }
      : null;
  } catch {
    return null;
  }
}

function writeRecord(record: CaseRecord): void {
  try {
    sessionStorage.setItem(RECORD_KEY, JSON.stringify(record));
  } catch {
    /* sin almacenamiento: la vuelta usa el fundido con ancla */
  }
}

const casePathMatch = /^\/projects\/([^/]+)\/?$/;
const isHome = (pathname: string) => pathname === "/" || pathname === "";

/** Cuerpo de página que se oculta mientras dura la entrega (la cabecera real se muestra al final). */
function setPageHidden(hidden: boolean): void {
  if (hidden) html().dataset.pageTransition = "in";
  else delete html().dataset.pageTransition;
}

function fadeIn(el: Element | null | undefined, ms: number): void {
  el?.animate([{ opacity: 0 }, { opacity: 1 }], { duration: ms, easing: "ease-out" });
}

// ───────────────────────────── estado del flujo ─────────────────────────────

interface Flow {
  mode: TransitionMode;
  /** Se resuelve cuando la página destino se montó (ver `syncRoute`). */
  arrival: Deferred;
  /** Ruta (sin idioma) que se espera: `/projects/<slug>` o `/`. */
  expects: (pathname: string) => boolean;
  abort(): void;
}
let flow: Flow | null = null;
let lastPathname: string | null = null;
/** Ruta anterior a la última: con el botón «atrás» `syncRoute` puede ejecutarse ANTES que `popstate`. */
let prevPathname: string | null = null;

/** ¿Hay una transición de página en curso? (los demás gestos esperan). */
export const isTransitioning = () => flow !== null;

/**
 * La ruta cambió (lo llama `HoldToExecute` con `usePathname()`): resuelve la espera de la página
 * destino y recuerda de dónde venimos para detectar el botón «atrás».
 */
export function syncRoute(pathname: string): void {
  const previous = lastPathname;
  if (previous !== pathname) prevPathname = previous;
  lastPathname = pathname;
  if (flow?.expects(pathname)) flow.arrival.resolve();
  // Navegación a un caso SIN transición (p. ej. «Step over ▶»): el foco también pasa al `h1`.
  else if (!flow && previous !== null && previous !== pathname && casePathMatch.test(pathname))
    void frames(2).then(focusTitle);
}

// ───────────────────────────── modo ─────────────────────────────

async function pickMode(intensity: Intensity): Promise<TransitionMode> {
  const reduced = prefersReducedMotion();
  const { graphics } = appStore.getState();
  let sceneReady = t6.ready;
  const canDraw = !reduced && intensity !== "fade" && graphics.backend !== "none" && graphics.tier !== "low" && graphics.ready;
  if (canDraw) {
    armT6(); // carga la escena de T6 si aún no existe (un chunk de unos pocos KB)
    if (!sceneReady) sceneReady = await waitFor(() => t6.ready, SCENE_WAIT_MS);
  }
  return resolveTransitionMode({
    reduced,
    intensity,
    backend: graphics.backend,
    tier: graphics.tier,
    canvasReady: graphics.ready,
    sceneReady,
  });
}

// ───────────────────────────── fundido (reducido / entrada directa) ─────────────────────────────

/** Cortina del color de fondo: se funde a opaco, se navega y se funde a transparente. ≤ 200 ms en total. */
async function fadeNavigate(navigate: () => void, expects: (p: string) => boolean): Promise<void> {
  const veil = document.createElement("div");
  veil.setAttribute("aria-hidden", "true");
  veil.dataset.pageVeil = "";
  veil.className = "pointer-events-none fixed inset-0 z-[74] bg-bg";
  veil.style.opacity = "0";
  document.body.appendChild(veil);
  const half = duration.fadeMax / 2;
  const arrival = deferred();
  flow = { mode: "fade", arrival, expects, abort: () => arrival.resolve() };
  try {
    await veil.animate([{ opacity: 0 }, { opacity: 1 }], { duration: half, easing: "linear", fill: "forwards" }).finished;
    navigate();
    await Promise.race([arrival.promise, wait(ARRIVAL_TIMEOUT_MS)]);
    await frames(2);
    focusTitle();
    await veil.animate([{ opacity: 1 }, { opacity: 0 }], { duration: half, easing: "linear", fill: "forwards" }).finished;
  } finally {
    veil.remove();
    flow = null;
  }
}

function focusTitle(): void {
  const heading = document.getElementById("case-title");
  if (heading) heading.focus({ preventScroll: true });
}

// ───────────────────────────── tarjeta → caso ─────────────────────────────

export async function startCaseTransition(o: StartOptions): Promise<void> {
  if (flow) return;
  const { card } = o;
  const from = rectOfElement(card);
  const expectsCase = (p: string) => casePathMatch.exec(p)?.[1] === o.slug;
  writeRecord({ slug: o.slug, scrollY: window.scrollY });

  performance.mark("t6-start");
  const mode = await pickMode(o.intensity);
  if (mode === "instant") {
    o.navigate();
    return;
  }
  if (mode === "fade") {
    await fadeNavigate(o.navigate, expectsCase);
    return;
  }

  const t6mod = await import("./t6");
  const surface: Surface = mode === "full" ? t6mod.canvasSurface() : t6mod.domSurface(from);
  const proxy: SurfaceState = t6mod.makeProxy(from);
  const label: AttachLabel = t6mod.createAttachLabel(o.attachingLabel);
  const total = o.intensity === "full" ? duration.pageFull : duration.pageShort;
  const half = total / 2;
  const arrival = deferred();

  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    surface.destroy();
    label.destroy();
    card.style.opacity = "";
    setPageHidden(false);
    flow = null;
    // La escena se suelta unos segundos después: el motor libera su malla y su material.
    setTimeout(disarmT6, 600);
  };
  flow = { mode, arrival, expects: expectsCase, abort: cleanup };
  const safety = setTimeout(() => cleanup(), total + ARRIVAL_TIMEOUT_MS + 2000);

  try {
    // 1. CAPTURA: la superficie ocupa el rectángulo de la tarjeta; la tarjeta DOM se oculta.
    card.style.opacity = "0";
    surface.apply(proxy);

    // 2. EXPANSIÓN (+ rótulo) y 3. NAVEGACIÓN a mitad de camino.
    const { gsap, EASE, seconds } = await import("./gsap");
    const expand = t6mod.expandTo(surface, proxy, half);
    gsap.fromTo(
      label.el,
      { opacity: 0 },
      { opacity: 1, duration: seconds(half * 0.4), ease: EASE.inExpo, delay: seconds(half * 0.45) },
    );
    gsap.delayedCall(seconds(half * 0.6), () => {
      setPageHidden(true);
      o.navigate();
    });
    await finished(expand);
    performance.mark("t6-expanded");

    const arrived = await Promise.race([arrival.promise.then(() => true), wait(ARRIVAL_TIMEOUT_MS).then(() => false)]);
    if (!arrived) throw new Error("la página del caso no llegó a montarse");

    // 4. ENTREGA: espera a un rectángulo estable de la cabecera y se contrae hasta él.
    await document.fonts.ready;
    const target = await stableRect(() => document.querySelector("[data-case-header]"));
    if (!target) throw new Error("la cabecera del caso no tiene un rectángulo estable");

    const deliver = t6mod.deliverTo(surface, proxy, target, half);
    const fade = t6mod.fadeMsFor(half);
    deliver.call(
      () => {
        setPageHidden(false);
        fadeIn(document.querySelector("[data-case-page]"), fade);
      },
      [],
      seconds(half) - seconds(fade),
    );
    gsap.to(label.el, { opacity: 0, duration: seconds(half * 0.5), ease: EASE.inExpo });
    await finished(deliver);
    focusTitle();
    performance.mark("t6-end");
    performance.measure("t6", "t6-start", "t6-end");
  } catch {
    // Rescate: sin salto ni parpadeo, la página del caso queda visible y la tarjeta restaurada.
    setPageHidden(false);
    if (!expectsCase(lastPathname ?? "")) o.navigate();
  } finally {
    clearTimeout(safety);
    cleanup();
  }
}

const rectOfElement = (el: Element): Rect => {
  const r = el.getBoundingClientRect();
  return { x: r.left, y: r.top, w: r.width, h: r.height };
};

/** Rectángulo del elemento una vez estable durante dos frames consecutivos (o `null` si no se estabiliza). */
async function stableRect(find: () => Element | null): Promise<Rect | null> {
  const end = performance.now() + STABLE_TIMEOUT_MS;
  await frames(2);
  let last: Rect | null = null;
  while (performance.now() < end) {
    const el = find();
    if (el) {
      const now = rectOfElement(el);
      if (last && sameRect(last, now) && now.w > 0 && now.h > 0) return now;
      last = now;
    }
    await frames(1);
  }
  return null;
}

const sameRect = (a: Rect, b: Rect) =>
  Math.abs(a.x - b.x) < 0.5 && Math.abs(a.y - b.y) < 0.5 && Math.abs(a.w - b.w) < 0.5 && Math.abs(a.h - b.h) < 0.5;

// ───────────────────────────── caso → home (inversa) ─────────────────────────────

export interface LeaveOptions {
  /** `push("/")` del router (sin reposicionar el scroll: lo restaura esta transición). */
  navigateHome(): void;
  /** Llegada por el botón «atrás» del navegador: ya se está navegando y la superficie cubre desde el principio. */
  fromPopState?: boolean;
}

/**
 * Vuelta al home: la cabecera se expande, se navega, se restaura el scroll del home y la superficie se
 * contrae hasta la tarjeta de origen. Sin registro (entrada directa por URL) o con movimiento reducido:
 * fundido simple y ancla `#runtime`.
 */
export async function leaveCase(o: LeaveOptions): Promise<void> {
  if (flow) return;
  const record = readRecord();
  const header = document.querySelector("[data-case-header]");
  const expectsHome = isHome;

  // Con el botón «atrás» Next ya cambió el DOM cuando llega `popstate` (la cabecera ya no está): la
  // superficie cubre la pantalla completa desde el primer frame y solo hace falta la entrega.
  const canCover = Boolean(header) || o.fromPopState === true;
  const mode = record && canCover ? await pickMode("short") : "fade";
  if (mode === "instant") {
    if (!o.fromPopState) o.navigateHome();
    return;
  }
  if (mode === "fade" || !record || !canCover) {
    if (o.fromPopState) return; // el navegador ya está navegando: sin animación
    await fadeNavigate(o.navigateHome, expectsHome);
    scrollToProjects();
    return;
  }

  const t6mod = await import("./t6");
  const from = o.fromPopState || !header ? t6mod.viewportRect() : rectOfElement(header);
  const surface: Surface = mode === "full" ? t6mod.canvasSurface() : t6mod.domSurface(from);
  const proxy: SurfaceState = t6mod.makeProxy(from);
  if (o.fromPopState) proxy.lens = 0;
  const half = duration.pageShort / 2;
  const arrival = deferred();

  let target: HTMLElement | null = null;
  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    surface.destroy();
    if (target) target.style.opacity = "";
    flow = null;
    setTimeout(disarmT6, 600);
  };
  flow = { mode, arrival, expects: expectsHome, abort: cleanup };
  const safety = setTimeout(() => cleanup(), duration.pageShort + ARRIVAL_TIMEOUT_MS + 2000);
  // Con «atrás», el home puede haberse montado ya antes de que esta función arrancara.
  if (o.fromPopState && isHome(lastPathname ?? "")) arrival.resolve();

  try {
    surface.apply(proxy);
    const { gsap, seconds } = await import("./gsap");
    if (o.fromPopState) {
      // Cubre ya la pantalla completa (el home se monta debajo): solo falta la entrega.
      Object.assign(proxy, t6mod.viewportRect(), { lens: 1 });
      surface.apply(proxy);
    } else {
      gsap.delayedCall(seconds(half * 0.6), () => o.navigateHome());
      await finished(t6mod.expandTo(surface, proxy, half));
    }

    const arrived = await Promise.race([arrival.promise.then(() => true), wait(ARRIVAL_TIMEOUT_MS).then(() => false)]);
    if (!arrived) throw new Error("el home no llegó a montarse");

    // Scroll del home restaurado ANTES de mostrarlo; después, el rectángulo de la tarjeta de origen.
    window.scrollTo({ top: record.scrollY, behavior: "instant" });
    await document.fonts.ready;
    await frames(2);
    target = document.querySelector<HTMLElement>(`[data-hold="${CSS.escape(record.slug)}"]`);
    if (!target) throw new Error("la tarjeta de origen no existe");
    const to = await stableRect(() => target);
    if (!to) throw new Error("la tarjeta de origen no tiene un rectángulo estable");

    target.style.opacity = "0";
    const deliver = t6mod.deliverTo(surface, proxy, to, half);
    const fade = t6mod.fadeMsFor(half);
    deliver.call(
      () => {
        if (target) {
          target.style.opacity = "";
          fadeIn(target, fade);
        }
      },
      [],
      seconds(half) - seconds(fade),
    );
    await finished(deliver);
    target.focus({ preventScroll: true });
  } catch {
    if (!isHome(lastPathname ?? "")) o.navigateHome();
    scrollToProjects();
  } finally {
    clearTimeout(safety);
    cleanup();
  }
}

function scrollToProjects(): void {
  document.getElementById("runtime")?.scrollIntoView({ block: "start", behavior: "instant" });
}

// ───────────────────────────── ganchos (HoldToExecute) ─────────────────────────────

/**
 * Engancha lo que no pasa por una tarjeta: el enlace «Volver a proyectos» del caso y el botón «atrás»
 * del navegador. Los llama `HoldToExecute` una sola vez; devuelve la limpieza.
 */
export function installPageHooks(router: { push(href: string, options?: { scroll?: boolean }): void }): () => void {
  const onClick = (event: MouseEvent) => {
    const link = event.target instanceof Element ? event.target.closest("a[data-case-home]") : null;
    if (!link || event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (!casePathMatch.test(lastPathname ?? "")) return;
    event.preventDefault();
    event.stopPropagation(); // que el `Link` de Next no navegue por su cuenta
    void leaveCase({ navigateHome: () => router.push("/", { scroll: false }) });
  };
  const onPopState = () => {
    // Next puede haber confirmado ya la navegación (y `syncRoute` ejecutado) cuando llega `popstate`:
    // «de dónde venimos» es la ruta actual o la anterior, y «adónde vamos» es el home.
    const origin = casePathMatch.test(lastPathname ?? "") ? lastPathname : prevPathname;
    const leaving = casePathMatch.exec(origin ?? "")?.[1];
    const target = location.pathname.replace(/^\/(es|en)(?=\/|$)/, "") || "/";
    if (!leaving || flow || !isHome(target)) return;
    const record = readRecord();
    if (record?.slug !== leaving) return;
    void leaveCase({ navigateHome: () => {}, fromPopState: true });
  };

  // La escena de T6 se arma al acercarse a una tarjeta (ratón, foco o dedo) para que ya exista cuando el
  // gesto termine, y se suelta 2 s después de alejarse (nada ocupa GPU mientras no hace falta).
  let disarmTimer: ReturnType<typeof setTimeout> | undefined;
  const nearCard = (target: EventTarget | null) => target instanceof Element && target.closest("[data-hold]") !== null;
  const arm = (event: Event) => {
    if (!nearCard(event.target) || prefersReducedMotion()) return;
    clearTimeout(disarmTimer);
    if (appStore.getState().graphics.ready && appStore.getState().graphics.tier !== "low") armT6();
  };
  const leave = (event: Event) => {
    if (!nearCard(event.target)) return;
    clearTimeout(disarmTimer);
    disarmTimer = setTimeout(() => {
      if (!flow) disarmT6();
    }, 2000);
  };
  document.addEventListener("pointerover", arm);
  document.addEventListener("focusin", arm);
  document.addEventListener("touchstart", arm, { passive: true });
  document.addEventListener("pointerout", leave);
  document.addEventListener("focusout", leave);
  document.addEventListener("click", onClick, true); // en captura: antes que el `Link` de Next
  window.addEventListener("popstate", onPopState);
  return () => {
    for (const [type, handler] of [["pointerover", arm], ["focusin", arm], ["touchstart", arm], ["pointerout", leave], ["focusout", leave]] as const)
      document.removeEventListener(type, handler);
    clearTimeout(disarmTimer);
    document.removeEventListener("click", onClick, true);
    window.removeEventListener("popstate", onPopState);
    flow?.abort();
  };
}
