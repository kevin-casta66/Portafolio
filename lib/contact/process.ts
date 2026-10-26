import { allowRequest } from "./rate-limit";
import { validateContact, type ContactData } from "./schema";
import type { ContactState, ContactValues } from "./state";

export interface ProcessDeps {
  /** Clave del cliente para el límite de frecuencia (IP). */
  clientKey: string;
  deliver: (data: Pick<ContactData, "name" | "email" | "message">) => Promise<void>;
  now?: number;
  onError?: (error: unknown) => void;
}

const text = (value: unknown): string => (typeof value === "string" ? value : "");

/**
 * Lógica de la acción de contacto sin dependencias de Next: valida, descarta el honeypot, limita la
 * frecuencia y entrega. Separada de la Server Action para poder probarla.
 */
export async function processContact(
  raw: Record<string, unknown>,
  deps: ProcessDeps,
): Promise<ContactState> {
  // Honeypot: responde como éxito sin enviar ni revelar el descarte.
  if (text(raw["website"]).trim() !== "") return { status: 200 };

  const values: ContactValues = {
    name: text(raw["name"]),
    email: text(raw["email"]),
    message: text(raw["message"]),
  };

  const validation = validateContact({ ...values, website: "" });
  if (!validation.ok) return { status: 400, fieldErrors: validation.fieldErrors, values };

  if (!allowRequest(deps.clientKey, deps.now)) return { status: 429, values };

  try {
    await deps.deliver(validation.data);
    return { status: 200 };
  } catch (error) {
    deps.onError?.(error);
    return { status: 500, values };
  }
}
