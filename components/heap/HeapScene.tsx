"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "@/i18n/navigation";
import { isHeapCriterion, type HeapBlock, type HeapCriterion, type HeapDestination } from "@/lib/heap";
import { useAppStore } from "@/lib/store";
import { onReducedMotionChange, prefersReducedMotion } from "@/motion/reduced";
import {
  activateHeap,
  deactivateHeap,
  focusBlock,
  heapView,
  releaseStageOverride,
  runGc,
  type HoverRect,
} from "@/webgl/scenes/heap/state";
import {
  DRAG_THRESHOLD,
  VelocityTracker,
  clampSpeed,
} from "@/webgl/scenes/heap/inertia";
import { alignStageToEntry } from "./HeapSceneEntry";
import "@/styles/heap.css";

interface HeapSceneProps {
  blocks: HeapBlock[];
  skillNames: Record<string, string>;
  destinations: Record<string, HeapDestination>;
}

const VIEW_KEY = "portafolio:heap-view";

const subscribeReduced = (notify: () => void) => onReducedMotionChange(notify);
const subscribeView = (notify: () => void) => {
  window.addEventListener("heap:view", notify);
  return () => window.removeEventListener("heap:view", notify);
};
const readView = (): "grid" | "list" => {
  try {
    return sessionStorage.getItem(VIEW_KEY) === "list" ? "list" : "grid";
  } catch {
    return "grid";
  }
};

/** Criterio inicial de «Run GC»: el de la URL (`?gc=`), que es compartible. */
function readGc(): HeapCriterion {
  const value = new URLSearchParams(window.location.search).get("gc");
  return isHeapCriterion(value) ? value : "none";
}

/**
 * Isla 3D del Memory Heap (change 07). Monta el ESCENARIO (`data-twin="heap"`) donde el canvas persistente
 * dibuja la cuadrícula infinita (`webgl/scenes/heap`) y recoge los gestos: arrastre con ratón o dedo
 * (umbral de 6 px) y rueda/trackpad, con inercia que integra la escena en el tick único del motor.
 *
 *  · Solo existe con la experiencia completa: motor listo, tier no bajo, sin movimiento reducido y en
 *    vista «cuadrícula». En cualquier otro caso no renderiza nada y la cuadrícula 2D (`HeapExplorer`)
 *    sigue siendo la vista; el cambio en caliente (tier a «bajo») la restaura sin recargar.
 *  · La cuadrícula DOM de `HeapExplorer` queda como CAPA ACCESIBLE (ver `styles/heap.css`): sus eventos
 *    `heap:focus` (bloque enfocado → la cámara lo centra y se dibuja el foco) y `heap:gc` («Run GC» → los
 *    bloques viajan a su nueva celda) llegan aquí por `window`.
 *  · Abrir un bloque con el puntero: una caja invisible (`.heap-proxy`) se coloca sobre el bloque que hay
 *    bajo el cursor. Para un proyecto con caso es un `[data-hold]` (clic corto o Hold-to-Execute de 05, sin
 *    código nuevo) y para el resto un enlace a su destino.
 */
