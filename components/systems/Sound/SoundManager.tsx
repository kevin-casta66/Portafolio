"use client";

import { useEffect } from "react";
import { audio } from "@/audio";
import { armAudioUnlockOnFirstGesture, audioUnlock, getAudioContext } from "@/lib/audio";
import { appStore } from "@/lib/store";

/**
 * Puente fino entre la app y el motor de audio (change 08b). Se monta cuando el sonido se activa por
 * primera vez y NO contiene audio: decide CUÁNDO cargar el motor (`audio/engine.ts`, con `tone` en un
 * chunk propio) y le entrega el `AudioContext` que desbloqueó el gesto del visitante.
 *
 *  - Nunca suena nada antes de la elección en la puerta: si la puerta está visible y el visitante aún no
 *    eligió en esta visita, el motor NO se carga aunque exista una preferencia guardada de otra visita;
 *    espera a la elección (`gate:sound|silent`) o al fin del arranque (`boot:done`, p. ej. «Saltar»).
 *  - Sin `AudioContext` en marcha (preferencia guardada, sin gesto todavía) espera al primer gesto.
 *  - La fase activa del store se publica como `phase:<id>` (el motor la cuantiza al compás).
 *  - Silencio, volumen, música/efectos, pestaña oculta, scroll y movimiento reducido los gestiona el motor.
 */
export default function SoundManager() {
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

    const load = async () => {
      if (loading || disposed) return;
      loading = true;
      const ctx = getAudioContext();
      if (!ctx || ctx.state !== "running") {
        // Sin contexto en marcha: se reintenta en el primer gesto del visitante.
        loading = false;
        waitForGesture();
        return;
      }
      const { startEngine } = await import("@/audio/engine");
      if (!disposed) await startEngine(ctx);
    };

    const waitForGesture = () => {
      if (cancelGesture) return;
      cancelGesture = armAudioUnlockOnFirstGesture();
      const onGesture = () => {
        cancelGesture = null;
        void audioUnlock().then(() => {
          if (appStore.getState().sound.enabled && !gatePending()) void load();
        });
      };
      for (const type of ["pointerdown", "keydown", "touchstart"] as const)
        window.addEventListener(type, onGesture, { capture: true, once: true, passive: true });
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
    const stopStore = appStore.subscribe((state, prev) => {
      if (state.phase !== prev.phase) emitPhase(state.phase);
      if (state.sound.enabled && !prev.sound.enabled) tryStart();
    });

    return () => {
      disposed = true;
      stopStore();
      stopGate?.();
      cancelGesture?.();
    };
  }, []);

  return null;
}
