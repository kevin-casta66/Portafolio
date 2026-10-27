import { describe, expect, it } from "vitest";
import { CONTROL_EVENTS, CONTEXT_EVENTS_FOR_MIX, SFX, SFX_MAX_S } from "./sfx";
import { AUDIO_EVENTS } from "./types";

describe("catálogo de sonidos de interacción (ADDENDUM-v3 §5, §8)", () => {
  it("ningún efecto dura más de 1,2 s salvo el riser", () => {
    for (const [event, def] of Object.entries(SFX)) {
      if (def.kind === "riser") continue;
      expect(def.maxS, event).toBeLessThanOrEqual(SFX_MAX_S);
    }
    expect(SFX_MAX_S).toBe(1.2);
  });

  it("los sonidos con altura se cuantizan al pulso; solo clics, ticks y risers suenan de inmediato", () => {
    for (const [event, def] of Object.entries(SFX)) {
      if (def.quant === "now") expect(["key", "tick", "riser"], event).toContain(def.kind);
      else expect(["16n", "8n", "4n", "1m"]).toContain(def.quant);
    }
  });

  it("las teclas de terminal tienen límite de frecuencia de disparo", () => {
    expect(SFX["terminal:key"]?.gapMs).toBeGreaterThanOrEqual(30);
  });

  it("los logros y el impacto del hold son prioritarios", () => {
    expect(SFX.achievement?.priority).toBeGreaterThanOrEqual(5);
    expect(SFX["hold:complete"]?.priority).toBeGreaterThan(SFX["hover:token"]?.priority ?? 0);
  });

  it("con movimiento reducido el riser se omite y el impacto, el platillo y los pulsos pasan a una nota corta", () => {
    expect(SFX["hold:start"]?.reduced).toBe("skip");
    expect(SFX["hold:complete"]?.reduced).toBe("short");
    expect(SFX["bytecode:function"]?.reduced).toBe("short");
    expect(SFX["contact:send"]?.reduced).toBe("short");
  });

  it("cada evento del catálogo suena, cambia la mezcla o es de control (sin huecos)", () => {
    const covered = new Set<string>([...Object.keys(SFX), ...CONTEXT_EVENTS_FOR_MIX, ...CONTROL_EVENTS]);
    for (const event of AUDIO_EVENTS) expect(covered.has(event), event).toBe(true);
  });
});
