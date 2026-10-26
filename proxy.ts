import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

// Next.js 16: «middleware» se llama «proxy». Redirige `/` al idioma preferido (es por defecto).
export default createMiddleware(routing);

export const config = {
  matcher: "/((?!api|_next|_vercel|.*\..*).*)",
};
