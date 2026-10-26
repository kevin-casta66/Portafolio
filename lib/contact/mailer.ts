import { Resend } from "resend";
import type { ContactData } from "./schema";

/**
 * Envío del mensaje. Lee `RESEND_API_KEY` y `CONTACT_TO_EMAIL` del entorno del servidor (nunca del
 * cliente ni del repositorio). `CONTACT_TRANSPORT` permite simular el proveedor sin enviar nada:
 * `mock` (éxito) y `mock-fail` (error), útiles en desarrollo y en tests E2E.
 */
export async function deliver({
  name,
  email,
  message,
}: Pick<ContactData, "name" | "email" | "message">): Promise<void> {
  const transport = process.env.CONTACT_TRANSPORT;

  if (transport === "mock") {
    console.info(`[contact:mock] mensaje de ${name} <${email}> (${message.length} caracteres)`);
    return;
  }
  if (transport === "mock-fail") {
    throw new Error("Fallo simulado del proveedor (CONTACT_TRANSPORT=mock-fail)");
  }

  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_TO_EMAIL;
  if (!apiKey || !to) {
    throw new Error("Falta RESEND_API_KEY o CONTACT_TO_EMAIL en el entorno del servidor");
  }

  const from = process.env.CONTACT_FROM_EMAIL ?? "COMPILE Portfolio <onboarding@resend.dev>";
  // Sin saltos de línea en el asunto: evita inyección de cabeceras.
  const subject = `Nuevo mensaje de ${name.replace(/[\r\n]+/g, " ")}`;

  const { error } = await new Resend(apiKey).emails.send({
    from,
    to,
    replyTo: email,
    subject,
    text: `${message}\n\n— ${name} <${email}>`,
  });
  if (error) throw new Error(`Resend: ${error.message}`);
}
