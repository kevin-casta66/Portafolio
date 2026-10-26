import type { CanvasTransition } from "./state";
import { T2 } from "./T2";
import { T3 } from "./T3";
import { T4 } from "./T4";
import { T5 } from "./T5";
import { T8 } from "./T8";
import { T9 } from "./T9";

/** Transiciones con versión en canvas (T11, el glitch de títulos, vive en la capa de texto). */
export const CANVAS_TRANSITIONS: readonly CanvasTransition[] = [T2, T3, T4, T5, T8, T9];
