import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicNodeMaterial,
} from "three/webgpu";
import type { TokenColors } from "../core/color";
import { TSL, type N } from "../nodes/tsl";
import { layoutWords, type PlacedWord } from "./glyph-layout";
import type { MsdfFont } from "./msdf-font";
import { createMsdfSampler } from "./msdf-nodes";

const { uniform, uv, vec2, vec3, positionLocal } = TSL;

/** Duración del glitch (T11): < 300 ms (`glitch-max`); coincide con la versión DOM. */
export const TITLE_GLITCH_MS = 240;
/** Saltos discretos de offset (px) de las dos capas de canal y salto de la textura SDF. */
const GLITCH_STEPS = [
  { a: -7, b: 6, jump: 0.012 },
  { a: 5, b: -5, jump: -0.008 },
  { a: -3, b: 4, jump: 0.005 },
  { a: 2, b: -1, jump: 0 },
  { a: 0, b: 0, jump: 0 },
] as const;

const toLinear = (rgb: [number, number, number]) =>
  new Color().setRGB(rgb[0], rgb[1], rgb[2], "srgb");

/** Palabras del elemento con su rectángulo DOM relativo al elemento (el navegador ya hizo el ajuste de líneas). */
export function measureWords(el: HTMLElement): { words: PlacedWord[]; fontPx: number } {
  const box = el.getBoundingClientRect();
  const fontPx = parseFloat(getComputedStyle(el).fontSize) || 16;
  const words: PlacedWord[] = [];
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = node.textContent ?? "";
    for (const match of text.matchAll(/\S+/g)) {
      range.setStart(node, match.index);
      range.setEnd(node, match.index + match[0].length);
      const r = range.getClientRects()[0];
      if (!r) continue;
      words.push({
        text: match[0].normalize("NFC"),
        x: r.left - box.left,
        y: r.top - box.top,
        width: r.width,
        height: r.height,
      });
    }
  }
  range.detach();
  return { words, fontPx };
}

/**
 * Gemelo MSDF de un título DOM. El texto REAL sigue en el DOM (lo leen buscadores y lectores de
 * pantalla); aquí solo hay una capa visual sincronizada en posición, tamaño, contenido y opacidad.
 * Si un glifo no está en el atlas, el título no se cubre y el DOM se ve como siempre.
 */
export class TitleText {
  readonly group = new Group();
  private readonly main: Mesh;
  private readonly copies: Mesh[];
  private geometry: BufferGeometry | null = null;
  private readonly uOpacity = uniform(1);
  private readonly uJump = uniform(0);
  private readonly shifts = [uniform(0), uniform(0)];
  private readonly skews = [uniform(0), uniform(0)];
  private readonly uGlyphsHidden = uniform(0);
  private readonly uColor = uniform(new Color());
  private readonly uCopyA = uniform(new Color());
  private readonly uCopyB = uniform(new Color());
  private readonly uCopyOpacity = uniform(0);
  private text = "";
  private layoutVersion = -1;
  private glitchStart = -1;
  private covered = false;

  constructor(
    readonly el: HTMLElement,
    private readonly font: MsdfFont,
    colors: TokenColors,
  ) {
    const sampler = createMsdfSampler(font);
    const alpha = (offset: N) => sampler.alphaAt(uv().add(offset));

    const mainMat = new MeshBasicNodeMaterial({ transparent: true, depthTest: false, depthWrite: false, side: DoubleSide });
    mainMat.colorNode = this.uColor;
    mainMat.opacityNode = alpha(vec2(this.uJump, 0)).mul(this.uOpacity);
    this.main = new Mesh(undefined, mainMat);

    const copyMat = (index: 0 | 1, color: N) => {
      const m = new MeshBasicNodeMaterial({
        transparent: true,
        depthTest: false,
        depthWrite: false,
        side: DoubleSide,
        blending: AdditiveBlending,
      });
      m.colorNode = color;
      m.opacityNode = alpha(vec2(0, 0)).mul(this.uCopyOpacity).mul(this.uOpacity);
      // Desplazamiento de canal con inclinación (mismo recurso visual que la versión DOM).
      m.positionNode = positionLocal.add(
        vec3(this.shifts[index], 0, 0).add(vec3(positionLocal.y.mul(this.skews[index]), 0, 0)),
      );
      return m;
    };
    this.copies = [
      new Mesh(undefined, copyMat(0, this.uCopyA)),
      new Mesh(undefined, copyMat(1, this.uCopyB)),
    ];
    for (const mesh of [this.main, ...this.copies]) {
      mesh.frustumCulled = false;
      this.group.add(mesh);
    }
    this.copies.forEach((m) => (m.visible = false));
    this.applyColors(colors);
  }

