"use client";

import { useEffect, useState, type ComponentType } from "react";
import { afterLcp } from "@/lib/after-lcp";
import type { HeapBlock, HeapDestination } from "@/lib/heap";

interface Props {
  blocks: HeapBlock[];
  skillNames: Record<string, string>;
  destinations: Record<string, HeapDestination>;
}

/**
 * Carga la isla 3D del Heap (`HeapScene`: gestos, GSAP Observer y el estado de la escena con TSL) DESPUÉS
 * del LCP y fuera del JS inicial de `/heap` (change 09, 4.13). La lista y la cuadrícula DOM de
 * `HeapExplorer` ya son la vista completa y operable; la escena solo mejora. Si el chunk no carga, no
 * ocurre nada. Igual que `WebglLoader`, que descarga el motor en el mismo momento.
 */
export function HeapSceneLoader(props: Props) {
  const [Scene, setScene] = useState<ComponentType<Props> | null>(null);

  useEffect(() => {
    let cancelled = false;
    void afterLcp()
      .then(() => import("./HeapScene"))
      .then((m) => {
        if (!cancelled) setScene(() => m.HeapScene);
      })
      .catch(() => {
        /* sin escena: la cuadrícula DOM sigue siendo la vista */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return Scene ? <Scene {...props} /> : null;
}
