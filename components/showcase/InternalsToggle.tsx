"use client";

interface InternalsToggleProps {
  label: string;
  pressed: boolean;
  onToggle: () => void;
}

/** Interruptor «Ver internos»: expone su estado a las tecnologías de asistencia con `aria-pressed`. */
export function InternalsToggle({ label, pressed, onToggle }: InternalsToggleProps) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onToggle}
      className={
        "inline-flex h-10 items-center rounded-md border px-4 font-mono text-sm " +
        (pressed
          ? "border-accent bg-phase-tint text-accent"
          : "border-border text-fg-muted hover:border-accent hover:text-fg")
      }
    >
      {label}
    </button>
  );
}
