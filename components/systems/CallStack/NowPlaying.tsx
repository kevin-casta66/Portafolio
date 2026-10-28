"use client";

import { useTranslations } from "next-intl";
import { useIsReduced } from "@/lib/experience";
import { useEffect, useReducer, useRef } from "react";
import { audio } from "@/audio";
import { useAppStore } from "@/lib/store";
import { SOUND_POPOVER_ID } from "../Sound/SoundPopover";
import { useTick } from "../Sound/useTick";

const BARS = 5;
/** Altura fija (fracción) de las barras con movimiento reducido: un dibujo estático, sin animación. */
const STATIC_HEIGHTS = [0.45, 0.8, 0.6, 0.95, 0.5] as const;

/**
 * «Now playing» (ADDENDUM-v3 §6): barras de ecualizador reales (el analizador del bus de música,
 * leído en el tick único y escrito directo al DOM) junto a la fase y la capa predominante. Solo con
 * el sonido activo y el motor listo; estático con movimiento reducido; un clic abre los ajustes de
 * sonido. Nunca se anuncia de forma continua: el botón tiene un único nombre accesible.
 */
export function NowPlaying() {
  const t = useTranslations("Sound");
  const enabled = useAppStore((s) => s.sound.enabled);
  const reduced = useIsReduced();
  const [, refresh] = useReducer((n: number) => n + 1, 0);
  const bars = useRef<(HTMLSpanElement | null)[]>([]);
  const buffer = useRef(new Float32Array(BARS));

  // Re-render solo ante cambios estructurales (motor listo, fase, capa), nunca por frame.
  useEffect(() => {
    let stopControls = audio.controls.subscribe(refresh);
    const stopRegistry = audio.onRegistryChange(() => {
      stopControls();
      stopControls = audio.controls.subscribe(refresh);
      refresh();
    });
    return () => {
      stopControls();
      stopRegistry();
    };
  }, []);

  const controls = audio.controls;
  const active = enabled && controls.ready;

  useTick(() => {
    const live = audio.controls;
    if (!live.ready) return;
    live.spectrum(buffer.current);
    for (let i = 0; i < BARS; i++) {
      const bar = bars.current[i];
      if (bar) bar.style.transform = `scaleY(${(0.15 + 0.85 * (buffer.current[i] ?? 0)).toFixed(3)})`;
    }
  }, active && !reduced);

  if (!active) return null;
  const context = controls.context();
  const layer = t(`layers.${controls.dominantLayer()}`);

  return (
    <button
      type="button"
      popoverTarget={SOUND_POPOVER_ID}
      aria-label={`${t("nowPlaying", { layer, phase: context })}. ${t("nowPlayingOpen")}`}
      data-now-playing
      data-context={context}
      className="mt-1 flex w-full items-center gap-2 rounded-md border border-border px-1.5 py-1 font-mono text-xs text-fg hover:border-accent"
    >
      <span aria-hidden="true" className="flex h-3.5 items-end gap-0.5">
        {Array.from({ length: BARS }, (_, i) => (
          <span
            key={i}
            ref={(el) => {
              bars.current[i] = el;
            }}
            className="h-full w-0.5 origin-bottom rounded-sm bg-accent"
            style={{ transform: `scaleY(${reduced ? STATIC_HEIGHTS[i] : 0.3})` }}
          />
        ))}
      </span>
      <span aria-hidden="true" className="truncate text-fg-muted">
        {context}() · {layer}
      </span>
    </button>
  );
}
