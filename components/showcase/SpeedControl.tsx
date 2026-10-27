"use client";

import { useRef, type KeyboardEvent } from "react";
import { DEMO_SPEEDS, type DemoSpeed } from "@/motion/showcase";

interface SpeedControlProps {
  label: string;
  value: DemoSpeed;
  onChange: (speed: DemoSpeed) => void;
}

/** Velocidad de la demo (0.25x / 0.5x / 1x; 1x por defecto): grupo de radio con un solo punto de tabulación. */
export function SpeedControl({ label, value, onChange }: SpeedControlProps) {
  const group = useRef<HTMLDivElement>(null);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const forward = event.key === "ArrowRight" || event.key === "ArrowDown";
    const backward = event.key === "ArrowLeft" || event.key === "ArrowUp";
    if (!forward && !backward) return;
    event.preventDefault();
    const index = DEMO_SPEEDS.indexOf(value);
    const next = DEMO_SPEEDS[(index + (forward ? 1 : -1) + DEMO_SPEEDS.length) % DEMO_SPEEDS.length];
    if (next === undefined) return;
    onChange(next);
    group.current?.querySelector<HTMLElement>(`[data-speed="${next}"]`)?.focus();
  };

  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-sm text-fg-muted" aria-hidden="true">
        {label}
      </span>
      <div
        ref={group}
        role="radiogroup"
        aria-label={label}
        onKeyDown={onKeyDown}
        className="inline-flex rounded-md border border-border"
      >
        {DEMO_SPEEDS.map((speed) => {
          const checked = speed === value;
          return (
            <button
              key={speed}
              type="button"
              role="radio"
              aria-checked={checked}
              tabIndex={checked ? 0 : -1}
              data-speed={speed}
              onClick={() => onChange(speed)}
              className={
                "h-10 px-3 font-mono text-sm first:rounded-l-md last:rounded-r-md " +
                (checked ? "bg-phase-tint text-accent" : "text-fg-muted hover:text-fg")
              }
            >
              {speed}x
            </button>
          );
        })}
      </div>
    </div>
  );
}
