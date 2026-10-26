/**
 * Copia los WOFF2 variables (subsets latin y latin-ext) de los paquetes @fontsource-variable/*
 * a public/fonts/. Uso: `pnpm fonts:sync`. Licencia de las tres familias: OFL-1.1.
 */
import { copyFileSync, mkdirSync, statSync } from "node:fs";
import { join } from "node:path";

const families = [
  { pkg: "unbounded", file: "unbounded" },
  { pkg: "geist", file: "geist" },
  { pkg: "jetbrains-mono", file: "jetbrains-mono" },
] as const;
const subsets = ["latin", "latin-ext"] as const;

const out = join(process.cwd(), "public", "fonts");
mkdirSync(out, { recursive: true });

for (const { pkg, file } of families) {
  for (const subset of subsets) {
    const name = `${file}-${subset}-wght-normal.woff2`;
    const from = join(process.cwd(), "node_modules", "@fontsource-variable", pkg, "files", name);
    copyFileSync(from, join(out, name));
    console.log(`${name}  ${(statSync(from).size / 1024).toFixed(1)} KB`);
  }
}
