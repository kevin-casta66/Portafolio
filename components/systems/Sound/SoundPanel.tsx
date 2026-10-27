"use client";

import { useTranslations } from "next-intl";
import { appStore, useAppStore } from "@/lib/store";

const SWITCH_ROW =
  "flex min-h-6 cursor-pointer items-center justify-between gap-4 rounded-md px-1 py-1.5 text-sm";

/**
 * Cuerpo del popover de sonido: aviso de sonido apagado, volumen general y los interruptores Música y
 * Efectos. Se carga de forma diferida (`SoundSettings` lo pide al acercarse al botón o al abrir el
 * popover) para que el JS inicial solo lleve el botón. Todo se guarda en las preferencias; el motor lee
 * el store y reacciona (no hay estado aquí).
 */
export default function SoundPanel() {
  const t = useTranslations("Sound");
  const enabled = useAppStore((s) => s.sound.enabled);
  const volume = useAppStore((s) => s.sound.volume);
  const music = useAppStore((s) => s.sound.music);
  const sfx = useAppStore((s) => s.sound.sfx);
  const percent = Math.round(volume * 100);

  return (
    <>
      {!enabled ? <p className="mt-2 text-xs text-fg-muted">{t("off")}</p> : null}

      <div className="mt-3">
        <label htmlFor="sound-volume" className="flex items-center justify-between text-sm">
          <span>{t("volume")}</span>
          <span aria-hidden="true" className="font-mono text-xs text-fg-muted">
            {t("volumeValue", { percent })}
          </span>
        </label>
        <input
          id="sound-volume"
          type="range"
          min={0}
          max={100}
          step={1}
          value={percent}
          aria-valuetext={t("volumeValue", { percent })}
          onChange={(event) => appStore.getState().setVolume(Number(event.target.value) / 100)}
          className="mt-2 h-6 w-full cursor-pointer accent-accent"
        />
      </div>

      <div className="mt-2 flex flex-col">
        <label className={SWITCH_ROW}>
          <span>{t("music")}</span>
          <input
            type="checkbox"
            role="switch"
            checked={music}
            onChange={(event) => appStore.getState().setMusic(event.target.checked)}
            className="size-5 cursor-pointer accent-accent"
          />
        </label>
        <label className={SWITCH_ROW}>
          <span>{t("effects")}</span>
          <input
            type="checkbox"
            role="switch"
            checked={sfx}
            onChange={(event) => appStore.getState().setSfx(event.target.checked)}
            className="size-5 cursor-pointer accent-accent"
          />
        </label>
      </div>
    </>
  );
}
