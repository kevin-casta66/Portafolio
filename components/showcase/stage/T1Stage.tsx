"use client";

import { useEffect, useState } from "react";
import { BootGate } from "@/components/phases/Boot/BootGate";

/** Puente con el reproductor de T1: `bump()` desmonta y vuelve a montar la puerta (= Replay). */
export const t1Stage: { bump: (() => void) | null } = { bump: null };

/**
 * Escenario de T1 (change 08): la puerta de arranque REAL (`BootGate`) en modo demo (no marca la sesión
 * como arrancada) sobre el hero. Cada `bump()` la monta de nuevo y repite la secuencia completa.
 */
export function T1Stage({ projectCount }: { projectCount: number }) {
  const [run, setRun] = useState(0);
  useEffect(() => {
    t1Stage.bump = () => setRun((n) => n + 1);
    return () => {
      t1Stage.bump = null;
    };
  }, []);
  // La primera puerta se monta al pedir el Replay (no antes): el póster es el estado final.
  return run > 0 ? <BootGate key={run} projectCount={projectCount} demo /> : null;
}
