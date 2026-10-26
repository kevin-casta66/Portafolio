import { z } from "zod";

/**
 * Esquema de contacto compartido por el formulario (cliente) y la Server Action (servidor): ambos
 * aplican exactamente las mismas reglas. Los mensajes son claves de `Display.errors` en los
 * catálogos de i18n, no texto, para poder traducirlos.
 */
export const CONTACT_LIMITS = {
  nameMax: 100,
  emailMax: 200,
  messageMin: 10,
  messageMax: 2000,
} as const;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const contactSchema = z.object({
  name: z.string().trim().min(1, "nameRequired").max(CONTACT_LIMITS.nameMax, "nameTooLong"),
  email: z
    .string()
    .trim()
    .min(1, "emailRequired")
    .max(CONTACT_LIMITS.emailMax, "emailInvalid")
    .regex(EMAIL, "emailInvalid"),
  message: z
    .string()
    .trim()
    .min(CONTACT_LIMITS.messageMin, "messageTooShort")
    .max(CONTACT_LIMITS.messageMax, "messageTooLong"),
  /** Campo trampa: las personas no lo ven; si llega relleno es un bot. No se valida aquí. */
  website: z.string().optional(),
});

export type ContactInput = z.input<typeof contactSchema>;
export type ContactData = z.output<typeof contactSchema>;

export type ContactField = "name" | "email" | "message";
export type ContactErrorKey =
  | "nameRequired"
  | "nameTooLong"
  | "emailRequired"
  | "emailInvalid"
  | "messageTooShort"
  | "messageTooLong";
export type ContactFieldErrors = Partial<Record<ContactField, ContactErrorKey>>;

const FIELDS: ContactField[] = ["name", "email", "message"];

export type ContactValidation =
  { ok: true; data: ContactData } | { ok: false; fieldErrors: ContactFieldErrors };

/** Valida datos sin confiar en el cliente; devuelve el primer error de cada campo. */
export function validateContact(raw: unknown): ContactValidation {
  const result = contactSchema.safeParse(raw);
  if (result.success) return { ok: true, data: result.data };

  const fieldErrors: ContactFieldErrors = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0];
    if (typeof field === "string" && FIELDS.includes(field as ContactField)) {
      fieldErrors[field as ContactField] ??= issue.message as ContactErrorKey;
    }
  }
  return { ok: false, fieldErrors };
}
