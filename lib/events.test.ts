import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  PROCESS_EXECUTED_KEY,
  announceProcessExecuted,
  emit,
  on,
  resetEventsForTests,
  type OnceStorage,
} from "./events";

const memoryStorage = (): OnceStorage & { data: Map<string, string> } => {
  const data = new Map<string, string>();
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v) };
};

beforeEach(resetEventsForTests);

describe("bus de eventos", () => {
  it("entrega el evento a los suscriptores y permite darse de baja", () => {
    const handler = vi.fn();
    const off = on("achievement:unlock", handler);
    emit("achievement:unlock", { id: "root_access" });
    off();
    emit("achievement:unlock", { id: "kernel_panic" });
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith({ id: "root_access" });
  });

  it("emitir sin suscriptores no falla (el change 06 aún no está aplicado)", () => {
    expect(() => emit("achievement:unlock", { id: "x" })).not.toThrow();
  });

  it("un suscriptor que lanza no impide que lo reciban los demás", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const ok = vi.fn();
    on("achievement:unlock", () => {
      throw new Error("boom");
    });
    on("achievement:unlock", ok);
    emit("achievement:unlock", { id: "x" });
    expect(ok).toHaveBeenCalled();
    spy.mockRestore();
  });
});

describe("process_executed: solo el primer hold completo de la sesión", () => {
  it("emite una vez y no vuelve a emitir", () => {
    const handler = vi.fn();
    on("achievement:unlock", handler);
    const storage = memoryStorage();
    expect(announceProcessExecuted(storage)).toBe(true);
    expect(announceProcessExecuted(storage)).toBe(false);
    expect(announceProcessExecuted(storage)).toBe(false);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith({ id: "process_executed" });
    expect(storage.data.get(PROCESS_EXECUTED_KEY)).toBe("1");
  });

  it("no vuelve a emitir en la misma sesión aunque se recargue el módulo (marca en sessionStorage)", () => {
    const storage = memoryStorage();
    storage.setItem(PROCESS_EXECUTED_KEY, "1");
    expect(announceProcessExecuted(storage)).toBe(false);
  });

  it("sin almacenamiento disponible lo recuerda en memoria", () => {
    const handler = vi.fn();
    on("achievement:unlock", handler);
    expect(announceProcessExecuted(null)).toBe(true);
    expect(announceProcessExecuted(null)).toBe(false);
    expect(handler).toHaveBeenCalledTimes(1);
  });
});