export function HeapScene({ blocks, skillNames, destinations }: HeapSceneProps) {
  const t = useTranslations("Heap");
  const locale = useLocale() as "es" | "en";
  const ready = useAppStore((s) => s.graphics.ready);
  const backend = useAppStore((s) => s.graphics.backend);
  const tier = useAppStore((s) => s.graphics.tier);
  const reduced = useSyncExternalStore(subscribeReduced, prefersReducedMotion, () => true);
  const view = useSyncExternalStore(subscribeView, readView, () => "grid" as const);

  // `wanted`: hay motor y la experiencia completa lo permite → la escena se mantiene VIVA mientras dure la ruta.
  // `enabled`: además la vista es «cuadrícula» → se muestra el escenario. Alternar a «lista» solo oculta el
  // escenario (no se destruye la escena: volver a «cuadrícula» no recrea shaders, buffers ni el atlas).
  const wanted = ready && (backend === "webgpu" || backend === "webgl2") && tier !== "low" && !reduced;
  const enabled = wanted && view === "grid";

  const router = useRouter();
  const stage = useRef<HTMLDivElement>(null);
  const holdProxy = useRef<HTMLDivElement>(null);
  const linkProxy = useRef<HTMLAnchorElement>(null);
  const [proxyKey, setProxyKey] = useState<string | null>(null);
  const destinationsRef = useRef(destinations);
  useEffect(() => {
    destinationsRef.current = destinations;
  }, [destinations]);

  // Textos como cadenas (no la función `t`, que cambia de identidad en cada render): `data` solo cambia con el contenido.
  const kindProject = t("kind.project");
  const kindExperiment = t("kind.experiment");
  const data = useMemo(
    () => ({ blocks, locale, skillNames, labels: { project: kindProject, experiment: kindExperiment } }),
    [blocks, locale, skillNames, kindProject, kindExperiment],
  );

  // Llegada desde RUNTIME (T7): el escenario real se alinea con el virtual donde ya se dibujaban los bloques.
  useLayoutEffect(() => {
    const el = stage.current;
    if (!enabled || !el) return;
    const cancel = alignStageToEntry(el, heapView.stageOverride, releaseStageOverride);
    if (!cancel) releaseStageOverride();
    return () => cancel?.();
  }, [enabled]);

  // Declara la escena (rango infinito mientras la ruta esté activa) y la marca en <html> para la cuadrícula DOM.
  useEffect(() => {
    if (!wanted) return;
    return () => deactivateHeap();
  }, [wanted]);
  // La marca de <html> (que oculta la cuadrícula DOM) sigue a la vista visible.
  useEffect(() => {
    if (!enabled) return;
    document.documentElement.dataset.heap3d = "1";
    return () => {
      delete document.documentElement.dataset.heap3d;
    };
  }, [enabled]);
  // Los datos pueden cambiar (idioma, contenido) sin salir de la ruta: se actualizan sin desactivar la escena.
  useEffect(() => {
    if (wanted) activateHeap(data, readGc());
  }, [wanted, data]);

  // Eventos de `HeapExplorer`: foco de teclado y «Run GC».
  useEffect(() => {
    if (!wanted) return;
    const onFocus = (event: Event) => {
      const key = (event as CustomEvent<{ key?: string }>).detail?.key;
      if (key) focusBlock(key);
    };
    const onGc = (event: Event) => {
      const criterion = (event as CustomEvent<{ criterion?: unknown }>).detail?.criterion;
      if (isHeapCriterion(criterion)) runGc(criterion);
    };
    window.addEventListener("heap:focus", onFocus);
    window.addEventListener("heap:gc", onGc);
    return () => {
      window.removeEventListener("heap:focus", onFocus);
      window.removeEventListener("heap:gc", onGc);
    };
  }, [wanted]);

  // Proxy de apertura: sigue al bloque bajo el puntero (o el seleccionado con un toque).
  useEffect(() => {
    if (!enabled) return;
    const place = (key: string | null, rect: HoverRect | null) => {
      const el = stage.current;
      const target = key ? destinationsRef.current[key] : undefined;
      const hold = holdProxy.current;
      const link = linkProxy.current;
      if (!el || !hold || !link) return;
      for (const p of [hold, link]) p.dataset.active = "false";
      el.dataset.hover = key ? "true" : "false";
      if (!key || !rect || !target) {
        setProxyKey(null);
        return;
      }
      const box = el.getBoundingClientRect();
      const isCase = target.type === "case";
      const proxy = isCase ? hold : link;
      if (isCase) {
        const block = blocks.find((b) => b.key === key);
        hold.dataset.hold = target.caseSlug;
        hold.dataset.holdTitle = block?.name[locale] ?? "";
      }
      proxy.style.transform = `translate(${rect.x - box.left}px, ${rect.y - box.top}px)`;
      proxy.style.width = `${rect.w}px`;
      proxy.style.height = `${rect.h}px`;
      proxy.dataset.active = "true";
      setProxyKey((prev) => (prev === key ? prev : key));
    };
    heapView.onHover = (key, rect) => place(key, rect);
    return () => {
      heapView.onHover = null;
    };
  }, [enabled, blocks, locale]);

  // Gestos: arrastre, rueda y toque (Observer de GSAP; la inercia la integra la escena).
  useEffect(() => {
    const el = stage.current;
    if (!enabled || !el) return;
    let observer: { kill(): void } | null = null;
    let removeWheel: (() => void) | null = null;
    let cancelled = false;
    void (async () => {
      const { Observer, registerGsap } = await import("@/motion/gsap");
      if (cancelled) return;
      registerGsap();
      const tracker = new VelocityTracker();
      let origin = { x: 0, y: 0 };
      let lastWheel = 0;
      const sync = () => heapView.markDirty?.();
      observer = Observer.create({
        target: el,
        // La rueda se gestiona aparte (listener no pasivo propio): así no hay `preventDefault` sobre eventos
        // que el navegador trata como pasivos, y `touch-action: none` del escenario basta para el dedo.
        type: "touch,pointer",
        tolerance: DRAG_THRESHOLD,
        dragMinimum: DRAG_THRESHOLD,
        onPress: (self) => {
          heapView.velocity.x = heapView.velocity.y = 0;
          origin = { x: heapView.pan.x, y: heapView.pan.y };
          tracker.reset();
          tracker.push(performance.now(), origin.x, origin.y);
          void self;
        },
        onDragStart: () => {
          heapView.dragging = true;
          el.dataset.dragging = "true";
          sync();
        },
        onDrag: (self) => {
          heapView.pan.x += self.deltaX;
          heapView.pan.y += self.deltaY;
          tracker.push(performance.now(), heapView.pan.x, heapView.pan.y);
          sync();
        },
        onDragEnd: () => {
          const wasDragging = heapView.dragging;
          heapView.dragging = false;
          el.dataset.dragging = "false";
          if (wasDragging && !prefersReducedMotion()) {
            const v = tracker.velocity(performance.now());
            heapView.velocity.x = v.vx;
            heapView.velocity.y = v.vy;
          }
          sync();
        },
        // Toque breve (sin arrastre): selecciona el bloque; el siguiente toque cae sobre su proxy y lo abre.
        onClick: (self) => {
          const e = self.event as PointerEvent | MouseEvent | undefined;
          const touch = e && "pointerType" in e ? e.pointerType === "touch" : false;
          if (!touch) return;
          const hit = heapView.pick?.(self.x ?? 0, self.y ?? 0) ?? null;
          heapView.selectedKey = hit?.key ?? null;
          heapView.onHover?.(hit?.key ?? null, hit?.rect ?? null);
          sync();
        },
      });
      // Rueda / trackpad: desplaza la cuadrícula (y NO la página) mientras el puntero está sobre el escenario.
      const onWheel = (event: WheelEvent) => {
        event.preventDefault();
        const now = performance.now();
        const dt = Math.max(0.016, (now - lastWheel) / 1000);
        lastWheel = now;
        const scale = event.deltaMode === 1 ? 32 : 1;
        const dx = event.deltaX * scale;
        const dy = event.deltaY * scale;
        heapView.pan.x -= dx;
        heapView.pan.y -= dy;
        if (!prefersReducedMotion()) {
          const v = clampSpeed((-dx / dt) * 0.5, (-dy / dt) * 0.5, 1800);
          heapView.velocity.x = v.vx;
          heapView.velocity.y = v.vy;
        }
        sync();
      };
      el.addEventListener("wheel", onWheel, { passive: false });
      removeWheel = () => el.removeEventListener("wheel", onWheel);
    })();
    return () => {
      cancelled = true;
      removeWheel?.();
      observer?.kill();
      heapView.dragging = false;
      heapView.selectedKey = null;
    };
  }, [enabled]);

  if (!enabled) return null;

  const target = proxyKey ? destinations[proxyKey] : undefined;
  // Destinos externos (demo, código): enlace normal en otra pestaña. Internos: ruta con el idioma actual,
  // abierta con el router (sin recargar).
  const external = target && "url" in target ? target : null;
  const internal = target && (target.type === "card" || target.type === "lab") ? target : null;
  const linkHref = external
    ? external.url
    : internal
      ? `/${locale}${internal.path === "/" ? "" : internal.path}#${internal.hash}`
      : "#";

  return (
    <div
      ref={stage}
      data-heap-stage
      data-lenis-prevent
      data-twin="heap"
      data-dragging="false"
      data-hover="false"
      aria-hidden="true"
      className="heap-stage relative col-span-12 mt-6 h-[min(74svh,760px)] min-h-[420px] overflow-hidden rounded-lg border border-border"
    >
      {/* Proyecto con caso: clic corto o Hold-to-Execute (change 05) sobre el bloque bajo el cursor. */}
      <div ref={holdProxy} className="heap-proxy" data-active="false" data-hold="" data-heap-proxy="hold" />
      {/* Resto de destinos (demo, código, tarjeta, laboratorio): un enlace normal. */}
      <a
        ref={linkProxy}
        href={linkHref}
        tabIndex={-1}
        className="heap-proxy"
        data-active="false"
        data-heap-proxy="link"
        {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        onClick={(event) => {
          if (!internal) return;
          event.preventDefault();
          router.push(`${internal.path}#${internal.hash}`);
        }}
      />
    </div>
  );
}
