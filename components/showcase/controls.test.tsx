import { NextIntlClientProvider } from "next-intl";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import es from "@/messages/es.json";
import { InternalsToggle } from "./InternalsToggle";
import { SpeedControl } from "./SpeedControl";
import { TransitionCard, type TransitionCardData } from "./TransitionCard";

const card: TransitionCardData = {
  id: "T5",
  name: "Carga en núcleos",
  trigger: "Scroll",
  technique: "Barrido Bayer",
  reducedMotion: "Fundido",
  lowTier: "mask-image",
  note: "Nota",
  internals: "La matriz Bayer",
  durations: [{ token: "sceneMin", ms: 1200 }],
  easings: ["--ease-scene"],
  uses3d: true,
  poster: "/motion/posters/T5.webp",
};

describe("InternalsToggle", () => {
  it("expone su estado con aria-pressed", () => {
    const off = renderToStaticMarkup(<InternalsToggle label="Ver internos" pressed={false} onToggle={() => {}} />);
    const on = renderToStaticMarkup(<InternalsToggle label="Ver internos" pressed onToggle={() => {}} />);
    expect(off).toContain('aria-pressed="false"');
    expect(on).toContain('aria-pressed="true"');
    expect(off).toContain("Ver internos");
  });
});

describe("SpeedControl", () => {
  it("es un grupo de radio con 3 opciones, 1x marcada por defecto y un solo punto de tabulación", () => {
    const html = renderToStaticMarkup(<SpeedControl label="Velocidad" value={1} onChange={() => {}} />);
    expect(html).toContain('role="radiogroup"');
    expect((html.match(/role="radio"/g) ?? []).length).toBe(3);
    expect(html).toMatch(/aria-checked="true"[^>]*tabindex="0"[^>]*data-speed="1"|data-speed="1"[^>]*aria-checked="true"/);
    expect((html.match(/tabindex="0"/g) ?? []).length).toBe(1);
    for (const label of ["0.25x", "0.5x", "1x"]) expect(html).toContain(label);
  });
});

describe("TransitionCard (HTML inicial, sin JavaScript)", () => {
  const html = renderToStaticMarkup(
    <NextIntlClientProvider locale="es" messages={es}>
      <TransitionCard card={card} locale="es" />
    </NextIntlClientProvider>,
  );

  it("trae todo el texto, el fotograma estático y Replay", () => {
    expect(html).toContain("Carga en núcleos");
    expect(html).toContain("Barrido Bayer");
    expect(html).toContain("La matriz Bayer");
    expect(html).toContain("/motion/posters/T5.webp");
    expect(html).toContain("Replay");
    expect((html.match(/<dt/g) ?? []).length).toBe(8);
  });

  it("tiene una región viva educada para anunciar la reproducción", () => {
    expect(html).toMatch(/role="status"[^>]*aria-live="polite"/);
  });

  it("empieza en reposo y sin escenario", () => {
    expect(html).toContain('data-demo-status="idle"');
    expect(html).not.toContain("<iframe");
  });

  it("el interruptor de internos nace desactivado", () => {
    expect(html).toContain('aria-pressed="false"');
  });
});
