import { STORAGE_KEYS } from "./store";

/**
 * Script bloqueante mínimo para `<head>`: aplica el tema (elección guardada o preferencia del
 * sistema) antes del primer pintado, así no hay destello del tema contrario. Debe pesar < 1 KB.
 */
export const themeScript = `(function(){var d=document.documentElement,t=null;try{t=localStorage.getItem("${STORAGE_KEYS.theme}")}catch(e){}if(t!=="light"&&t!=="dark"){try{t=matchMedia("(prefers-color-scheme: light)").matches?"light":"dark"}catch(e){t="dark"}}d.setAttribute("data-theme",t)})();`;
