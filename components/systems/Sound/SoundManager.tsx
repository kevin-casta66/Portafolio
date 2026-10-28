"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { audio, hasEngine } from "@/audio";
import { audioUnlock, getAudioContext, onUnlockGesture } from "@/lib/audio";
import { appStore } from "@/lib/store";

/**
 * Puente fino entre la app y el motor de audio (change 08b). Se monta cuando el sonido se activa por
 * primera vez y NO contiene audio: decide CUÁNDO cargar el motor (`audio/engine.ts`, con `tone` en un
 * chunk propio) y le entrega el `AudioContext` que desbloqueó el gesto del visitante.
 *
 *  - Nunca suena nada antes de la elección en la puerta: si la puerta está visible y el visitante aún no
 *    eligió en esta visita, el motor NO se carga aunque exista una preferencia guardada de otra visita;
 *    espera a la elección (`gate:sound|silent`) o al fin del arranque (`boot:done`, p. ej. «Saltar»).
 *  - Sin `AudioContext` en marcha (preferencia guardada, sin gesto todavía) espera al primer gesto que el
 *    navegador acepte como activación (clic, tecla o toque; la rueda y el hover NO cuentan) y, mientras tanto,
 *    muestra un aviso pequeño «Activar sonido» (región `status`, sin robar el foco) que lo arranca con un clic.
 *  - La fase activa del store se publica como `phase:<id>` (el motor la cuantiza al compás).
 *  - Silencio, volumen, música/efectos, pestaña oculta, scroll y movimiento reducido los gestiona el motor.
 */
export default function SoundManager() {
  const t = useTranslations("Sound");
  /** El audio espera una activación del visitante (visita posterior con el sonido elegido). */
  const [locked, setLocked] = useState(false);
  const activateRef = useRef<() => void>(() => {});

  useEffect(() => {
    let disposed = false;
    let loading = false;
    let cancelGesture: (() => void) | null = null;
    let stopGate: (() => void) | null = null;

    /** La puerta de arranque sigue ahí y el visitante aún no ha elegido en esta visita. */
    const gatePending = (): boolean =>
      !audio.gate.resolved &&
      appStore.getState().sound.gateChoice === null &&
      document.querySelector("[data-boot-gate]") !== null;

    /** Aviso visible: sonido elegido, puerta resuelta, sin motor y sin contexto en marcha. */
    const syncLocked = () => {
      const ctx = getAudioContext();
      setLocked(!disposed && appStore.getState().sound.enabled && !gatePending() && !hasEngine() && (!ctx || ctx.state !== "running"));
    };

    const load = async () => {
      if (loading || disposed) return;
      loading = true;
      const ctx = getAudioContext();
      if (!ctx || ctx.state !== "running") {
        // Sin contexto en marcha: se reintenta en el primer gesto del visitante.
        loading = false;
        waitForGesture();
        syncLocked();
        return;
      }
      const { startEngine } = await import("@/audio/engine");
      if (!disposed) await startEngine(ctx);
      syncLocked();
    };

    /** Botón «Activar sonido»: el clic es la activación que el navegador exige. */
    activateRef.current = () => {
      void audioUnlock().then(() => {
        if (appStore.getState().sound.enabled && !gatePending()) void load();
        syncLocked();
      });
    };

    const waitForGesture = () => {
      if (cancelGesture) return;
      cancelGesture = onUnlockGesture(() => {
        cancelGesture = null;
        void audioUnlock().then(() => {
          if (appStore.getState().sound.enabled && !gatePending()) void load();
          syncLocked();
        });
      });
    };

    const tryStart = () => {
      if (disposed || !appStore.getState().sound.enabled) return;
      if (gatePending()) {
        // Esperar a la elección o al fin del arranque; entre tanto no se carga ni suena nada.
        stopGate ??= audio.onGate(() => {
          stopGate?.();
          stopGate = null;
          tryStart();
        });
        return;
      }
      void load();
    };

    // Publicar la fase activa: el motor arranca en la correcta y cuantiza los cambios al compás.
    const emitPhase = (phase: string) => audio.emit(`phase:${phase}` as `phase:source`);
    emitPhase(appStore.getState().phase);

    tryStart();
    syncLocked();
    const stopStore = appStore.subscribe((state, prev) => {
      if (state.phase !== prev.phase) emitPhase(state.phase);
      if (state.sound.enabled && !prev.sound.enabled) tryStart();
      if (state.sound.enabled !== prev.sound.enabled || state.sound.gateChoice !== prev.sound.gateChoice) syncLocked();
    });
    // El aviso sigue al estado del motor y de la puerta.
    const stopRegistry = audio.onRegistryChange(syncLocked);
    const stopGateWatch = audio.onGate(syncLocked);

    return () => {
      disposed = true;
      stopRegistry();
      stopGateWatch();
      stopStore();
      stopGate?.();
      cancelGesture?.();
    };
  }, []);

  return (
    <div role="status" aria-live="polite" className="pointer-events-none fixed bottom-4 left-4 z-[60]">
      {locked ? (
        <button
          type="button"
          data-sound-unlock
          onClick={() => activateRef.current()}
          className="pointer-events-auto rounded-md border border-border bg-surface-elevated px-3 py-1.5 font-mono text-xs text-fg shadow-lg hover:border-accent"
        >
          {t("unlock")}
        </button>
      ) : null}
    </div>
  );
}
