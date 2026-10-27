"use client";

import { MagneticButton } from "@/components/ui/Magnetic";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import {
  useActionState,
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
  type ReactNode,
} from "react";
import { useForm } from "react-hook-form";
import { sendContact } from "@/lib/contact/action";
import {
  CONTACT_LIMITS,
  contactSchema,
  type ContactErrorKey,
  type ContactField,
  type ContactInput,
} from "@/lib/contact/schema";
import { IDLE, type ContactState } from "@/lib/contact/state";
import { NetworkCable, type CableHandle } from "./NetworkCable";

const FIELD_NAMES: ContactField[] = ["name", "email", "message"];

const noopSubscribe = () => () => {};
/** `false` en el servidor (y sin JavaScript), `true` una vez hidratado en el navegador. */
const useHydrated = () =>
  useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );

/**
 * Formulario de contacto con estética de terminal y usabilidad de formulario moderno: labels
 * visibles, validación en vivo (al salir del campo y luego al escribir), errores asociados a cada
 * campo y un resultado anunciado en una región `aria-live`. Cliente y servidor comparten el mismo
 * esquema. Sin JavaScript el formulario se envía igualmente a la Server Action.
 */
export function ContactForm({ alternativeEmail }: { alternativeEmail: string }) {
  const t = useTranslations("Display");
  const idBase = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, isPending] = useActionState<ContactState, FormData>(sendContact, IDLE);
  const [, startTransition] = useTransition();
  const hydrated = useHydrated();
  const cable = useRef<CableHandle>(null);
  // Resultado que se MUESTRA: va por detrás del real hasta que el paquete completa su recorrido.
  const [displayed, setDisplayed] = useState<ContactState>(IDLE);
  const shown = hydrated ? displayed : state;

  const initial =
    state.status === 400 || state.status === 429 || state.status === 500 ? state.values : undefined;
  const form = useForm<ContactInput>({
    resolver: zodResolver(contactSchema),
    mode: "onTouched",
    defaultValues: {
      name: initial?.name ?? "",
      email: initial?.email ?? "",
      message: initial?.message ?? "",
      website: "",
    },
  });
  const { register, handleSubmit, setError, reset, formState } = form;

  // Resultado del servidor: errores por campo (400) o formulario limpio (éxito).
  useEffect(() => {
    if (state.status === 400) {
      for (const field of FIELD_NAMES) {
        const key = state.fieldErrors[field];
        if (key) setError(field, { type: "server", message: key });
      }
    } else if (state.status === 200) {
      reset({ name: "", email: "", message: "", website: "" });
    }
  }, [state, setError, reset]);

  // El paquete refleja el resultado REAL: espera a que acabe su ida, y regresa (éxito) o se apaga (error).
  useEffect(() => {
    if (state.status === "idle") return;
    const handle = cable.current;
    if (!handle?.active() || state.status === 400) {
      setDisplayed(state);
      handle?.reset();
      return;
    }
    let cancelled = false;
    void handle.receive(state.status === 200).then(() => {
      if (!cancelled) setDisplayed(state);
    });
    return () => {
      cancelled = true;
    };
  }, [state]);

  const submit = () => {
    if (!formRef.current) return;
    const data = new FormData(formRef.current);
    setDisplayed(IDLE);
    cable.current?.send();
    startTransition(() => formAction(data));
  };

  // Con JavaScript manda RHF (valida en vivo y recibe los errores del servidor vía `setError`).
  // Sin JavaScript solo existe la respuesta del servidor, que se pinta directamente.
  const errorKey = (field: ContactField): ContactErrorKey | undefined =>
    hydrated
      ? (formState.errors[field]?.message as ContactErrorKey | undefined)
      : state.status === 400
        ? state.fieldErrors[field]
        : undefined;

  const errorText = (field: ContactField): string | undefined => {
    const key = errorKey(field);
    return key ? t(`errors.${key}`) : undefined;
  };

  const field = (name: ContactField, label: string, control: ReactNode) => {
    const error = errorText(name);
    return (
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${idBase}-${name}`} className="font-mono text-sm text-fg">
          <span aria-hidden="true" className="text-accent">
            {"> "}
          </span>
          {label}
        </label>
        {control}
        <p id={`${idBase}-${name}-error`} className="min-h-5 font-mono text-sm text-syntax-type">
          {error}
        </p>
      </div>
    );
  };

  const inputClass = (name: ContactField) =>
    "w-full rounded-md border bg-bg px-3 py-2.5 font-mono text-base text-fg placeholder:text-fg-muted " +
    (errorKey(name) ? "border-syntax-type" : "border-border hover:border-accent");

  const attrs = (name: ContactField) => ({
    id: `${idBase}-${name}`,
    "aria-invalid": errorKey(name) ? (true as const) : undefined,
    "aria-describedby": `${idBase}-${name}-error`,
    className: inputClass(name),
  });

  const failed = shown.status === 500 || shown.status === 429;

  return (
    <form
      ref={formRef}
      action={formAction}
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        void handleSubmit(submit)(event);
      }}
      className="rounded-lg border border-border bg-surface p-5 sm:p-8"
    >
      <fieldset disabled={isPending} className="flex flex-col gap-2">
        <legend className="mb-4 font-mono text-sm text-fg-muted">{`$ ${t("form.legend")}`}</legend>

        {field(
          "name",
          t("form.name"),
          <input
            type="text"
            autoComplete="name"
            maxLength={CONTACT_LIMITS.nameMax + 20}
            {...register("name")}
            {...attrs("name")}
          />,
        )}
        {field(
          "email",
          t("form.email"),
          <input
            type="email"
            autoComplete="email"
            inputMode="email"
            {...register("email")}
            {...attrs("email")}
          />,
        )}
        {field(
          "message",
          t("form.message"),
          <textarea rows={6} {...register("message")} {...attrs("message")} />,
        )}

        {/* Campo trampa para bots: fuera de pantalla y fuera del orden de tabulación */}
        <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
          <label htmlFor={`${idBase}-website`}>{t("form.honeypot")}</label>
          <input
            id={`${idBase}-website`}
            type="text"
            tabIndex={-1}
            autoComplete="off"
            {...register("website")}
          />
        </div>

        <MagneticButton
          type="submit"
          aria-busy={isPending}
          surfaceClassName="rounded-md bg-accent group-hover:opacity-90 group-disabled:opacity-60"
          className="mt-2 inline-flex h-12 items-center justify-center self-start px-6 font-medium text-bg disabled:cursor-wait"
        >
          {isPending ? t("form.sending") : t("form.submit")}
        </MagneticButton>
      </fieldset>

      <div className="mt-4">
        <NetworkCable ref={cable} />
      </div>

      <div aria-live="polite" aria-atomic="true" className="mt-2 min-h-12 font-mono text-sm">
        {shown.status === 200 ? (
          <p className="text-syntax-string">
            <strong className="block text-base">{t("form.success")}</strong>
            {t("form.successBody")}
          </p>
        ) : null}
        {failed ? (
          <div className="text-syntax-type">
            <strong className="block text-base">
              {shown.status === 429 ? undefined : t("form.failure")}
            </strong>
            <p>
              {shown.status === 429
                ? t("form.rateLimited", { email: alternativeEmail })
                : t("form.failureBody", { email: alternativeEmail })}
            </p>
            <button
              type="button"
              onClick={() => submit()}
              disabled={isPending}
              className="mt-3 inline-flex h-10 items-center rounded-md border border-syntax-type px-4 text-syntax-type hover:bg-phase-tint"
            >
              {t("form.retry")}
            </button>
          </div>
        ) : null}
      </div>
    </form>
  );
}
