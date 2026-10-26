import gsap from "gsap";
import { CustomEase } from "gsap/CustomEase";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";
import { Flip } from "gsap/Flip";
import { MorphSVGPlugin } from "gsap/MorphSVGPlugin";
import { Observer } from "gsap/Observer";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { springEase } from "./spring";
import { cssEase, easing } from "./tokens";

/**
 * Único punto de entrada de GSAP: registra los plugins una sola vez y crea los easings con nombre a
 * partir de los tokens de movimiento (así no hay curvas literales en ninguna animación).
 * Este módulo vive en el chunk diferido: nunca se importa desde código del bundle inicial.
 */
export const EASE = {
  inExpo: "compile-in-expo",
  scene: "compile-scene",
  spring: "compile-spring",
} as const;

let registered = false;

export function registerGsap(): void {
  if (registered) return;
  gsap.registerPlugin(
    ScrollTrigger,
    SplitText,
    Flip,
    DrawSVGPlugin,
    MorphSVGPlugin,
    CustomEase,
    Observer,
  );
  CustomEase.create(EASE.inExpo, easing.inExpo.join(","));
  CustomEase.create(EASE.scene, easing.scene.join(","));
  gsap.registerEase(EASE.spring, springEase);
  // Tras una pestaña inactiva no se «salta» la animación: el reloj sigue siendo el del ticker.
  gsap.ticker.lagSmoothing(0);
  registered = true;
}

/** Misma curva en formato CSS (para WAAPI). */
export const CSS_EASE = cssEase;

export {
  CustomEase,
  DrawSVGPlugin,
  Flip,
  MorphSVGPlugin,
  Observer,
  ScrollTrigger,
  SplitText,
  gsap,
};

/** Milisegundos → segundos (GSAP trabaja en segundos). */
export const seconds = (ms: number): number => ms / 1000;
