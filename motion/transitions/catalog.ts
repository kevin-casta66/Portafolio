/**
 * Catálogo de transiciones T1–T11: refleja las filas de `docs/MOTION-SPEC.md` (un test las compara).
 * Si cambias un valor aquí, actualiza esa tabla en el mismo commit (y viceversa).
 */
export interface CatalogEntry {
  id: string;
  name: string;
  /** Disparador de la tabla. */
  trigger: "carga" | "scroll-scrub" | "hold" | "clic" | "scroll";
  /** Token CSS del easing principal. */
  easing: "--ease-in-expo" | "--ease-scene";
  /** Change que implementa la versión principal. */
  owner: string;
  /** ¿Este change implementa la versión DOM/SVG? */
  domHere: boolean;
}

export const CATALOG: readonly CatalogEntry[] = [
  {
    id: "T1",
    name: "Puerta de arranque",
    trigger: "carga",
    easing: "--ease-in-expo",
    owner: "03",
    domHere: true,
  },
  {
    id: "T2",
    name: "Tokenización «Gommage» (SOURCE→LEXER)",
    trigger: "scroll-scrub",
    easing: "--ease-scene",
    owner: "04",
    domHere: true,
  },
  {
    id: "T3",
    name: "Ensamblaje del árbol (LEXER→PARSER)",
    trigger: "scroll-scrub",
    easing: "--ease-scene",
    owner: "04",
    domHere: true,
  },
  {
    id: "T4",
    name: "Aplanado al túnel (PARSER→BYTECODE)",
    trigger: "scroll-scrub",
    easing: "--ease-scene",
    owner: "04",
    domHere: true,
  },
  {
    id: "T5",
    name: "Carga en núcleos (BYTECODE→RUNTIME)",
    trigger: "scroll-scrub",
    easing: "--ease-scene",
    owner: "04",
    domHere: true,
  },
  {
    id: "T6",
    name: "Hold-to-Execute (RUNTIME→caso)",
    trigger: "hold",
    easing: "--ease-scene",
    owner: "05",
    domHere: false,
  },
  {
    id: "T7",
    name: "Cambio de layout Grid/Lista/Heap (RUNTIME)",
    trigger: "clic",
    easing: "--ease-in-expo",
    owner: "03",
    domHere: true,
  },
  {
    id: "T8",
    name: "Rasterización (RUNTIME→GPU)",
    trigger: "scroll-scrub",
    easing: "--ease-scene",
    owner: "04",
    domHere: true,
  },
  {
    id: "T9",
    name: "Convergencia (GPU→DISPLAY)",
    trigger: "scroll-scrub",
    easing: "--ease-scene",
    owner: "04",
    domHere: true,
  },
  {
    id: "T10",
    name: "Transiciones de UI (tema, filtros, menú)",
    trigger: "clic",
    easing: "--ease-in-expo",
    owner: "05",
    domHere: false,
  },
  {
    id: "T11",
    name: "Glitch SDF (cambio de fase y 404)",
    trigger: "scroll",
    easing: "--ease-scene",
    owner: "04",
    domHere: true,
  },
] as const;

export const catalogEntry = (id: string): CatalogEntry | undefined =>
  CATALOG.find((e) => e.id === id);
