import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { BUDGET_BYTES, checkBudget, dirSize } from "./check-3d-budget";

describe("presupuesto de assets 3D", () => {
  it("el presupuesto es 1,5 MB", () => {
    expect(BUDGET_BYTES).toBe(1_572_864);
  });

  it("pasa por debajo del presupuesto y falla por encima", () => {
    const dir = mkdtempSync(join(tmpdir(), "budget-"));
    writeFileSync(join(dir, "a.bin"), Buffer.alloc(1000));
    expect(checkBudget(dir, 2000).ok).toBe(true);
    writeFileSync(join(dir, "b.bin"), Buffer.alloc(1500));
    expect(dirSize(dir).bytes).toBe(2500);
    expect(checkBudget(dir, 2000).ok).toBe(false);
  });

  it("el contenido real de public/webgl cumple el presupuesto", () => {
    expect(checkBudget(join(process.cwd(), "public", "webgl")).ok).toBe(true);
  });
});
