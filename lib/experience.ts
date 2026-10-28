/**
 * Modo de experiencia (change 09, design D1). Punto ÚNICO de decisión para "¿animación completa,
 * movimiento reducido o 2D sin WebGL?". Ningún componente debe leer `matchMedia` por su cuenta.
 *
 * API
 *  - `type ExperienceMode = "full" | "reduced" | "fallback2d"`.
 *  - `type ActiveBackend = "webgpu" | "webgl2" | "none"` (el store guarda además `"pending"` hasta
 *    que el motor 3D hace `init()`; `store.graphics.backend`, lo publica `setBackend`).
 *  - `deriveExperience(input): ExperienceMode` — función pura. Prioridad (manual > sistema >
 *    capacidad > fps):
 *      1. preferencia de movimiento = `manual` (`"reduced"|"full"`, sessionStorage) ?? `system`
 *         (`prefers-reduced-motion`). Si es reduced -> `"reduced"`.
 *      2. capacidad: backend `"none"` (sin WebGL2/WebGPU o GPU bajo el mínimo) o contexto perdido
 *         (temporal) -> `"fallback2d"`.
 *      3. fps: `fpsDegraded` (fps < 30 durante 3 s en tier bajo; sessionStorage) -> `"fallback2d"`.
 *      4. si nada aplica -> `"full"`.
 *    Un `manual: "full"` anula la preferencia del sistema pero NO la capacidad ni los fps.
 *  - `experienceOf(state): ExperienceMode` — selector sobre `AppState` (úsalo con `useAppStore`).
 *  - `useExperience(): ExperienceMode` — hook (SSR y primer render: `"full"` salvo que el atributo
 *    `data-experience` ya diga `reduced`, ver abajo). `useIsReduced()` = `mode === "reduced"`.
 *  - `getExperience(): ExperienceMode` — lectura imperativa (GSAP, motor 3D…).
 *  - `onExperienceChange(cb): () => void` — suscripción imperativa (se invoca solo al cambiar).
 *  - `startExperienceSync(store?): () => void` — la llama `StoreHydrator`: mantiene `experience.system`
 *    con `matchMedia` y escribe `data-experience` en `<html>` en cada cambio.
 *  - Mutadores en el store (`lib/store.ts`): `setMotionPref(pref|null)`, `setSystemReduced`,
 *    `setContextLost(bool)` (A: pérdida/restauración de contexto), `setFpsDegraded(bool)` (A: fps),
 *    `setBackend(...)` (backend activo).
 *  - Atributo `data-experience` en `<html>`: `full | reduced | fallback2d`. El script inline de
 *    `<head>` (`lib/experience-script.ts`) lo fija ANTES del primer pintado con `reduced|full`
 *    (manual > sistema); `startExperienceSync` lo refina a `fallback2d` cuando procede.
 *    El CSS puede reaccionar con `html[data-experience="reduced"] ...`.
 */
import { useStore } from "zustand";
import { appStore, type AppState, type ExperienceInputs, type GraphicsBackend } from "./store";

export type ExperienceMode = "full" | "reduced" | "fallback2d";
export type ActiveBackend = Exclude<GraphicsBackend, "pending">;

export const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

export interface ExperienceInput extends ExperienceInputs {
  /** `"pending"` = el motor aún no ha decidido (no cuenta como falta de capacidad). */
  backend: GraphicsBackend;
}

export function deriveExperience(input: ExperienceInput): ExperienceMode {
  const reducedPref = input.manual !== null ? input.manual === "reduced" : input.system;
  if (reducedPref) return "reduced";
  if (input.backend === "none" || input.contextLost) return "fallback2d";
  if (input.fpsDegraded) return "fallback2d";
  return "full";
}

export function experienceInputOf(state: AppState): ExperienceInput {
  return { ...state.experience, backend: state.graphics.backend };
}

export function experienceOf(state: AppState): ExperienceMode {
  return deriveExperience(experienceInputOf(state));
}

export function getExperience(): ExperienceMode {
  return experienceOf(appStore.getState());
}

/** Backend activo (`pending` hasta que el motor 3D lo publica). */
export function getBackend(): GraphicsBackend {
  return appStore.getState().graphics.backend;
}

export function onExperienceChange(callback: (mode: ExperienceMode) => void): () => void {
  return appStore.subscribe((state, prev) => {
    const next = experienceOf(state);
    if (next !== experienceOf(prev)) callback(next);
  });
}

export function useExperience(): ExperienceMode {
  return useStore(appStore, experienceOf);
}

export function useIsReduced(): boolean {
  return useStore(appStore, (s) => experienceOf(s) === "reduced");
}

/** Escribe `data-experience` en `<html>` (solo si cambia, para no invalidar estilos de más). */
export function applyExperienceAttribute(mode: ExperienceMode): void {
  const root = document.documentElement;
  if (root.getAttribute("data-experience") !== mode) root.setAttribute("data-experience", mode);
}

/**
 * Sincroniza el store con `prefers-reduced-motion` y refleja el modo en `data-experience`.
 * Llamar una vez tras hidratar (el store ya leyó la elección manual y `fpsDegraded`).
 */
export function startExperienceSync(store: typeof appStore = appStore): () => void {
  const mql = window.matchMedia(REDUCED_MOTION_QUERY);
  const syncSystem = () => store.getState().setSystemReduced(mql.matches);
  syncSystem();
  mql.addEventListener("change", syncSystem);
  applyExperienceAttribute(experienceOf(store.getState()));
  const stop = store.subscribe((state, prev) => {
    const next = experienceOf(state);
    if (next !== experienceOf(prev)) applyExperienceAttribute(next);
  });
  return () => {
    mql.removeEventListener("change", syncSystem);
    stop();
  };
}
