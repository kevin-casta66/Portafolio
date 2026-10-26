import { useEffect, useRef } from "react";
import { prefersReducedMotion } from "./reduced";
import { duration } from "./tokens";

/**
 * Hold-to-Execute (T6): la lógica de «mantener pulsado» separada en dos capas.
 *
 *  1. `createHoldMachine`: máquina de estados pura (sin DOM) con temporizadores inyectables, así se
 *     prueba con reloj simulado: hold completo, clic corto, cancelación por soltar y por desplazamiento.
 *  2. `useHold`: la conecta al DOM con Pointer Events (ratón, lápiz y táctil unificados) y teclado, por
 *     DELEGACIÓN sobre los elementos `[data-hold]` (un único juego de listeners para todas las tarjetas,
 *     también las que el filtro añade después).
 *
 * Reglas (spec `hold-to-execute`): umbral 800 ms · una pulsación < 200 ms sin desplazarse es un clic
 * (versión corta) · soltar entre medias cancela · desplazarse > 10 px cancela (deja pasar el scroll) ·
 * teclado: Enter = corta, mantener Espacio = completa (sin que la página haga scroll) · con movimiento
 * reducido cualquier activación abre con un fundido y no hay anillo.
 */
export type HoldKind = "pointer" | "keyboard";
export type CancelReason = "release" | "move" | "leave" | "cancel" | "blur" | "click";
export type ActivateHow = "click" | "enter" | "reduced";

export interface HoldCallbacks<T> {
  /** Empieza el hold: aquí arranca el anillo (`x`, `y` en px de viewport). */
  onStart(target: T, at: { x: number; y: number }, kind: HoldKind): void;
  /** Se mantuvo el tiempo completo: versión completa de la transición. */
  onComplete(target: T, kind: HoldKind): void;
  /** El hold se canceló. `click` = fue un clic corto (el anillo se retira sin rebote). */
  onCancel(target: T, reason: CancelReason, kind: HoldKind): void;
  /** Apertura inmediata (versión corta, o fundido con movimiento reducido). */
  onActivate(target: T, how: ActivateHow): void;
}

export interface HoldConfig {
  holdMs: number;
  clickMs: number;
  tolerancePx: number;
  now: () => number;
  /** Programa `fn` dentro de `ms` y devuelve la función que lo cancela. */
  schedule: (fn: () => void, ms: number) => () => void;
  reduced: () => boolean;
}

const defaultConfig = (): HoldConfig => ({
  holdMs: duration.hold,
  clickMs: duration.holdClick,
  tolerancePx: 10,
  now: () => Date.now(),
  schedule: (fn, ms) => {
    const id = setTimeout(fn, ms);
    return () => clearTimeout(id);
  },
  reduced: prefersReducedMotion,
});

interface Press<T> {
  target: T;
  kind: HoldKind;
  x: number;
  y: number;
  startedAt: number;
  stop: () => void;
  completed: boolean;
}

export interface HoldMachine<T> {
  readonly active: boolean;
  /** Dato del hold en curso (para el anillo): `null` si no hay. */
  readonly current: { target: T; kind: HoldKind; completed: boolean } | null;
  press(target: T, x: number, y: number, kind: HoldKind): void;
  move(x: number, y: number): void;
  release(): void;
  cancel(reason: CancelReason): void;
  /** Apertura sin hold (Enter, o clic en el enlace «Caso de estudio»). */
  activate(target: T, how: ActivateHow): void;
}

export function createHoldMachine<T>(
  callbacks: HoldCallbacks<T>,
  overrides: Partial<HoldConfig> = {},
): HoldMachine<T> {
  const cfg: HoldConfig = { ...defaultConfig(), ...overrides };
  let press: Press<T> | null = null;

  const end = (): Press<T> | null => {
    const p = press;
    press = null;
    p?.stop();
    return p;
  };

  return {
    get active() {
      return press !== null;
    },
    get current() {
      return press && { target: press.target, kind: press.kind, completed: press.completed };
    },

    press(target, x, y, kind) {
      if (press) return;
      const reduced = cfg.reduced();
      const next: Press<T> = {
        target,
        kind,
        x,
        y,
        startedAt: cfg.now(),
        stop: () => {},
        completed: false,
      };
      press = next;
      // Con movimiento reducido no hay anillo ni cuenta atrás: solo se espera a soltar.
      if (reduced) return;
      next.stop = cfg.schedule(() => {
        if (press !== next) return;
        next.completed = true;
        callbacks.onComplete(next.target, next.kind);
      }, cfg.holdMs);
      callbacks.onStart(target, { x, y }, kind);
    },

    move(x, y) {
      if (!press || press.kind !== "pointer" || press.completed) return;
      if (Math.hypot(x - press.x, y - press.y) <= cfg.tolerancePx) return;
      const p = end();
      if (p && !cfg.reduced()) callbacks.onCancel(p.target, "move", p.kind);
    },

    release() {
      const p = end();
      if (!p || p.completed) return; // tras un hold completo, soltar no hace nada
      if (cfg.reduced()) {
        callbacks.onActivate(p.target, "reduced");
        return;
      }
      const elapsed = cfg.now() - p.startedAt;
      if (p.kind === "pointer" && elapsed < cfg.clickMs) {
        callbacks.onCancel(p.target, "click", p.kind);
        callbacks.onActivate(p.target, "click");
        return;
      }
      callbacks.onCancel(p.target, "release", p.kind);
    },

    cancel(reason) {
      const p = end();
      if (p && !p.completed && !cfg.reduced()) callbacks.onCancel(p.target, reason, p.kind);
    },

    activate(target, how) {
      callbacks.onActivate(target, cfg.reduced() ? "reduced" : how);
    },
  };
}

