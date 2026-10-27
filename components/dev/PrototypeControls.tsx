"use client";

import { useEffect, useRef, useState } from "react";
import type { Player } from "@/components/showcase/stage/players";
import { useAppStore } from "@/lib/store";
import type { DemoId } from "@/motion/showcase";

type Variant = "canvas" | "dom" | "reduced";

/**
 * Controles del prototipo de una transición (herramienta de desarrollo, no se muestra en producción):
 * un deslizador de progreso 0–1 que mueve la transición a mano, un selector de variante (canvas, DOM,
 * reducida) y el estado del backend. Crea la transición con el MISMO reproductor que usa la vitrina
 * `/motion` (`components/showcase/stage/players.ts`, change 08), con el modo prototipo activo (la
 * escena del canvas está siempre viva) y sin enganche al scroll.
 */
export function PrototypeControls({ id }: { id: string }) {
  const ready = useAppStore((s) => s.graphics.ready);
  const backend = useAppStore((s) => s.graphics.backend);
  const tier = useAppStore((s) => s.graphics.tier);
  const [variant, setVariant] = useState<Variant>("canvas");
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState(id === "T11" ? "T11: el glitch se dispara con el botón" : "esperando el motor 3D…");
  const player = useRef<Player | null>(null);
  const progressRef = useRef(0);
  const [mask, setMask] = useState(false);

  useEffect(() => {
    progressRef.current = progress;
  }, [progress]);

  // La vista de máscara de la lente (T6) se aplica con el interruptor «ver internos» del reproductor.
  useEffect(() => {
    player.current?.setInternals(mask);
  }, [mask]);

  useEffect(() => {
    if (variant === "canvas" && !ready) return;
    let cancelled = false;
    void (async () => {
      const { playerFor, waitForClock } = await import("@/components/showcase/stage/players");
      const clock = await waitForClock(15000);
      if (cancelled) return;
      player.current?.destroy();
      const created = await playerFor(id as DemoId)({ variant, clock, reduced: variant === "reduced" });
      if (cancelled) {
        created?.destroy();
        return;
      }
      player.current = created;
      created?.seek?.(progressRef.current);
      created?.setInternals(mask);
      setStatus(
        created
          ? id === "T6"
            ? `T6 · superficie ${variant === "canvas" ? "en el canvas (lente)" : "DOM (2D)"}`
            : `variante ${variant} activa`
          : `sin variante ${variant}`,
      );
    })();
    return () => {
      cancelled = true;
      player.current?.destroy();
      player.current = null;
    };
    // `mask` solo se aplica con su propio efecto: cambiarlo no recrea la transición.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, variant, ready]);

  const glitch = () => {
    void player.current?.play();
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-[75] border-t border-border bg-surface-elevated p-3 font-mono text-sm">
      <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-4">
        <strong>{id}</strong>
        <label className="flex flex-1 items-center gap-3" htmlFor="proto-progress">
          Progreso
          <input
            id="proto-progress"
            type="range"
            min={0}
            max={1}
            step={0.001}
            value={progress}
            aria-valuetext={`${Math.round(progress * 100)} %`}
            onChange={(e) => {
              const value = Number(e.target.value);
              setProgress(value);
              player.current?.seek?.(value);
            }}
            className="flex-1"
          />
          <output>{progress.toFixed(3)}</output>
        </label>
        <label className="flex items-center gap-2">
          Variante
          <select
            value={variant}
            onChange={(e) => setVariant(e.target.value as Variant)}
            className="rounded border border-border bg-bg px-2 py-1"
          >
            <option value="canvas">canvas</option>
            <option value="dom">DOM</option>
            <option value="reduced">reducida</option>
          </select>
        </label>
        {id === "T6" ? (
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={mask} onChange={(e) => setMask(e.target.checked)} />
            Ver máscara de la lente
          </label>
        ) : null}
        {id === "T11" ? (
          <button type="button" onClick={glitch} className="rounded border border-accent px-3 py-1">
            Glitch
          </button>
        ) : null}
        <span data-proto-status className="text-fg-muted">
          {status} · {backend}/{tier}
        </span>
      </div>
    </div>
  );
}
