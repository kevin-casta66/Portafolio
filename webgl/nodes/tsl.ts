/* eslint-disable @typescript-eslint/no-explicit-any */
import * as TSLModule from "three/tsl";

/**
 * Acceso a TSL con tipado laxo. Los tipos de `three/tsl` distinguen `float`/`vec2`/`vec3` en cada
 * operador y obligan a conversiones manuales en cada línea de un shader; aquí los grafos de nodos se
 * escriben con `N` (cualquier nodo) y la validación la hace el compilador de shaders en ejecución
 * (cada nodo se prueba en el prototipo de su transición). Todo el código de GPU del proyecto está en
 * TSL: no hay GLSL crudo ni materiales de shader clásicos (lo impone `pnpm check:no-glsl` y ESLint).
 */
export type N = any;
export const TSL = TSLModule as unknown as Record<string, any>;
