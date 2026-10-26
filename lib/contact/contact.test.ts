import { beforeEach, describe, expect, it, vi } from "vitest";
import { RATE_LIMIT, allowRequest, resetRateLimit } from "./rate-limit";
import { processContact } from "./process";
import { CONTACT_LIMITS, validateContact } from "./schema";

const valid = {
  name: "Ada Lovelace",
  email: "ada@example.com",
  message: "Hola, me gustaría hablar de un proyecto.",
};

describe("validateContact", () => {
  it("acepta datos válidos y recorta espacios", () => {
    const result = validateContact({ ...valid, name: "  Ada  " });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.name).toBe("Ada");
  });

  it.each([
    ["foo@", "emailInvalid"],
    ["foo", "emailInvalid"],
    ["foo@bar", "emailInvalid"],
    ["", "emailRequired"],
    ["   ", "emailRequired"],
  ])("email %j → %s", (email, key) => {
    const result = validateContact({ ...valid, email });
    expect(result).toEqual({ ok: false, fieldErrors: { email: key } });
  });

  it("exige nombre", () => {
    expect(validateContact({ ...valid, name: "  " })).toEqual({
      ok: false,
      fieldErrors: { name: "nameRequired" },
    });
  });

  it("limita la longitud del nombre", () => {
    const name = "x".repeat(CONTACT_LIMITS.nameMax + 1);
    expect(validateContact({ ...valid, name })).toEqual({
      ok: false,
      fieldErrors: { name: "nameTooLong" },
    });
  });

  it("aplica el mínimo y el máximo del mensaje", () => {
    expect(validateContact({ ...valid, message: "corto" })).toEqual({
      ok: false,
      fieldErrors: { message: "messageTooShort" },
    });
    const long = "x".repeat(CONTACT_LIMITS.messageMax + 1);
    expect(validateContact({ ...valid, message: long })).toEqual({
      ok: false,
      fieldErrors: { message: "messageTooLong" },
    });
    expect(validateContact({ ...valid, message: "x".repeat(CONTACT_LIMITS.messageMax) }).ok).toBe(
      true,
    );
  });

  it("devuelve un error por campo a la vez", () => {
    const result = validateContact({ name: "", email: "foo@", message: "" });
    expect(result).toEqual({
      ok: false,
      fieldErrors: { name: "nameRequired", email: "emailInvalid", message: "messageTooShort" },
    });
  });

  it("no revienta con valores que no son texto", () => {
    expect(validateContact({ name: 1, email: null, message: undefined }).ok).toBe(false);
  });
});

describe("rate limit", () => {
  beforeEach(resetRateLimit);

  it("permite hasta el máximo y bloquea el siguiente", () => {
    for (let i = 0; i < RATE_LIMIT.max; i++) expect(allowRequest("1.1.1.1", 1000 + i)).toBe(true);
    expect(allowRequest("1.1.1.1", 2000)).toBe(false);
  });

  it("es independiente por cliente y se libera con el tiempo", () => {
    for (let i = 0; i < RATE_LIMIT.max; i++) allowRequest("a", 0);
    expect(allowRequest("a", 1)).toBe(false);
    expect(allowRequest("b", 1)).toBe(true);
    expect(allowRequest("a", RATE_LIMIT.windowMs + 1)).toBe(true);
  });
});

describe("processContact", () => {
  beforeEach(resetRateLimit);
  const deps = (deliver = vi.fn().mockResolvedValue(undefined)) => ({ clientKey: "ip", deliver });

  it("envía un mensaje válido y responde 200", async () => {
    const d = deps();
    expect(await processContact(valid, d)).toEqual({ status: 200 });
    expect(d.deliver).toHaveBeenCalledOnce();
  });

  it("rechaza un email vacío sin enviar y devuelve errores por campo", async () => {
    const d = deps();
    const state = await processContact({ ...valid, email: "" }, d);
    expect(state).toMatchObject({ status: 400, fieldErrors: { email: "emailRequired" } });
    expect(d.deliver).not.toHaveBeenCalled();
  });

  it("devuelve los valores escritos para no perderlos", async () => {
    const state = await processContact({ ...valid, email: "foo@" }, deps());
    expect(state).toMatchObject({ status: 400, values: { name: valid.name, email: "foo@" } });
  });

  it("descarta el honeypot: no envía y responde como éxito", async () => {
    const d = deps();
    expect(await processContact({ ...valid, website: "http://spam.example" }, d)).toEqual({
      status: 200,
    });
    expect(d.deliver).not.toHaveBeenCalled();
  });

  it("el honeypot gana aunque el resto sea inválido", async () => {
    const d = deps();
    expect(await processContact({ website: "x" }, d)).toEqual({ status: 200 });
    expect(d.deliver).not.toHaveBeenCalled();
  });

  it("responde 500 si el proveedor falla y conserva los valores", async () => {
    const onError = vi.fn();
    const d = { clientKey: "ip", deliver: vi.fn().mockRejectedValue(new Error("boom")), onError };
    const state = await processContact(valid, d);
    expect(state).toMatchObject({ status: 500, values: { email: valid.email } });
    expect(onError).toHaveBeenCalledOnce();
  });

  it("responde 429 al superar el límite", async () => {
    const d = deps();
    for (let i = 0; i < RATE_LIMIT.max; i++) await processContact(valid, d);
    expect(await processContact(valid, d)).toMatchObject({ status: 429 });
    expect(d.deliver).toHaveBeenCalledTimes(RATE_LIMIT.max);
  });
});
