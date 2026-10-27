"use client";

import { useEffect } from "react";
import { emit } from "@/lib/events";

/**
 * Desbloquea un logro al montarse (p. ej. `kernel_panic` en la 404). No renderiza nada: emite en el
 * bus de eventos global, que el store deduplica y persiste (idempotente).
 */
export function AchievementTrigger({ id }: { id: string }) {
  useEffect(() => {
    emit("achievement:unlock", { id });
  }, [id]);
  return null;
}
