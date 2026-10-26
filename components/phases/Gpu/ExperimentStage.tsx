"use client";

import { useTranslations } from "next-intl";
import { useRef } from "react";
import type { ExperimentKind } from "@/webgl/lab/definitions";
import { labEntry, wakeLab } from "@/webgl/lab/store";

/**
 * Escenario interactivo de un experimento: un recuadro transparente sobre la imagen estática de la
 * tarjeta (gemelo `data-twin="experiment:<id>"`) donde el canvas 3D dibuja el experimento. Recoge el
 * puntero, el toque y el teclado (el canvas no recibe eventos) y los vuelca al estado compartido.
 * Sin canvas queda un recuadro inerte encima de la imagen, que sigue visible.
 */
export function ExperimentStage({
  id,
  kind,
  dataset,
}: {
  id: string;
  kind: ExperimentKind;
  dataset?: { label: string; years: number; projects: number }[] | undefined;
}) {
  const t = useTranslations("Gpu.lab");
  const ref = useRef<HTMLDivElement>(null);
  const interactive = kind === "physics" || kind === "microinteraction";

  const local = (e: { clientX: number; clientY: number }) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r || r.width === 0) return { x: 0.5, y: 0.5 };
    return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height };
  };

  const move = (e: React.PointerEvent) => {
    const input = labEntry(id, kind).input;
    const p = local(e);
    input.dx += (p.x - input.x) * (ref.current?.clientWidth ?? 0);
    input.dy += (p.y - input.y) * (ref.current?.clientHeight ?? 0);
    input.x = p.x;
    input.y = p.y;
    input.inside = true;
    wakeLab();
  };

  const onKey = (e: React.KeyboardEvent) => {
    const input = labEntry(id, kind).input;
    let handled = true;
    if (e.key === "ArrowLeft") input.keyX = -1;
    else if (e.key === "ArrowRight") input.keyX = 1;
    else if (e.key === "ArrowUp") input.keyY = -1;
    else if (e.key === "ArrowDown") input.keyY = 1;
    else if (e.key === "r" || e.key === "R") input.reset = true;
    else handled = false;
    if (handled) {
      e.preventDefault();
      wakeLab();
    }
  };

  return (
    <div
      ref={ref}
      data-twin={`experiment:${id}`}
      data-experiment={kind}
      data-dataset={dataset ? JSON.stringify(dataset) : undefined}
      role="group"
      tabIndex={interactive ? 0 : -1}
      aria-label={t(`stage.${kind}`)}
      onPointerMove={move}
      onPointerDown={(e) => {
        labEntry(id, kind).input.down = true;
        move(e);
        if (interactive) (e.target as Element).setPointerCapture?.(e.pointerId);
      }}
      onPointerUp={() => {
        labEntry(id, kind).input.down = false;
        wakeLab();
      }}
      onPointerCancel={() => {
        labEntry(id, kind).input.down = false;
      }}
      onPointerLeave={() => {
        const input = labEntry(id, kind).input;
        input.inside = false;
        input.down = false;
        wakeLab();
      }}
      onFocus={() => {
        labEntry(id, kind).input.focused = true;
        wakeLab();
      }}
      onBlur={() => {
        labEntry(id, kind).input.focused = false;
        wakeLab();
      }}
      onKeyDown={interactive ? onKey : undefined}
      className="absolute inset-0"
      style={{ touchAction: interactive ? "none" : "pan-y" }}
    >
      {/* Los datos completos también están en el DOM (lista visible solo para lectores de pantalla) */}
      {dataset ? (
        <ul className="sr-only">
          {dataset.map((d) => (
            <li key={d.label}>
              {d.label}: {d.years} · {d.projects}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
