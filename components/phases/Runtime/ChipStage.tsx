"use client";

import { useTranslations } from "next-intl";
import { useId, useRef, useState } from "react";
import { coreLayout } from "@/webgl/chip-layout";

export interface ChipProject {
  slug: string;
  name: string;
  pid: number;
  status: string;
  stack: string[];
  metric: { label: string; value: string };
}

/** Relación ancho/alto del escenario (la comparten el CSS y la disposición de los núcleos). */
const ASPECT = 2.2;

/**
 * Escenario del chip (RUNTIME). El die y sus núcleos los dibuja el canvas 3D encima de este bloque
 * (gemelo `data-twin="chip"`); aquí vive todo lo que tiene que ser accesible: un botón por núcleo
 * (teclado, táctil y lector de pantalla) y la ficha rápida del proyecto (nombre, estado, stack y una
 * métrica) en el DOM. Sin canvas, el bloque es un panel vacío pero los botones y las fichas siguen
 * funcionando, y todo el contenido está también en las tarjetas de proyectos.
 */
export function ChipStage({ projects }: { projects: ChipProject[] }) {
  const t = useTranslations("Runtime.chip");
  const stageRef = useRef<HTMLDivElement>(null);
  const baseId = useId();
  /** Núcleo activo por puntero/foco (hover) o por pulsación (toque o Enter). */
  const [hover, setHover] = useState<string | null>(null);
  const [pinned, setPinned] = useState<string | null>(null);
  const active = pinned ?? hover;
  const slots = coreLayout(projects.length, ASPECT);

  const setActiveAttr = (slug: string | null) => {
    const el = stageRef.current;
    if (!el) return;
    if (slug) el.dataset.activeCore = slug;
    else delete el.dataset.activeCore;
  };

  return (
    <div className="col-span-12 mb-8">
      <p className="mb-2 text-sm text-fg-muted">{t("help")}</p>
      <div
        ref={stageRef}
        data-twin="chip"
        data-chip-stage
        role="group"
        aria-label={t("label")}
        className="relative w-full overflow-hidden rounded-lg border border-border bg-surface"
        style={{ aspectRatio: String(ASPECT) }}
      >
        {projects.map((project, i) => {
          const slot = slots[i];
          if (!slot) return null;
          const panelId = `${baseId}-${project.slug}`;
          const open = active === project.slug;
          return (
            <button
              key={project.slug}
              type="button"
              data-core={project.slug}
              aria-label={t("core", { name: project.name, pid: project.pid })}
              aria-expanded={open}
              aria-controls={panelId}
              onPointerEnter={(e) => {
                if (e.pointerType === "mouse") {
                  setHover(project.slug);
                  setActiveAttr(project.slug);
                }
              }}
              onPointerLeave={(e) => {
                if (e.pointerType === "mouse") {
                  setHover(null);
                  if (!pinned) setActiveAttr(null);
                }
              }}
              onFocus={() => {
                setHover(project.slug);
                setActiveAttr(project.slug);
              }}
              onBlur={() => {
                setHover(null);
                if (!pinned) setActiveAttr(null);
              }}
              onClick={() => {
                const next = pinned === project.slug ? null : project.slug;
                setPinned(next);
                setActiveAttr(next ?? project.slug);
              }}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setPinned(null);
                  setHover(null);
                  setActiveAttr(null);
                }
              }}
              className="absolute z-40 -translate-x-1/2 -translate-y-1/2 rounded-md"
              style={{
                left: `${slot.cx * 100}%`,
                top: `${slot.cy * 100}%`,
                width: `${slot.w * 100}%`,
                height: `${slot.h * 100}%`,
              }}
            />
          );
        })}

        {projects.map((project) => {
          const open = active === project.slug;
          return (
            <div
              key={project.slug}
              id={`${baseId}-${project.slug}`}
              role="group"
              aria-label={project.name}
              hidden={!open}
              data-chip-ficha={project.slug}
              className="absolute inset-x-3 bottom-3 z-40 rounded-md border border-border bg-surface-elevated p-3 text-sm shadow-lg sm:left-auto sm:max-w-xs"
            >
              <p className="font-display text-base font-semibold">{project.name}</p>
              <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
                <dt className="font-mono text-xs text-fg-muted">{t("status")}</dt>
                <dd>
                  {project.status} · PID {project.pid}
                </dd>
                <dt className="font-mono text-xs text-fg-muted">{t("stack")}</dt>
                <dd>{project.stack.join(", ")}</dd>
                <dt className="font-mono text-xs text-fg-muted">{t("metric")}</dt>
                <dd>
                  <span className="font-mono font-semibold text-accent">{project.metric.value}</span>{" "}
                  {project.metric.label}
                </dd>
              </dl>
              <button
                type="button"
                onClick={() => {
                  setPinned(null);
                  setHover(null);
                  setActiveAttr(null);
                }}
                className="mt-3 inline-flex h-10 items-center rounded-md border border-border px-3 text-xs hover:border-accent hover:text-accent"
              >
                {t("close")}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
