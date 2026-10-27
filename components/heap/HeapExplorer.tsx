"use client";

import { useLocale, useTranslations } from "next-intl";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  startTransition,
  useSyncExternalStore,
  type KeyboardEvent,
} from "react";
import { flushSync } from "react-dom";
import {
  isHeapCriterion,
  layoutBlocks,
  moveFocus,
  orderBlocks,
  type HeapBlock,
  type HeapCell,
  type HeapCriterion,
  type HeapGroup,
  type HeapDestination,
  type HeapMove,
} from "@/lib/heap";
import { prefersReducedMotion } from "@/motion/reduced";
import { duration } from "@/motion/tokens";
import { BlockCard } from "./BlockCard";

const VIEW_KEY = "portafolio:heap-view";
const DEFAULT_COLS = 4;
const STAGGER = 0.07;

type View = "grid" | "list";

interface HeapExplorerProps {
  blocks: HeapBlock[];
  skillNames: Record<string, string>;
  destinations: Record<string, HeapDestination>;
}

/** Evento global para la capa 3D: bloque con el foco (centrar la cámara) y criterio aplicado. */
export const HEAP_EVENTS = { focus: "heap:focus", gc: "heap:gc" } as const;

const cellId = (key: string) => `heap-cell-${key.replace(":", "-")}`;
const groupId = (id: string) => `heap-group-${id.replace(":", "-")}`;

/** Preferencia de vista de la sesión (`sessionStorage`); en servidor y sin almacenamiento: cuadrícula. */
function readView(): View {
  try {
    return sessionStorage.getItem(VIEW_KEY) === "list" ? "list" : "grid";
  } catch {
    return "grid";
  }
}
const subscribeView = (notify: () => void) => {
  window.addEventListener("heap:view", notify);
  return () => window.removeEventListener("heap:view", notify);
};

/** `?gc=` de la URL: el estado de «Run GC» es compartible. */
function readGc(): HeapCriterion {
  const value = new URLSearchParams(window.location.search).get("gc");
  return isHeapCriterion(value) ? value : "none";
}
const subscribeGc = (notify: () => void) => {
  window.addEventListener("popstate", notify);
  window.addEventListener("heap:gc-url", notify);
  return () => {
    window.removeEventListener("popstate", notify);
    window.removeEventListener("heap:gc-url", notify);
  };
};

/**
 * Vista Memory Heap 2D (change 07): cuadrícula de bloques de memoria con teclado (patrón grid, un solo
 * punto de tabulación), lista accesible equivalente (siempre en el DOM; el conmutador la hace visible),
 * «Run GC» (reagrupar por tecnología o año con FLIP) y Hold-to-Execute en los proyectos con caso.
 *
 * Es la fuente de verdad DOM: la escena 3D (change 07, escena `heap`) dibuja los mismos bloques y lee
 * los mismos datos, y se coordina por los eventos `heap:focus` / `heap:gc` y el atributo
 * `data-heap-mode` ("2d" | "3d") del contenedor. Las filas son reales (`role=row`, `display: contents`),
 * así que al reagrupar los bloques cambian de fila y se vuelven a crear: el FLIP de «Run GC» los
 * empareja por su clave (`data-key`).
 */