// ───────────────────────────── conexión con el DOM ─────────────────────────────

const SELECTOR = "[data-hold]";
/** Controles propios de la tarjeta: sus pulsaciones nunca empiezan un hold. */
const INTERACTIVE = "a, button, input, select, textarea, summary, label, [role='button']";

const cardOf = (target: EventTarget | null): HTMLElement | null =>
  target instanceof Element ? target.closest<HTMLElement>(SELECTOR) : null;

function isPlainClick(event: MouseEvent): boolean {
  return event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
}

/**
 * Engancha el hold a todas las tarjetas `[data-hold]` del documento mientras el componente está
 * montado. Los callbacks se leen por ref: cambiar su identidad no reconecta los listeners.
 */
export function useHold(callbacks: HoldCallbacks<HTMLElement>): void {
  const ref = useRef(callbacks);
  useEffect(() => {
    ref.current = callbacks;
  });

  useEffect(() => {
    const machine = createHoldMachine<HTMLElement>({
      onStart: (t, at, k) => ref.current.onStart(t, at, k),
      onComplete: (t, k) => ref.current.onComplete(t, k),
      onCancel: (t, r, k) => ref.current.onCancel(t, r, k),
      onActivate: (t, h) => ref.current.onActivate(t, h),
    });

    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0 || !event.isPrimary) return;
      const card = cardOf(event.target);
      if (!card || (event.target as Element).closest(INTERACTIVE)) return;
      machine.press(card, event.clientX, event.clientY, "pointer");
    };
    const onPointerMove = (event: PointerEvent) => {
      const current = machine.current;
      if (!current || current.kind !== "pointer") return;
      machine.move(event.clientX, event.clientY);
      // Ratón/lápiz: salir de la tarjeta cancela (el táctil mantiene la captura implícita).
      if (event.pointerType !== "touch" && machine.active) {
        const r = current.target.getBoundingClientRect();
        const inside =
          event.clientX >= r.left && event.clientX <= r.right && event.clientY >= r.top && event.clientY <= r.bottom;
        if (!inside) machine.cancel("leave");
      }
    };
    const onPointerUp = () => machine.release();
    const onPointerCancel = () => machine.cancel("cancel"); // el navegador toma el gesto (scroll táctil)

    const onKeyDown = (event: KeyboardEvent) => {
      const card = event.target instanceof HTMLElement && event.target.matches(SELECTOR) ? event.target : null;
      if (!card || event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.key === "Enter") {
        event.preventDefault();
        if (!event.repeat) machine.activate(card, "enter");
      } else if (event.key === " " || event.code === "Space") {
        event.preventDefault(); // la página no hace scroll con Espacio sobre la tarjeta
        if (event.repeat) return;
        const r = card.getBoundingClientRect();
        machine.press(card, r.left + r.width / 2, r.top + r.height / 2, "keyboard");
      }
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if ((event.key === " " || event.code === "Space") && machine.current?.kind === "keyboard") {
        event.preventDefault();
        machine.release();
      }
    };

    // El enlace «Caso de estudio» de la tarjeta usa la versión corta de la transición (el href sigue
    // siendo un enlace real: sin JavaScript, con Ctrl/Cmd/clic central o en otra pestaña navega normal).
    const onClick = (event: MouseEvent) => {
      const link = event.target instanceof Element ? event.target.closest("a[data-hold-link]") : null;
      const card = link?.closest<HTMLElement>(SELECTOR);
      if (!link || !card || event.defaultPrevented || !isPlainClick(event)) return;
      event.preventDefault();
      event.stopPropagation(); // que el `Link` de Next no navegue por su cuenta
      machine.activate(card, "click");
    };
    // Menú contextual (pulsación larga en Android): no debe aparecer mientras se mantiene.
    const onContextMenu = (event: Event) => {
      if (machine.active) event.preventDefault();
    };
    const onBlur = () => {
      if (machine.current?.kind === "keyboard") machine.cancel("blur");
    };
    const onHidden = () => machine.cancel("cancel");

    document.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerCancel);
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("keyup", onKeyUp);
    document.addEventListener("click", onClick, true); // en captura: antes que el `Link` de Next
    document.addEventListener("contextmenu", onContextMenu);
    document.addEventListener("focusout", onBlur);
    document.addEventListener("visibilitychange", onHidden);
    return () => {
      machine.cancel("cancel");
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerCancel);
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("keyup", onKeyUp);
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("contextmenu", onContextMenu);
      document.removeEventListener("focusout", onBlur);
      document.removeEventListener("visibilitychange", onHidden);
    };
  }, []);
}
