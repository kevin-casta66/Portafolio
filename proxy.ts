import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

// Next.js 16: «middleware» se llama «proxy». Redirige `/` al idioma preferido (es por defecto).
export default createMiddleware(routing);

export const config = {
  // `stage`: escenarios de /motion (change 08), con su propio layout raíz y sin prefijo de idioma implícito.
  matcher: "/((?!api|_next|_vercel|stage|.*\..*).*)",
};
