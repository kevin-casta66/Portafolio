import { describe, expect, it } from "vitest";
import { formatChange, metricRows } from "./metrics";

describe("metricRows", () => {
  const [latency, users, flat] = metricRows([
    { id: "latency", label: "Latencia", unit: "ms", before: 900, after: 300, better: "lower" },
    { id: "users", label: "Usuarios", unit: "", before: 1000, after: 4200, better: "higher" },
    { id: "flat", label: "Igual", unit: "", before: 5, after: 5, better: "higher" },
  ]);

  it("calcula el cambio relativo y si es una mejora según el sentido de la métrica", () => {
    expect(latency!.changePct).toBeCloseTo(-66.67, 1);
    expect(latency!.verdict).toBe("improved");
    expect(users!.changePct).toBe(320);
    expect(users!.verdict).toBe("improved");
    expect(flat!.verdict).toBe("same");
  });

  it("escala las barras respecto al mayor de los dos valores", () => {
    expect(latency).toMatchObject({ beforeBar: 1, afterBar: 300 / 900 });
    expect(users).toMatchObject({ beforeBar: 1000 / 4200, afterBar: 1 });
  });

  it("marca como empeora lo que va en contra del sentido", () => {
    const [worse] = metricRows([{ id: "x", label: "x", unit: "", before: 10, after: 20, better: "lower" }]);
    expect(worse!.verdict).toBe("worsened");
  });

  it("formatea el cambio con signo y sin cambio de partida nulo", () => {
    expect(formatChange(-66.67)).toBe("−67 %");
    expect(formatChange(320)).toBe("+320 %");
    expect(formatChange(null)).toBe("—");
    expect(formatChange(0)).toBe("0 %");
  });
});
