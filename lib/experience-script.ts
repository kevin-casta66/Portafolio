import { STORAGE_KEYS } from "./store";

/**
 * Script bloqueante mínimo para `<head>` (change 09, design D2): fija `data-experience` en `<html>`
 * antes del primer pintado, así el CSS ya conoce el modo y no hay destello de animación con
 * `prefers-reduced-motion`. Solo conoce lo que se puede leer sin cargar nada: la elección manual
 * (sessionStorage) y la preferencia del sistema -> `reduced` | `full`. El modo `fallback2d` (depende del
 * backend gráfico y de los fps) lo fija `startExperienceSync` tras hidratar. Debe pesar < 1 KB.
 */
export const experienceScript = `(function(){var d=document.documentElement,m=null;try{m=sessionStorage.getItem("${STORAGE_KEYS.motion}")}catch(e){}var r=m==="reduced";if(m!=="reduced"&&m!=="full"){try{r=matchMedia("(prefers-reduced-motion: reduce)").matches}catch(e){}}d.setAttribute("data-experience",r?"reduced":"full")})();`;
