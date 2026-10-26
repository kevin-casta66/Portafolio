import "./globals.css";

/** Respaldo global (rutas fuera de cualquier idioma). Las rutas con idioma usan `[locale]/not-found`. */
export default function GlobalNotFound() {
  return (
    <html lang="es" data-theme="dark">
      <body>
        <main className="grid-12 py-24">
          <h1 className="col-span-12 font-display text-3xl font-semibold">404</h1>
        </main>
      </body>
    </html>
  );
}
