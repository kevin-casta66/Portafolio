/**
 * Reglas de contacto compartidas por el formulario (cliente) y la Server Action (servidor): ambos
 * llaman a la misma `validateContact`. Los mensajes son claves de `Display.errors` en los catálogos
 * de i18n, no texto, para poder traducirlos. Es TypeScript sin dependencias a propósito (change 09,
 * presupuesto de JS inicial): zod + react-hook-form pesaban ~47 KB gzip en el primer render de la home.
 */
export const CONTACT_LIMITS = {
  nameMax: 100,
  emailMax: 200,
  messageMin: 10,
  messageMax: 2000,
} as const;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type ContactField = "name" | "email" | "message";
export type ContactErrorKey =
  | "nameRequired"
  | "nameTooLong"
  | "emailRequired"
  | "emailInvalid"
  | "messageTooShort"
  | "messageTooLong";
export type ContactFieldErrors = Partial<Record<ContactField, ContactErrorKey>>;

export interface ContactInput {
  name?: string;
  email?: string;
  message?: string;
  /** Campo trampa: las personas no lo ven; si llega relleno es un bot. No se valida aquí. */
  website?: string | undefined;
}

export interface ContactData {
  name: string;
  email: string;
  message: string;
  website?: string | undefined;
}

export const CONTACT_FIELDS: readonly ContactField[] = ["name", "email", "message"];

const trimmed = (value: unknown): string => (typeof value === "string" ? value.trim() : "");

/** Primer error de UN campo (o `undefined` si es válido). Sirve para validar en vivo al salir del campo. */
export function validateContactField(field: ContactField, raw: unknown): ContactErrorKey | undefined {
  const value = trimmed(raw);
  switch (field) {
    case "name":
      if (value.length < 1) return "nameRequired";
      if (value.length > CONTACT_LIMITS.nameMax) return "nameTooLong";
      return undefined;
    case "email":
      if (value.length < 1) return "emailRequired";
      if (value.length > CONTACT_LIMITS.emailMax || !EMAIL.test(value)) return "emailInvalid";
      return undefined;
    case "message":
      if (value.length < CONTACT_LIMITS.messageMin) return "messageTooShort";
      if (value.length > CONTACT_LIMITS.messageMax) return "messageTooLong";
      return undefined;
  }
}

export type ContactValidation =
  { ok: true; data: ContactData } | { ok: false; fieldErrors: ContactFieldErrors };

/** Valida datos sin confiar en el cliente; devuelve el primer error de cada campo. */
export function validateContact(raw: unknown): ContactValidation {
  const source = (raw !== null && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const fieldErrors: ContactFieldErrors = {};
  for (const field of CONTACT_FIELDS) {
    const error = validateContactField(field, source[field]);
    if (error) fieldErrors[field] = error;
  }
  if (Object.keys(fieldErrors).length > 0) return { ok: false, fieldErrors };
  return {
    ok: true,
    data: {
      name: trimmed(source["name"]),
      email: trimmed(source["email"]),
      message: trimmed(source["message"]),
      ...(typeof source["website"] === "string" ? { website: source["website"] } : {}),
    },
  };
}
