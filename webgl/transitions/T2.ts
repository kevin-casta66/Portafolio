import type { CanvasTransition } from "./state";

/**
 * T2 · SOURCE → LEXER (canvas, «Gommage»). La línea de código se disuelve de izquierda a derecha;
 * cada glifo emite partículas que se reagrupan en los tokens coloreados del Lexer. En el DOM, cada
 * token de la línea cede el paso a las partículas en el instante en que su borde de disolución lo
 * alcanza, y cada token del Lexer aparece cuando llegan las partículas. Reducida/tier bajo: usan la
 * versión del change 03 (fundido escalonado / fragmentación DOM).
 */
/** Todo en unidades de progreso (0..1), no en segundos: la timeline la recorre el scroll. */
export const DISSOLVE_SPAN = 0.38; // fracción del recorrido que tarda el frente en cruzar la línea
export const DISSOLVE_SETTLE = 0.5; // fracción que dura el viaje de una partícula
const HIDE = 0.04; // cuánto tarda un token en ceder el paso a sus partículas
const FORM_AT = 0.84; // cuándo empiezan a formarse los tokens del Lexer
const FORM_LEN = 0.06;
const FORM_SPREAD = 0.1; // reparto total del escalonado (el último termina en 1)

export const T2: CanvasTransition = {
  id: "T2",
  order: 100,
  dom(ctx, tl) {
    const tokens = Array.from(ctx.root.querySelectorAll<HTMLElement>("#source [data-token]"));
    const lexerTokens = Array.from(
      ctx.root.querySelectorAll<HTMLElement>("#lexer [data-anim='token']"),
    );
    if (tokens.length === 0) return;
    const rects = tokens.map((el) => el.getBoundingClientRect());
    const x0 = Math.min(...rects.map((r) => r.left));
    const x1 = Math.max(...rects.map((r) => r.right));
    // El token deja de verse justo cuando el frente de disolución llega a su borde izquierdo.
    tokens.forEach((el, i) => {
      const along = ((rects[i] as DOMRect).left - x0) / Math.max(1, x1 - x0);
      tl.to(el, { opacity: 0, duration: HIDE }, along * DISSOLVE_SPAN);
    });
    // Los tokens del Lexer se forman cuando las partículas llegan.
    if (lexerTokens.length > 0) {
      tl.fromTo(
        lexerTokens,
        { opacity: 0 },
        { opacity: 1, duration: FORM_LEN, stagger: { amount: FORM_SPREAD } },
        FORM_AT,
      );
    }
  },
  load: () => import("./T2.scene").then((m) => m.createT2Scene),
};
