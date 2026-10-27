"use client";

import { useTranslations } from "next-intl";
import { useEffect, useReducer, useRef } from "react";
import { audio, LAYER_IDS, type LayerId } from "@/audio";
import { emit } from "@/lib/events";
import { appStore, useAppStore } from "@/lib/store";
import { useTick } from "./useTick";

/**
 * Mini mezclador (easter egg `mixer`, ADDENDUM-v3 §5): una fila por capa de la pieza con silencio,
 * solo y un vúmetro en vivo. Diálogo nativo modal (Escape lo cierra y devuelve el foco), cargado de
 * forma diferida; la primera apertura desbloquea `sound_engineer`. Es una vista del motor: no guarda
 * estado de audio (lo leen `audio.controls` y el store).
 */
export default function Mixer() {
  const t = useTranslations("Sound");
  const open = useAppStore((s) => s.ui.mixerOpen);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const meters = useRef(new Map<LayerId, HTMLMeterElement>());
  const [, refresh] = useReducer((n: number) => n + 1, 0);

  // Re-render solo ante cambios estructurales (motor listo, fase, mute/solo), nunca por frame.
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

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      dialog.showModal();
      emit("achievement:unlock", { id: "sound_engineer" });
      audio.emit("mixer:open");
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  // Vúmetros: se leen en el tick único y se escriben directamente en el DOM.
  useTick(() => {
    const controls = audio.controls;
    if (!controls.ready) return;
    for (const id of LAYER_IDS) {
      const meter = meters.current.get(id);
      if (meter) meter.value = controls.layerLevel(id);
    }
  }, open);

  const controls = audio.controls;
  const layers = controls.layers();
  const anySolo = layers.some((l) => l.solo);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="mixer-title"
      onClose={() => {
        appStore.getState().setUi({ mixerOpen: false });
        openerRef.current?.focus();
      }}
      className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-lg border border-border bg-surface-elevated p-5 text-fg backdrop:bg-surface/70"
    >
      <div className="flex items-center justify-between gap-4">
        <h2 id="mixer-title" className="font-mono text-base font-semibold">
          {t("mixer.title")}
        </h2>
        <button
          type="button"
          onClick={() => appStore.getState().setUi({ mixerOpen: false })}
          aria-label={t("mixer.close")}
          className="inline-flex size-8 items-center justify-center rounded-md border border-border font-mono text-sm hover:border-accent"
        >
          <span aria-hidden="true">×</span>
        </button>
      </div>
      <p className="mt-2 text-sm text-fg-muted">{t("mixer.intro")}</p>

      {controls.ready ? (
        <ul className="mt-4 flex flex-col gap-2">
          {layers.map((layer) => {
            const name = t(`layers.${layer.id}`);
            const silent = layer.muted || (anySolo && !layer.solo);
            return (
              <li
                key={layer.id}
                data-layer={layer.id}
                className="grid grid-cols-[5.5rem_1fr_auto_auto] items-center gap-3 rounded-md border border-border px-3 py-2"
              >
                <span className="font-mono text-sm" title={layer.gain === 0 ? t("mixer.inactive") : undefined}>
                  {name}
                </span>
                <meter
                  ref={(el) => {
                    if (el) meters.current.set(layer.id, el);
                    else meters.current.delete(layer.id);
                  }}
                  min={0}
                  max={1}
                  value={0}
                  aria-label={t("mixer.level", { layer: name })}
                  data-silent={silent}
                  className="h-3 w-full opacity-100 data-[silent=true]:opacity-40"
                />
                <button
                  type="button"
                  aria-pressed={layer.muted}
                  aria-label={t("mixer.mute", { layer: name })}
                  onClick={() => audio.controls.setLayerMuted(layer.id, !layer.muted)}
                  className="inline-flex h-8 min-w-8 items-center justify-center rounded-md border border-border px-2 font-mono text-xs hover:border-accent aria-pressed:border-accent aria-pressed:text-accent"
                >
                  <span aria-hidden="true">M</span>
                </button>
                <button
                  type="button"
                  aria-pressed={layer.solo}
                  aria-label={t("mixer.solo", { layer: name })}
                  onClick={() => audio.controls.setLayerSolo(layer.id, !layer.solo)}
                  className="inline-flex h-8 min-w-8 items-center justify-center rounded-md border border-border px-2 font-mono text-xs hover:border-accent aria-pressed:border-accent aria-pressed:text-accent"
                >
                  <span aria-hidden="true">S</span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-fg-muted">{t("mixer.noEngine")}</p>
      )}
    </dialog>
  );
}
