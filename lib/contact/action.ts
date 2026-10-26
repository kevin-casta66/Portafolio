"use server";

import { headers } from "next/headers";
import { deliver } from "./mailer";
import { processContact } from "./process";
import type { ContactState } from "./state";

/** Server Action del formulario de contacto (funciona también sin JavaScript). */
export async function sendContact(
  _previous: ContactState,
  formData: FormData,
): Promise<ContactState> {
  const forwarded = (await headers()).get("x-forwarded-for");
  const clientKey = forwarded?.split(",")[0]?.trim() || "unknown";

  return processContact(Object.fromEntries(formData), {
    clientKey,
    deliver,
    onError: (error) =>
      console.error("[contact] fallo al enviar:", error instanceof Error ? error.message : error),
  });
}
