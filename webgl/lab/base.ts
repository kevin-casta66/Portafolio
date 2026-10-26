import type { Group } from "three/webgpu";
import type { FrameState } from "../core/frame";
import { twinPosition, type Twin } from "../core/twins";
import type { Params } from "./definitions";
import type { LabInput } from "./store";

/** Un experimento vivo dentro del escenario (gemelo) de su tarjeta. */
export interface Experiment {
  group: Group;
  /** Compute shaders del experimento (solo tier alto con WebGPU); se ejecutan antes del render. */
  compute?(renderer: import("three/webgpu").WebGPURenderer): void;
  /** Devuelve `true` mientras siga animándose (el motor pide otro frame). */
  update(frame: FrameState, twin: Twin, input: LabInput, params: Params): boolean;
  dispose(): void;
}

export interface ExperimentContext {
  id: string;
  /** Datos de la visualización (solo `dataviz`), leídos del DOM del escenario. */
  dataset: { label: string; years: number; projects: number }[];
}

/** Coloca el grupo sobre el gemelo: centro del rectángulo; la escala la fija cada experimento. */
export function placeOnTwin(group: Group, twin: Twin): void {
  const pos = twinPosition(twin.rect);
  group.position.set(pos.x, pos.y, 0);
  group.visible = twin.visible;
}

export type ExperimentFactory = (ctx: import("../core/types").EngineContext, exp: ExperimentContext) => Experiment | Promise<Experiment>;
