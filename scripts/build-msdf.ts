import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { MSDF_FONTS, msdfCharset } from "../webgl/text/charset";

/**
 * Genera los atlas MSDF (texto de campo de distancia multicanal) de Unbounded y JetBrains Mono con
 * `msdf-bmfont-xml` (msdfgen) y el subset de glifos es/en, en `public/webgl/msdf/`.
 * Las fuentes de origen salen de `@fontsource/*` (woff2 → ttf con wawoff2). Se ejecuta con
 * `pnpm webgl:msdf`; el resultado se versiona (el test `charset.test.ts` comprueba la cobertura).
 */
const require = createRequire(import.meta.url);
const generateBMFont = require("msdf-bmfont-xml") as (
  font: string,
  options: Record<string, unknown>,
  cb: (
    error: Error | null,
    textures: { filename: string; texture: Buffer }[],
    font: { data: string },
  ) => void,
) => void;
const wawoff2 = require("wawoff2") as { decompress(input: Uint8Array): Promise<Uint8Array> };

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "public", "webgl", "msdf");
const work = mkdtempSync(join(tmpdir(), "compile-msdf-"));
mkdirSync(outDir, { recursive: true });

function generate(name: string, ttf: string, charset: string): Promise<void> {
  return new Promise((resolve, reject) => {
    generateBMFont(
      ttf,
      {
        charset,
        outputType: "json",
        fieldType: "msdf",
        fontSize: 48,
        textureSize: [512, 512],
        texturePadding: 2,
        distanceRange: 6,
        smartSize: true,
        pot: true,
        roundDecimal: 2,
      },
      (error, textures, font) => {
        if (error) return reject(error);
        if (textures.length !== 1) return reject(new Error(`${name}: el atlas ocupa ${textures.length} páginas`));
        writeFileSync(join(outDir, `${name}.png`), textures[0]!.texture);
        const json = JSON.parse(font.data) as { pages: string[] };
        json.pages = [`${name}.png`];
        writeFileSync(join(outDir, `${name}.json`), JSON.stringify(json));
        console.log(`msdf: ${name} (${textures[0]!.texture.length} bytes de PNG)`);
        resolve();
      },
    );
  });
}

for (const font of MSDF_FONTS) {
  const woff2 = readFileSync(join(root, "node_modules", font.package, "files", font.file));
  const ttf = await wawoff2.decompress(new Uint8Array(woff2));
  const ttfPath = join(work, `${font.name}.ttf`);
  writeFileSync(ttfPath, ttf);
  await generate(font.name, ttfPath, msdfCharset(font.name));
}
