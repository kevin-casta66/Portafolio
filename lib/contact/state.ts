import type { ContactFieldErrors } from "./schema";

/** Valores devueltos al formulario para no perder lo escrito (también sin JavaScript). */
export interface ContactValues {
  name: string;
  email: string;
  message: string;
}

/** Resultado de `sendContact`; `status` imita el código HTTP que se muestra al visitante. */
export type ContactState =
  | { status: "idle" }
  | { status: 200 }
  | { status: 400; fieldErrors: ContactFieldErrors; values: ContactValues }
  | { status: 429; values: ContactValues }
  | { status: 500; values: ContactValues };

export const IDLE: ContactState = { status: "idle" };
