"use client";

import { useEffect, useRef, useState } from "react";
import { useAppStore } from "@/lib/store";

type Variant = "canvas" | "dom" | "reduced";

interface Handle {
  timeline: { progress(value?: number): number | unknown };
  destroy(): void;
}

/**
 * Controles del prototipo de una transición (herramienta de desarrollo, no se muestra en producción):
 * un deslizador de progreso 0–1 que mueve la transición a mano, un selector de variante (canvas, DOM,
 * reducida) y el estado del backend. Crea la transición con `replay()` del registro reproducible
 * (el mismo que usará `/motion`), con el modo prototipo activo (la escena del canvas está siempre
 * viva) y sin enganche al scroll.
 */
export function PrototypeControls({ id }: { id: string }) {
  const ready = useAppStore((s) => s.graphics.ready);
  const backend = useAppStore((s) => s.graphics.backend);
  const tier = useAppStore((s) => s.graphics.tier);
  const [variant, setVariant] = useState<Variant>("canvas");
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState(id === "T11" ? "T11: el glitch se dispara con el botón" : "esperando el motor 3D…");
  const handle = useRef<Handle | null>(null);
  const progressRef = useRef(0);
  const [mask, setMask] = useState(false);

  useEffect(() => {
    progressRef.current = progress;
  }, [progress]);

  // T6: la superficie (gemelo de la tarjeta) se reproduce con `playT6`, sin navegar.
  useEffect(() => {
    if (id !== "T6") return;
    if (variant === "canvas" && !ready) return;
    let cancelled = false;
    void (async () => {
      const [t6mod, shared] = await Promise.all([import("@/motion/t6"), import("@/motion/shared")]);
      if (cancelled) return;
      const card = document.querySelector<HTMLElement>("[data-hold]");
      const header = document.querySelector<HTMLElement>("[data-case-header]");
      if (!card || !header) return;
      handle.current?.destroy();
      if (variant === "canvas") shared.armT6();
      const playback = t6mod.playT6({
        from: t6mod.rectOf(card),
        to: t6mod.rectOf(header),
        intensity: "full",
        surface: variant === "canvas" ? "canvas" : "dom",
        label: "Attaching debugger…",
      });
      playback.timeline.progress(progressRef.current);
      handle.current = playback;
      setStatus(`T6 · superficie ${variant === "canvas" ? "en el canvas (lente)" : "DOM (2D)"}`);
    })();
    return () => {
      cancelled = true;
      handle.current?.destroy();
      handle.current = null;
      void import("@/motion/shared").then((s) => s.disarmT6());
    };
  }, [id, variant, ready]);

  useEffect(() => {
    void import("@/motion/shared").then((s) => {
      s.t6.maskView = mask;
      s.t6.markDirty?.();
    });
  }, [mask]);

  useEffect(() => {
    if (id === "T11" || id === "T6") return;
    if (variant === "canvas" && !ready) return;
    let cancelled = false;
    void (async () => {
      const [{ replay }, { subscribeClock }, { prototypeMode }, { isCompact }] = await Promise.all([
        import("@/motion/transitions"),
        import("@/motion/shared"),
        import("@/webgl/transitions/state"),
        import("@/motion/reduced"),
      ]);
      const clock = await new Promise<NonNullable<Parameters<Parameters<typeof subscribeClock>[0]>[0]>>(
        (resolve) => {
          // `subscribeClock` llama de inmediato si ya hay reloj: la baja se hace tras asignar `stop`.
          const sub: { stop?: () => void } = {};
          let done = false;
          sub.stop = subscribeClock((c) => {
            if (!c || done) return;
            done = true;
            resolve(c);
            queueMicrotask(() => sub.stop?.());
          });
        },
      );
      if (cancelled) return;
      prototypeMode.active = variant === "canvas";
      handle.current?.destroy();
      handle.current = replay(
        id as Parameters<typeof replay>[0],
        progressRef.current,
        variant,
        { root: document.body, compact: isCompact(), clock },
      );
      setStatus(handle.current ? `variante ${variant} activa` : `sin variante ${variant}`);
      // Coloca el límite entre las dos secciones en el centro del viewport.
      const sections = document.querySelectorAll<HTMLElement>("[data-transition-prototype] > section");
      const boundary = sections[1];
      if (boundary && window.scrollY === 0)
        window.scrollTo(0, boundary.getBoundingClientRect().top + window.scrollY - window.innerHeight * 0.4);
    })();
    return () => {
      cancelled = true;
      handle.current?.destroy();
      handle.current = null;
    };
  }, [id, variant, ready]);

  const glitch = () => {
    void import("@/motion/transitions/glitch").then(async ({ glitchTitle }) => {
      const { canvasState } = await import("@/motion/shared");
      const title = document.getElementById("lexer-title");
      if (title && !canvasState.glitch?.(title)) glitchTitle(title);
    });
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
              handle.current?.timeline.progress(value);
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