  applyColors(colors: TokenColors): void {
    this.uColor.value.copy(toLinear(colors.text));
    this.uCopyA.value.copy(toLinear(colors.accents.source));
    this.uCopyB.value.copy(toLinear(colors.accents.gpu));
  }

  /** Reconstruye la geometría si cambió el texto o el layout. Devuelve `false` si falta un glifo. */
  sync(layoutVersion: number): boolean {
    const text = (this.el.textContent ?? "").normalize("NFC");
    if (this.geometry && text === this.text && layoutVersion === this.layoutVersion) return true;
    this.text = text;
    this.layoutVersion = layoutVersion;
    const { words, fontPx } = measureWords(this.el);
    for (const w of words) for (const ch of w.text) if (!this.font.glyphs.has(ch)) return false;
    const mesh = layoutWords(words, this.font, fontPx);
    const g = new BufferGeometry();
    // y del DOM crece hacia abajo; el mundo del motor (cámara ortográfica de píxeles) usa −y.
    const pos = mesh.positions;
    for (let i = 1; i < pos.length; i += 3) pos[i] = -(pos[i] as number);
    g.setAttribute("position", new BufferAttribute(pos, 3));
    g.setAttribute("uv", new BufferAttribute(mesh.uvs, 2));
    g.setAttribute("along", new BufferAttribute(mesh.along, 1));
    g.setAttribute("glyph", new BufferAttribute(mesh.glyphIndex, 1));
    g.setIndex(new BufferAttribute(mesh.indices, 1));
    this.geometry?.dispose();
    this.geometry = g;
    for (const m of [this.main, ...this.copies]) m.geometry = g;
    return true;
  }

  /** Cubre el título DOM (texto transparente, sigue en el árbol de accesibilidad y con su foco). */
  setCovered(covered: boolean): void {
    if (covered === this.covered) return;
    this.covered = covered;
    this.el.classList.toggle("msdf-covered", covered);
  }

  glitch(nowMs: number): void {
    this.glitchStart = nowMs;
  }

  /** Cancela un glitch pendiente (el título salió de pantalla). */
  stopGlitch(): void {
    this.glitchStart = -1;
  }

  get glitching(): boolean {
    return this.glitchStart >= 0;
  }

  /** Coloca el texto sobre el DOM: devuelve `true` si hay que seguir animando (glitch en curso). */
  update(nowMs: number, opacity: number): boolean {
    const rect = this.el.getBoundingClientRect();
    this.group.position.set(rect.left, -rect.top, 0);
    this.uOpacity.value = opacity;

    let animating = false;
    if (this.glitchStart >= 0) {
      const t = nowMs - this.glitchStart;
      if (t >= TITLE_GLITCH_MS) {
        this.glitchStart = -1;
      } else {
        const step = GLITCH_STEPS[Math.min(GLITCH_STEPS.length - 1, Math.floor((t / TITLE_GLITCH_MS) * GLITCH_STEPS.length))]!;
        this.shifts[0]!.value = step.a;
        this.shifts[1]!.value = step.b;
        this.skews[0]!.value = step.a * 0.012;
        this.skews[1]!.value = step.b * 0.012;
        this.uJump.value = step.jump;
        this.uCopyOpacity.value = 0.85;
        animating = true;
      }
    }
    if (this.glitchStart < 0) {
      this.uCopyOpacity.value = 0;
      this.uJump.value = 0;
    }
    for (const m of this.copies) m.visible = animating;
    return animating;
  }

  dispose(): void {
    this.setCovered(false);
    this.geometry?.dispose();
    for (const m of [this.main, ...this.copies]) (m.material as MeshBasicNodeMaterial).dispose();
  }
}
