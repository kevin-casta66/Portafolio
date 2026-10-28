import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site";

/** robots.txt: todo el sitio es público; referencia el sitemap generado desde el contenido. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
