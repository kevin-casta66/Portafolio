import { coreLayout } from "@/webgl/chip-layout";

/** Un núcleo del chip 2D por proyecto (`data-core-shape` = id). */
export interface ChipCore {
  /** Identificador del núcleo (slug del proyecto): `data-core-shape` en el SVG. */
  id: string;
}

const CHIP_W = 440;
const CHIP_H = 200;

/** Chip: die, patas y un núcleo por proyecto (el resaltado lo gobierna React, ver ChipStage). */
function ChipSvg({
  cores,
  activeCore,
}: {
  cores?: ChipCore[] | undefined;
  activeCore?: string | null | undefined;
}) {
  const list =
    cores && cores.length > 0 ? cores : Array.from({ length: 6 }, (_, i) => ({ id: `core-${i}` }));
  const slots = coreLayout(list.length, CHIP_W / CHIP_H);
  const pins = Array.from({ length: 12 }, (_, i) => 52 + i * 30);
  return (
    <svg
      viewBox={`0 0 ${CHIP_W} ${CHIP_H}`}
      className="pi-svg"
      preserveAspectRatio="xMidYMid meet"
      focusable="false"
    >
      {pins.map((x) => (
        <g key={x}>
          <line x1={x} y1={4} x2={x} y2={26} className="pi-line pi-dim" />
          <line x1={x} y1={CHIP_H - 26} x2={x} y2={CHIP_H - 4} className="pi-line pi-dim" />
        </g>
      ))}
      <rect
        x={CHIP_W * 0.06}
        y={CHIP_H * 0.1}
        width={CHIP_W * 0.88}
        height={CHIP_H * 0.8}
        rx={10}
        className="pi-panel"
      />
      {list.map((core, i) => {
        const slot = slots[i];
        if (!slot) return null;
        const w = slot.w * CHIP_W;
        const h = slot.h * CHIP_H;
        const on = activeCore === core.id;
        return (
          <g key={core.id} data-core-shape={core.id} data-on={on ? "true" : undefined}>
            <rect
              x={slot.cx * CHIP_W - w / 2}
              y={slot.cy * CHIP_H - h / 2}
              width={w}
              height={h}
              rx={4}
              className={on ? "pi-core pi-hot pi-on" : "pi-core"}
            />
            <rect
              x={slot.cx * CHIP_W - w / 5}
              y={slot.cy * CHIP_H - h / 5}
              width={(w * 2) / 5}
              height={(h * 2) / 5}
              rx={2}
              className={on ? "pi-fill pi-hot" : "pi-fill pi-dim"}
            />
          </g>
        );
      })}
    </svg>
  );
}


/**
 * Chip 2D de la fase RUNTIME. Vive aparte de `PhaseIllustration` para que `ChipStage` (cliente) no arrastre
 * al JS inicial las ilustraciones de las demás fases (change 09, presupuesto de JS).
 */
export function ChipIllustration({
  cores,
  activeCore,
  className,
}: {
  cores?: ChipCore[] | undefined;
  activeCore?: string | null | undefined;
  className?: string | undefined;
}) {
  return (
    <div
      aria-hidden="true"
      data-phase-illustration="runtime"
      className={className ? `phase-illustration ${className}` : "phase-illustration"}
    >
      <ChipSvg cores={cores} activeCore={activeCore} />
    </div>
  );
}
