import { appStore } from "@/lib/store";
import { EASE, SplitText, gsap, seconds } from "../gsap";
import { duration, stagger } from "../tokens";
import { qa } from "../transitions/dom";
import type { Choreography } from "./context";

/**
 * SOURCE · tecleo con autocompletado como CAPA PROGRESIVA sobre el texto SSR. La línea
 * `const dev = new Developer("…")` se teclea carácter a carácter (stagger de carácter), aparece un
 * popup de sugerencias tipo IDE tras `D…` que elige `Developer`, y el cursor de texto recoge el
 * relevo de la puerta de arranque. El texto del DOM no cambia nunca (sin `aria-live`, sin atributos
 * por carácter): el nombre, el rol y los CTAs no se tocan. Si el JS tarda o falla, todo es visible.
 */
const SUGGESTIONS = ["Developer", "Date", "Document"];
/** Si por algo la animación no termina, el texto vuelve a verse completo pasado este tiempo. */
const WATCHDOG_MS = 20_000;

export const heroChoreography: Choreography = (ctx) => {
  const figure = ctx.root.querySelector<HTMLElement>("[data-anim='editor']");
  const line = figure?.querySelector<HTMLElement>("[data-anim='code-line']");
  if (!figure || !line || ctx.reduced) return;

  const tokens = qa(line, "[data-token]");
  const split = SplitText.create(tokens, { type: "chars", aria: "none" });
  const chars = split.chars as HTMLElement[];
  if (chars.length === 0) {
    split.revert();
    return;
  }

  const originalPosition = figure.style.position;
  figure.style.position = "relative";

  const caret = document.createElement("span");
  caret.className = "hero-caret";
  caret.setAttribute("aria-hidden", "true");
  figure.appendChild(caret);

  const popup = document.createElement("div");
  popup.className = "hero-autocomplete";
  popup.setAttribute("aria-hidden", "true");
  SUGGESTIONS.forEach((label, i) => {
    const item = document.createElement("div");
    item.textContent = label;
    item.dataset.selected = String(i === 0);
    popup.appendChild(item);
  });
  figure.appendChild(popup);

  const placeAt = (x: number, y: number, h: number) => gsap.set(caret, { x, y, height: h });
  const place = (char: HTMLElement, side: "left" | "right") => {
    const r = char.getBoundingClientRect();
    const f = figure.getBoundingClientRect();
    placeAt((side === "right" ? r.right : r.left) - f.left, r.top - f.top, r.height);
  };

  const devToken = tokens.find((t) => t.dataset.token === "type");
  const devChars = chars.filter((c) => devToken?.contains(c));
  const devFirst = devChars[0] ? chars.indexOf(devChars[0]) : -1;
  const devLast = devChars.length
    ? chars.indexOf(devChars[devChars.length - 1] as HTMLElement)
    : -1;

  gsap.set(chars, { opacity: 0 });
  gsap.set(popup, { opacity: 0, y: 4 });
  place(chars[0] as HTMLElement, "left");

  const tl = gsap.timeline({ paused: true });
  const step = seconds(stagger.char);
  let t = 0;
  const type = (from: number, to: number) => {
    for (let i = from; i <= to; i++) {
      const char = chars[i] as HTMLElement;
      tl.set(char, { opacity: 1 }, t);
      tl.call(place, [char, "right"], t);
      t += step;
    }
  };

  if (devFirst > 0) {
    type(0, devFirst); // …`new D`
    // Popup de sugerencias: aparece bajo el cursor, resalta `Developer` y lo elige.
    tl.call(
      () => {
        const r = caret.getBoundingClientRect();
        const f = figure.getBoundingClientRect();
        gsap.set(popup, { x: r.left - f.left, top: r.bottom - f.top + 4 });
      },
      [],
      t,
    );
    tl.to(popup, { opacity: 1, y: 0, duration: seconds(duration.micro), ease: EASE.inExpo }, t);
    t += seconds(duration.ui);
    tl.to(popup, { opacity: 0, duration: seconds(duration.micro), ease: EASE.inExpo }, t);
    // Completa `eveloper` de golpe: es el autocompletado.
    tl.set(chars.slice(devFirst + 1, devLast + 1), { opacity: 1 }, t);
    tl.call(place, [chars[devLast] as HTMLElement, "right"], t);
    t += seconds(duration.micro);
    type(devLast + 1, chars.length - 1);
  } else {
    type(0, chars.length - 1);
  }

  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    clearTimeout(watchdog);
    split.revert(); // el DOM vuelve a ser exactamente el SSR
    // Cursor parpadeando al final de la línea.
    gsap.to(caret, { opacity: 0, repeat: -1, yoyo: true, duration: 0.55, ease: "steps(1)" });
  };
  tl.eventCallback("onComplete", finish);

  let unsubscribe: (() => void) | undefined;
  const start = () => tl.play();
  if (appStore.getState().bootDone) start();
  else {
    unsubscribe = appStore.subscribe((state) => {
      if (state.bootDone) {
        unsubscribe?.();
        start();
      }
    });
  }
  const watchdog = setTimeout(() => {
    tl.progress(1);
    finish();
  }, WATCHDOG_MS);

  ctx.onCleanup(() => {
    unsubscribe?.();
    clearTimeout(watchdog);
    tl.kill();
    gsap.killTweensOf(caret);
    if (!finished) {
      gsap.set(chars, { clearProps: "opacity" });
      split.revert();
    }
    caret.remove();
    popup.remove();
    figure.style.position = originalPosition;
  });
};
