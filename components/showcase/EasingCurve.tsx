"use client";

import { useRef } from "react";
import { SPRING_SETTLE_MS, springLinear, springStep } from "@/motion/spring";
import { spring, toCssBezier, type CubicBezier } from "@/motion/tokens";
import { useReducedMotion } from "./useReducedMotion";

interface EasingCurveProps {
  /** Nombre visible del token (`--ease-in-expo`, `spring-ui`…). */
  name: string;
  description: string;
  /** Curva cúbica (token de easing) o `null` para el resorte de UI. */
  bezier: CubicBezier | null;
  labels: { curve: string; hint: string; reduced: string; values: string };
}

const SIZE = 120;
const PAD = 12;
const INNER = SIZE - PAD * 2;

/** Camino SVG de una curva `cubic-bezier` en el cuadrado de dibujo (y hacia arriba). */
function bezierPath([x1, y1, x2, y2]: CubicBezier): string {
  const px = (x: number) => PAD + x * INNER;
  const py = (y: number) => PAD + (1 - y) * INNER;
  const n = (v: number) => v.toFixed(2).replace(/\.?0+$/, "");
  return `M ${n(px(0))} ${n(py(0))} C ${n(px(x1))} ${n(py(y1))}, ${n(px(x2))} ${n(py(y2))}, ${n(px(1))} ${n(py(1))}`;
}

/** El resorte muestreado: `springStep` en una polilínea (se emite entero en el servidor). */
function springPath(): string {
  const px = (x: number) => PAD + x * INNER;
  // El eje vertical admite sobreimpulso: la escala deja un 25 % extra arriba.
  const py = (y: number) => PAD + (1 - y / 1.25) * INNER;
  const points = Array.from({ length: 60 }, (_, i) => {
    const t = i / 59;
    return `${px(t).toFixed(1)} ${py(springStep(t * (SPRING_SETTLE_MS / 1000))).toFixed(1)}`;
  });
  return `M ${points.join(" L ")}`;
}

/**
 * Una curva de easing dibujada a partir de los valores REALES de `motion/tokens.ts` (design D3). En el
 * servidor se emite el SVG estático y los valores numéricos; en el cliente, al pasar el cursor o
 * enfocar, un punto recorre la pista con ese easing. Con movimiento reducido no hay previsualización.
 */
export function EasingCurve({ name, description, bezier, labels }: EasingCurveProps) {
  const reduced = useReducedMotion();
  const track = useRef<HTMLDivElement>(null);
  const dot = useRef<HTMLSpanElement>(null);
  const values = bezier
    ? toCssBezier(bezier)
    : `stiffness ${spring.stiffness} · damping ${spring.damping}`;

  const preview = () => {
    if (reduced || !track.current || !dot.current) return;
    const travel = track.current.clientWidth - dot.current.offsetWidth;
    dot.current.getAnimations().forEach((a) => a.cancel());
    dot.current.animate([{ transform: "translateX(0)" }, { transform: `translateX(${travel}px)` }], {
      duration: bezier ? 1000 : SPRING_SETTLE_MS,
      easing: bezier ? toCssBezier(bezier) : springLinear(),
    });
  };

  return (
    <figure
      tabIndex={0}
      onPointerEnter={preview}
      onFocus={preview}
      aria-label={labels.curve}
      className="rounded-lg border border-border bg-surface p-4"
    >
      <div className="flex items-start gap-4">
        <svg
          role="img"
          aria-label={labels.curve}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className="size-28 shrink-0 text-accent"
        >
          <rect x={PAD} y={PAD} width={INNER} height={INNER} fill="none" className="stroke-border" strokeWidth="1" />
          <path d={bezier ? bezierPath(bezier) : springPath()} fill="none" stroke="currentColor" strokeWidth="2.5" />
        </svg>
        <figcaption className="min-w-0">
          <p className="font-mono text-sm text-accent">{name}</p>
          <p className="mt-1 text-sm text-fg-muted">{description}</p>
          <p className="mt-2 font-mono text-xs text-fg-muted">
            <span className="sr-only">{labels.values}: </span>
            {values}
          </p>
        </figcaption>
      </div>
      <div ref={track} className="relative mt-4 h-5 rounded bg-surface-elevated" aria-hidden="true">
        <span ref={dot} className="absolute left-0 top-0.5 size-4 rounded-full bg-accent" />
      </div>
      <p className="mt-2 font-mono text-xs text-fg-muted">{reduced ? labels.reduced : labels.hint}</p>
    </figure>
  );
}
