/**
 * Muestreo de los píxeles de un texto DOM → puntos en coordenadas de DOCUMENTO. Se dibuja el texto
 * del elemento (con su misma fuente, tamaño y color) en un canvas 2D sobremuestreado y se recogen
 * los píxeles cubiertos. Es el «precálculo de posiciones objetivo»: se hace una sola vez al crear la
 * transición, sobre pocas decenas de glifos (≈ 1 ms), nunca por frame y nunca en la GPU.
 */
export interface TextPoints {
  /** x, y alternados, en px de documento. */
  points: Float32Array;
  /** Color del texto (sRGB 0..1). */
  color: [number, number, number];
  rect: { x: number; y: number; w: number; h: number };
}

let scratch: HTMLCanvasElement | null = null;

function cssColor(el: Element): [number, number, number] {
  const probe = document.createElement("canvas");
  probe.width = probe.height = 1;
  const ctx = probe.getContext("2d", { willReadFrequently: true });
  if (!ctx) return [1, 1, 1];
  ctx.fillStyle = "black";
  ctx.fillStyle = getComputedStyle(el).color;
  ctx.fillRect(0, 0, 1, 1);
  const d = ctx.getImageData(0, 0, 1, 1).data;
  return [(d[0] ?? 255) / 255, (d[1] ?? 255) / 255, (d[2] ?? 255) / 255];
}

export function sampleElementText(el: HTMLElement, scale = 3): TextPoints | null {
  const text = el.textContent ?? "";
  if (text.trim() === "") return null;
  const range = document.createRange();
  range.selectNodeContents(el);
  const box = range.getBoundingClientRect();
  range.detach();
  if (box.width < 1 || box.height < 1) return null;

  const style = getComputedStyle(el);
  const w = Math.ceil(box.width * scale);
  const h = Math.ceil(box.height * scale);
  scratch ??= document.createElement("canvas");
  scratch.width = w;
  scratch.height = h;
  const ctx = scratch.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.clearRect(0, 0, w, h);
  ctx.font = `${style.fontStyle} ${style.fontWeight} ${parseFloat(style.fontSize) * scale}px ${style.fontFamily}`;
  ctx.textBaseline = "middle";
  ctx.fillStyle = "white";
  ctx.fillText(text.replace(/\s+/g, " ").trim(), 0, h / 2);

  const data = ctx.getImageData(0, 0, w, h).data;
  const out: number[] = [];
  const x0 = box.left + window.scrollX;
  const y0 = box.top + window.scrollY;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if ((data[(y * w + x) * 4 + 3] ?? 0) > 110) out.push(x0 + x / scale, y0 + y / scale);
    }
  }
  if (out.length === 0) return null;
  return {
    points: new Float32Array(out),
    color: cssColor(el),
    rect: { x: x0, y: y0, w: box.width, h: box.height },
  };
}
