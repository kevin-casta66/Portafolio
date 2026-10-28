import { t6 } from "@/motion/shared";
import { heapView } from "./heap/state";
import { sectionRange } from "../core/layout";
import type { SceneDef } from "../core/types";
import { textRanges } from "./text-ranges";

/**
 * Registro de escenas por fase (design D4): cada escena declara su rango de scroll y un `load()` con
 * importación dinámica, así su código solo se pide al acercarse a su fase (un chunk por escena).
 * Orden de composición: fase < transición < texto (MSDF).
 */
export const SCENE_DEFS: readonly SceneDef[] = [
  {
    id: "source",
    order: 10,
    range: () => sectionRange("source"),
    load: () => import("./source").then((m) => m.createSourceScene),
  },
  {
    // Tubos iluminados del árbol de habilidades: crecen con el scroll y permanecen en PARSER. Solo en
    // escritorio (en móvil el árbol es vertical y colapsable, sin tubos).
    id: "parser",
    order: 15,
    range: () => sectionRange("parser"),
    enabled: (preset, frame) => preset.scenes3d && !frame.reduced && frame.viewW >= 768,
    load: () => import("./parser").then((m) => m.createParserScene),
  },
  {
    id: "runtime",
    order: 20,
    range: () => sectionRange("runtime"),
    load: () => import("./runtime").then((m) => m.createRuntimeScene),
  },
  {
    // Memory Heap (change 07): existe solo mientras la ruta /heap está activa (la isla DOM lo declara en
    // `heapView`); al salir el rango vuelve a `null` y el motor libera sus mallas.
    id: "heap",
    order: 25,
    range: () => (heapView.active ? { start: -Infinity, end: Infinity } : null),
    preload: 0,
    load: () => import("./heap/scene").then((m) => m.createHeapScene),
  },
  {
    id: "gpu",
    order: 30,
    range: () => sectionRange("gpu"),
    load: () => import("./gpu").then((m) => m.createGpuScene),
  },
  {
    id: "lab",
    order: 35,
    range: () => sectionRange("gpu"),
    // Sin 3D de escena (tier bajo) cada experimento muestra su imagen estática.
    enabled: (preset) => preset.scenes3d,
    load: () => import("./lab").then((m) => m.createLabScene),
  },
  {
    id: "display",
    order: 40,
    range: () => sectionRange("display"),
    load: () => import("./display").then((m) => m.createDisplayScene),
  },
  {
    id: "text",
    order: 90,
    range: textRanges,
    load: () => import("./text").then((m) => m.createTextScene),
  },
  {
    // T6 (tarjeta ⇄ cabecera del caso): existe solo mientras la transición está armada o en curso; al
    // terminar se suelta y el motor libera su malla y su material (no usa render targets ni texturas).
    id: "t6",
    order: 95,
    range: () => (t6.armed || t6.state.visible ? { start: -Infinity, end: Infinity } : null),
    preload: 0,
    load: () => import("../transitions/T6.scene").then((m) => m.createT6Scene),
  },
];