export function HeapExplorer({ blocks, skillNames, destinations }: HeapExplorerProps) {
  const t = useTranslations("Heap");
  const hold = useTranslations("Hold");
  const locale = useLocale() as "es" | "en";
  const uid = useId();

  // Estado externo (URL y sessionStorage) leído sin efectos: el servidor siempre pinta «cuadrícula, sin agrupar».
  const urlGc = useSyncExternalStore(subscribeGc, readGc, () => "none" as HeapCriterion);
  const storedView = useSyncExternalStore(subscribeView, readView, () => "grid" as View);

  const [selected, setSelected] = useState<HeapCriterion | null>(null);
  const [applied, setApplied] = useState<HeapCriterion | null>(null);
  const criterion = applied ?? urlGc;
  const pending = selected ?? criterion;
  const [view, setViewState] = useState<View | null>(null);
  const currentView = view ?? storedView;

  const [cols, setCols] = useState(DEFAULT_COLS);
  const [active, setActive] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const gridRef = useRef<HTMLDivElement>(null);
  const running = useRef(false);

  const layout = useMemo(() => layoutBlocks(blocks, criterion, cols), [blocks, criterion, cols]);
  const ordered = useMemo(() => orderBlocks(blocks, layout), [blocks, layout]);
  const byKey = useMemo(() => new Map(blocks.map((b) => [b.key, b])), [blocks]);
  const activeKey = active && byKey.has(active) ? active : (layout.cells[0]?.key ?? "");
  const holdHintId = `${uid}-hold`;

  // Columnas reales de la cuadrícula CSS (responsive): de ahí salen las filas para las flechas.
  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;
    const measure = () => {
      const tracks = getComputedStyle(grid).gridTemplateColumns.split(" ").filter(Boolean).length;
      if (tracks > 0) setCols(tracks);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(grid);
    return () => observer.disconnect();
  }, [currentView]);

  // Avisa a la capa 3D del criterio vigente (también al cargar con `?gc=`).
  useEffect(() => {
    window.dispatchEvent(new CustomEvent(HEAP_EVENTS.gc, { detail: { criterion } }));
  }, [criterion]);

  const labels = {
    address: t("fields.address"),
    type: t("fields.type"),
    year: t("fields.year"),
    stack: t("fields.stack"),
  };

  const setView = (next: View) => {
    setViewState(next);
    try {
      sessionStorage.setItem(VIEW_KEY, next);
    } catch {
      /* sin almacenamiento: la preferencia dura lo que dure la página */
    }
    window.dispatchEvent(new Event("heap:view"));
  };

  // `tabindex="-1"` también admite `focus()`: el roving tabindex se actualiza en `onFocusCapture`.
  const focusCell = useCallback((key: string) => {
    document.getElementById(cellId(key))?.focus();
  }, []);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const cell = (event.target as HTMLElement).closest<HTMLElement>("[data-heap-cell]");
    if (!cell || event.altKey || event.ctrlKey || event.metaKey) return;
    const key = cell.dataset.key ?? "";
    const moves: Record<string, HeapMove> = {
      ArrowRight: "right",
      ArrowLeft: "left",
      ArrowDown: "down",
      ArrowUp: "up",
      Home: "first",
      End: "last",
    };
    const move = moves[event.key];
    if (move) {
      event.preventDefault();
      focusCell(moveFocus(layout, key, move));
      return;
    }
    // Los bloques con caso los abre Hold-to-Execute (Enter corto, Espacio sostenido); el resto, su enlace.
    if (event.key === "Enter" && !cell.hasAttribute("data-hold")) {
      event.preventDefault();
      cell.querySelector<HTMLElement>("a")?.click();
    }
  };

  const announce = (message: string) => {
    setStatus("");
    queueMicrotask(() => setStatus(message));
  };

  const writeUrl = (next: HeapCriterion) => {
    const url = new URL(window.location.href);
    if (next === "none") url.searchParams.delete("gc");
    else url.searchParams.set("gc", next);
    window.history.replaceState(window.history.state, "", url);
    window.dispatchEvent(new Event("heap:gc-url"));
  };

  /** «Run GC»: reagrupa por el criterio elegido. En 2D: FLIP con stagger; con movimiento reducido, fundido. */
  const runGc = async () => {
    if (running.current) return;
    const next = pending;
    const done = () =>
      announce(
        next === "none"
          ? t("gc.reset", { count: blocks.length })
          : t("gc.done", { count: blocks.length, criterion: t(`gc.${next}`) }),
      );
    const commit = () => {
      flushSync(() => setApplied(next));
      writeUrl(next);
    };
    const grid = gridRef.current;
    // Con la escena 3D activa la cuadrícula DOM está oculta (solo accesible): la escena anima en el canvas
    // al recibir `heap:gc`, así que aquí no se hace el FLIP del DOM (trabajo invisible que cuesta INP).
    const sceneActive = document.documentElement.hasAttribute("data-heap3d");
    if (sceneActive && next !== criterion && currentView === "grid") {
      // La escena reacciona al evento al instante; el DOM (oculto, solo accesible) se actualiza como
      // transición para que el pintado del gesto no espere a reordenar la cuadrícula y la lista.
      window.dispatchEvent(new CustomEvent(HEAP_EVENTS.gc, { detail: { criterion: next } }));
      startTransition(() => setApplied(next));
      writeUrl(next);
      done();
      return;
    }
    if (next === criterion || !grid || currentView !== "grid" || sceneActive) {
      commit();
      done();
      return;
    }
    running.current = true;
    try {
      if (prefersReducedMotion()) {
        // Sin trayectorias: el orden cambia y el contenido reaparece con un fundido.
        commit();
        grid.animate([{ opacity: 0.35 }, { opacity: 1 }], { duration: duration.ui, easing: "ease-out" });
      } else {
        const { EASE, gsap, registerGsap, seconds } = await import("@/motion/gsap");
        registerGsap();
        // FLIP a mano: rectángulo de cada bloque antes del cambio → tras él, cada bloque parte de donde
        // estaba y viaja hasta su sitio (los bloques se vuelven a crear al cambiar de fila).
        const first = new Map(
          Array.from(grid.querySelectorAll<HTMLElement>("[data-heap-cell]")).map((el) => [
            el.dataset.key ?? "",
            el.getBoundingClientRect(),
          ]),
        );
        const focused = (document.activeElement as HTMLElement | null)?.closest<HTMLElement>("[data-heap-cell]")?.dataset.key;
        commit();
        // Las filas cambian: se devuelve el foco al mismo bloque.
        if (focused) document.getElementById(cellId(focused))?.focus({ preventScroll: true });
        const moving: HTMLElement[] = [];
        grid.querySelectorAll<HTMLElement>("[data-heap-cell]").forEach((el) => {
          const from = first.get(el.dataset.key ?? "");
          if (!from) return;
          const to = el.getBoundingClientRect();
          const dx = from.left - to.left;
          const dy = from.top - to.top;
          if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
          gsap.set(el, { x: dx, y: dy });
          moving.push(el);
        });
        grid.querySelectorAll<HTMLElement>("[data-heap-label]").forEach((el) =>
          el.animate([{ opacity: 0 }, { opacity: 1 }], {
            duration: duration.ui,
            delay: duration.ui,
            easing: "ease-out",
            fill: "backwards",
          }),
        );
        await new Promise<void>((resolve) => {
          if (moving.length === 0) return resolve();
          gsap.to(moving, {
            x: 0,
            y: 0,
            duration: seconds(duration.reveal),
            ease: EASE.scene,
            stagger: STAGGER,
            clearProps: "transform",
            onComplete: resolve,
            onInterrupt: resolve,
          });
        });
      }
      done();
    } finally {
      running.current = false;
    }
  };

  // Filas lógicas del layout: una fila de etiqueta por grupo y las filas de bloques.
  const rows = useMemo(() => {
    const byRow = new Map<number, { group?: HeapGroup; cells: HeapCell[] }>();
    for (const group of layout.groups) byRow.set(group.row, { group, cells: [] });
    for (const cell of layout.cells) {
      const row = byRow.get(cell.row) ?? { cells: [] };
      row.cells.push(cell);
      byRow.set(cell.row, row);
    }
    return [...byRow.entries()].sort(([a], [b]) => a - b);
  }, [layout]);

  const position = (() => {
    const index = ordered.findIndex((b) => b.key === activeKey);
    const block = ordered[index];
    return block ? t("grid.position", { n: index + 1, total: ordered.length, address: block.address }) : "";
  })();

  const cardLabels = (block: HeapBlock) => ({
    ...labels,
    kind: t(`kind.${block.kind}`),
    open: t(`destination.${(destinations[block.key] as HeapDestination).type}`),
  });
  const groupText = (label: string, kind: "tech" | "year") =>
    t("grid.groupHeading", { kind, label: kind === "tech" ? (skillNames[label] ?? label) : label });
  const groupKind = criterion === "year" ? "year" : "tech";

  return (
    <div
      data-heap-root
      data-heap-mode="2d"
      data-heap-criterion={criterion}
      className="col-span-12 mt-8"
    >
      {/* Sin JavaScript: se muestra la lista (los enlaces funcionan) y se oculta la cuadrícula. */}
      <noscript>
        <style>{`[data-heap-grid-wrap],[data-heap-controls]{display:none!important}[data-heap-list]{position:static!important;width:auto!important;height:auto!important;margin:0!important;overflow:visible!important;clip:auto!important;white-space:normal!important}`}</style>
      </noscript>

      <div data-heap-controls className="flex flex-wrap items-end gap-x-6 gap-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor={`${uid}-criterion`} className="font-mono text-sm text-fg-muted">
            {t("gc.label")}
          </label>
          <select
            id={`${uid}-criterion`}
            value={pending}
            onChange={(event) => {
              if (isHeapCriterion(event.target.value)) setSelected(event.target.value);
            }}
            className="h-10 rounded-md border border-border bg-surface px-3 font-mono text-sm"
          >
            {(["none", "tech", "year"] as const).map((id) => (
              <option key={id} value={id}>
                {t(`gc.${id}`)}
              </option>
            ))}
          </select>
          <button
            type="button"
            data-heap-run-gc
            onClick={() => void runGc()}
            className="inline-flex h-10 items-center rounded-md border border-accent bg-surface px-4 font-mono text-sm text-accent hover:bg-phase-tint"
          >
            {t("gc.run")}
          </button>
        </div>
        <button
          type="button"
          data-heap-view-toggle
          onClick={() => setView(currentView === "grid" ? "list" : "grid")}
          className="inline-flex h-10 items-center rounded-md border border-border px-4 font-mono text-sm text-fg-muted hover:border-accent hover:text-accent"
        >
          {currentView === "grid" ? t("view.list") : t("view.grid")}
        </button>
      </div>

      <div role="status" aria-live="polite" data-heap-live className="sr-only">
        {status}
      </div>

      <p id={holdHintId} className="sr-only">
        {hold("instruction")}
      </p>

      {/* Cuadrícula 2D: role=grid con un solo punto de tabulación (roving tabindex). */}
      <div data-heap-grid-wrap hidden={currentView !== "grid"} className="mt-6">
        <div
          ref={gridRef}
          role="grid"
          aria-label={t("grid.label")}
          data-heap-grid
          onKeyDown={onKeyDown}
          onFocusCapture={(event) => {
            const cell = (event.target as HTMLElement).closest<HTMLElement>("[data-heap-cell]");
            const key = cell?.dataset.key;
            if (!key) return;
            setActive(key);
            window.dispatchEvent(new CustomEvent(HEAP_EVENTS.focus, { detail: { key } }));
          }}
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          {rows.map(([rowIndex, row]) => (
            <div key={`row:${rowIndex}`} role="row" className="contents">
              {row.group ? (
                <div
                  id={groupId(row.group.id)}
                  role="columnheader"
                  aria-colspan={cols}
                  data-heap-label
                  className="col-span-full mt-2 border-b border-border pb-2 font-mono text-sm text-fg-muted first:mt-0"
                >
                  {groupText(row.group.label, groupKind)}
                </div>
              ) : null}
              {row.cells.map((cell) => {
                const block = byKey.get(cell.key) as HeapBlock;
                const destination = destinations[block.key] as HeapDestination;
                const caseSlug = destination.type === "case" ? destination.caseSlug : undefined;
                return (
                  <div
                    key={block.key}
                    id={cellId(block.key)}
                    role="gridcell"
                    tabIndex={block.key === activeKey ? 0 : -1}
                    data-heap-cell
                    data-key={block.key}
                    data-kind={block.kind}
                    data-hold={caseSlug}
                    data-hold-title={caseSlug ? block.name[locale] : undefined}
                    aria-describedby={caseSlug ? holdHintId : undefined}
                    className="relative scroll-mb-8 scroll-mt-24 select-none rounded-lg border border-border bg-surface p-4 sm:p-5"
                  >
                    <BlockCard
                      block={block}
                      destination={destination}
                      locale={locale}
                      skillNames={skillNames}
                      labels={cardLabels(block)}
                      linkTabIndex={-1}
                    />
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        <p data-heap-position className="mt-3 font-mono text-xs text-fg-muted">
          {position}
        </p>
      </div>

      {/* Lista accesible: siempre en el DOM; en vista cuadrícula solo la leen los lectores de pantalla. */}
      <ol
        data-heap-list
        aria-label={t("list.label")}
        className={
          currentView === "grid"
            ? "sr-only"
            : "mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
        }
      >
        {ordered.map((block) => {
          const destination = destinations[block.key] as HeapDestination;
          const cell = layout.cells.find((c) => c.key === block.key);
          return (
            <li key={block.key} className="rounded-lg border border-border bg-surface p-4 sm:p-5">
              {cell?.group ? (
                <p className="font-mono text-xs text-fg-muted">
                  {t("gc.group")}: {groupText(cell.group.split(":")[1] ?? "", groupKind)}
                </p>
              ) : null}
              <BlockCard
                block={block}
                destination={destination}
                locale={locale}
                skillNames={skillNames}
                labels={cardLabels(block)}
                {...(currentView === "grid" ? { linkTabIndex: -1 as const } : {})}
              />
            </li>
          );
        })}
      </ol>
    </div>
  );
}
