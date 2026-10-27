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

const { uniform, uv, vec2, vec3, float, mix, positionLocal } = TSL;

/** Duración del glitch (T11): < 300 ms (`glitch-max`); coincide con la versión DOM. */
export const TITLE_GLITCH_MS = 240;
/**
 * Duración (ms) del glitch a una velocidad dada: `TITLE_GLITCH_MS / speed` (1 = la de producción).
 * `/motion` la usa para el control 0,25×/0,5×/1× y para saber cuándo termina la demo.
 */
export const titleGlitchMs = (speed = 1): number => TITLE_GLITCH_MS / clampSpeed(speed);
const clampSpeed = (speed: number): number => (Number.isFinite(speed) && speed > 0 ? Math.min(speed, 4) : 1);

/** Saltos discretos de offset (px) de las dos capas de canal y salto de la textura SDF. */
const GLITCH_STEPS = [
  { a: -7, b: 6, jump: 0.012 },
  { a: 5, b: -5, jump: -0.008 },
  { a: -3, b: 4, jump: 0.005 },
  { a: 2, b: -1, jump: 0 },
  { a: 0, b: 0, jump: 0 },
] as const;

/**
 * Interruptor «Ver internos» de T11 (change 08, docs/MOTION-SPEC.md §3): con `on` los títulos MSDF
 * dibujan el campo de distancia (SDF) con el salto de offset aplicado y mantienen visibles las dos
 * capas de canal desplazadas. Apagado (por defecto) el render no cambia. Lo enciende `setTitleInternals`;
 * `invalidate` lo registra la capa de texto para pedir un frame al alternarlo.
 */
export const titleInternals: { on: boolean; invalidate: (() => void) | null } = { on: false, invalidate: null };

export function setTitleInternals(on: boolean): void {
  if (titleInternals.on === on) return;
  titleInternals.on = on;
  titleInternals.invalidate?.();
}

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
  private readonly uInternals = uniform(0);
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
  private glitchDuration = TITLE_GLITCH_MS;
  private covered = false;

  constructor(
    readonly el: HTMLElement,
    private readonly font: MsdfFont,
    colors: TokenColors,
  ) {
    const sampler = createMsdfSampler(font);
    const alpha = (offset: N) => sampler.alphaAt(uv().add(offset));

    const mainMat = new MeshBasicNodeMaterial({ transparent: true, depthTest: false, depthWrite: false, side: DoubleSide });
    // Internos: la mediana del SDF en gris (con el mismo salto de offset) en lugar del color del texto;
    // con 0 las dos mezclas devuelven exactamente la vista normal.
    mainMat.colorNode = mix(this.uColor, vec3(sampler.distanceAt(uv().add(vec2(this.uJump, 0)))), this.uInternals);
    mainMat.opacityNode = mix(alpha(vec2(this.uJump, 0)), float(0.92), this.uInternals).mul(this.uOpacity);
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

  /** Lanza el glitch; `speed` (por defecto 1) escala su duración a `titleGlitchMs(speed)`. */
  glitch(nowMs: number, speed = 1): void {
    this.glitchStart = nowMs;
    this.glitchDuration = titleGlitchMs(speed);
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
      if (t >= this.glitchDuration) {
        this.glitchStart = -1;
      } else {
        const step = GLITCH_STEPS[Math.min(GLITCH_STEPS.length - 1, Math.floor((t / this.glitchDuration) * GLITCH_STEPS.length))]!;
        this.shifts[0]!.value = step.a;
        this.shifts[1]!.value = step.b;
        this.skews[0]!.value = step.a * 0.012;
        this.skews[1]!.value = step.b * 0.012;
        this.uJump.value = step.jump;
        this.uCopyOpacity.value = 0.85;
        animating = true;
      }
    }
    const inspect = titleInternals.on;
    this.uInternals.value = inspect ? 1 : 0;
    if (this.glitchStart < 0) {
      if (inspect) {
        // Sin glitch en curso se deja a la vista el paso de mayor desplazamiento para poder inspeccionarlo.
        const peak = GLITCH_STEPS[0];
        this.shifts[0]!.value = peak.a;
        this.shifts[1]!.value = peak.b;
        this.skews[0]!.value = peak.a * 0.012;
        this.skews[1]!.value = peak.b * 0.012;
        this.uJump.value = peak.jump;
        this.uCopyOpacity.value = 0.7;
      } else {
        this.uCopyOpacity.value = 0;
        this.uJump.value = 0;
      }
    }
    for (const m of this.copies) m.visible = animating || inspect;
    return animating;
  }

  dispose(): void {
    this.setCovered(false);
    this.geometry?.dispose();
    for (const m of [this.main, ...this.copies]) (m.material as MeshBasicNodeMaterial).dispose();
  }
}
