"use client";

import { useTranslations } from "next-intl";
import { useId, useSyncExternalStore } from "react";
import { CONTROLS, defaultParams, type ExperimentKind } from "@/webgl/lab/definitions";
import { getParams, getReadout, setParam, subscribeLab } from "@/webgl/lab/store";

/**
 * Controles del experimento: elementos NATIVOS (`input type=range`, `select`) con etiqueta visible,
 * operables con teclado, y con el valor actual en `aria-valuetext`. Escriben en el estado compartido
 * que lee la escena 3D (`webgl/lab/store`), sin pasar por React por frame. Sin 3D siguen siendo
 * controles válidos (no hacen nada visible, pero tampoco rompen), y la descripción y el código del
 * experimento están en la tarjeta.
 */
export function ExperimentControls({ id, kind }: { id: string; kind: ExperimentKind }) {
  const t = useTranslations("Gpu.lab");
  const baseId = useId();
  const defaults = defaultParams(kind);
  const params = useSyncExternalStore(
    subscribeLab,
    () => JSON.stringify(getParams(id) ?? defaults),
    () => JSON.stringify(defaults),
  );
  const values = JSON.parse(params) as Record<string, number | string>;
  const readout = useSyncExternalStore(subscribeLab, () => getReadout(id), () => "");

  return (
    <div className="mt-4 flex flex-col gap-3">
      <p id={`${baseId}-help`} className="text-xs text-fg-muted">
        {t(`help.${kind}`)}
      </p>
      {CONTROLS[kind].map((control) => {
        const controlId = `${baseId}-${control.key}`;
        if (control.type === "range") {
          const value = Number(values[control.key] ?? control.default);
          return (
            <div key={control.key} className="flex flex-col gap-1">
              <label htmlFor={controlId} className="flex justify-between font-mono text-xs">
                <span>{t(`controls.${control.labelKey as "scale"}`)}</span>
                <output htmlFor={controlId}>{control.valueText(value)}</output>
              </label>
              <input
                id={controlId}
                type="range"
                min={control.min}
                max={control.max}
                step={control.step}
                value={value}
                aria-valuetext={control.valueText(value)}
                onChange={(e) => setParam(id, kind, control.key, Number(e.target.value))}
                className="h-6 w-full accent-[var(--accent)]"
              />
            </div>
          );
        }
        return (
          <div key={control.key} className="flex flex-col gap-1">
            <label htmlFor={controlId} className="font-mono text-xs">
              {t(`controls.${control.labelKey as "metric"}`)}
            </label>
            <select
              id={controlId}
              value={String(values[control.key] ?? control.default)}
              onChange={(e) => setParam(id, kind, control.key, e.target.value)}
              className="h-10 rounded-md border border-border bg-bg px-2 text-sm"
            >
              {control.options.map((option) => (
                <option key={option} value={option}>
                  {t(`options.${option as "years"}`)}
                </option>
              ))}
            </select>
          </div>
        );
      })}
      {kind === "dataviz" ? (
        <p aria-live="polite" className="min-h-5 font-mono text-xs text-accent">
          {readout}
        </p>
      ) : null}
    </div>
  );
}
