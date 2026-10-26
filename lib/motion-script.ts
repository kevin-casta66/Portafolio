/**
 * Script inline mínimo para `<head>` (convención de «estado inicial seguro», design D11):
 *
 *  - Añade `js-motion` a `<html>` antes del primer pintado. Es la ÚNICA señal que usa el CSS para
 *    estilos que solo tienen sentido con JavaScript (puerta de arranque, capas de animación). El HTML
 *    SSR siempre está en su estado final: ningún texto esencial se entrega oculto ni en CSS ni en
 *    atributos; los estados iniciales «ocultos» los aplica JS (`gsap.set` / `from`) y se revierten al
 *    limpiar.
 *  - Añade `boot-pending` solo cuando la puerta de arranque va a mostrarse (home, sin Vista Rápida y
 *    sin ancla de sección). Es una cortina CSS que evita el destello del hero antes de que monte la
 *    puerta; BootGate la retira al montar y un temporizador de seguridad la retira siempre, de modo
 *    que si el JS falla el contenido nunca queda oculto.
 *
 * Debe pesar < 1 KB y no depender de nada.
 */
export const motionScript = `(function(){var d=document.documentElement;d.classList.add("js-motion");try{var l=location,h=l.hash;if(/^\\/(es|en)\\/?$/.test(l.pathname)&&!/[?&]view=quick/.test(l.search)&&(!h||h==="#content")){d.classList.add("boot-pending");setTimeout(function(){d.classList.remove("boot-pending")},4500)}}catch(e){}})();`;
