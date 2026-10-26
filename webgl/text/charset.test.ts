import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { content } from "@/lib/content";
import en from "@/messages/en.json";
import es from "@/messages/es.json";
import { charsetSet, firstMissingGlyph, msdfCharset, type MsdfFontName } from "./charset";

const FONTS: MsdfFontName[] = ["unbounded-600", "jetbrains-mono-400"];

function atlasChars(font: MsdfFontName): Set<string> {
  const file = join(process.cwd(), "public", "webgl", "msdf", `${font}.json`);
  const json = JSON.parse(readFileSync(file, "utf8")) as { chars: { char: string }[] };
  return new Set(json.chars.map((c) => c.char));
}

/** Textos que se dibujan en 3D con Unbounded: títulos de fase, nombre y título de la 404. */
function titleTexts(): string[] {
  const out: string[] = [content.profile.name];
  for (const messages of [es, en] as Record<string, Record<string, unknown>>[]) {
    for (const ns of ["Lexer", "Parser", "Bytecode", "Runtime", "Gpu", "Display", "NotFound"]) {
      const title = messages[ns]?.["title"];
      if (typeof title === "string") out.push(title);
    }
  }
  return out;
}

describe("atlas MSDF", () => {
  it("el atlas generado contiene exactamente los glifos declarados en charset.ts", () => {
    for (const font of FONTS) {
      const declared = [...charsetSet(font)].filter((c) => c.trim() !== "");
      const actual = atlasChars(font);
      for (const ch of declared) expect(actual.has(ch), `${font}: falta «${ch}» en el atlas`).toBe(true);
    }
  });

  it("todos los títulos de fase (es/en), el nombre y el título de la 404 están cubiertos", () => {
    const atlas = atlasChars("unbounded-600");
    for (const text of titleTexts()) {
      for (const ch of text.normalize("NFC")) {
        if (ch.trim() === "") continue;
        expect(atlas.has(ch), `«${ch}» de «${text}» no está en el atlas`).toBe(true);
      }
    }
  });

  it("la línea de código del hero está cubierta por el atlas monoespaciado", () => {
    const line = `const dev = new Developer("${content.profile.name}")`;
    expect(firstMissingGlyph(line, "jetbrains-mono-400")).toBeNull();
  });

  it("detecta un carácter fuera del atlas (el test falla al añadirlo)", () => {
    expect(firstMissingGlyph("Habilidades", "unbounded-600")).toBeNull();
    expect(firstMissingGlyph("Habilidades ✨", "unbounded-600")).toBe("✨");
    expect(msdfCharset("unbounded-600")).toContain("ñ");
  });
});
