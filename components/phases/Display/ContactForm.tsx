"use client";

import { MagneticButton } from "@/components/ui/Magnetic";
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
import { audio } from "@/audio";
import { sendContact } from "@/lib/contact/action";
import {
  CONTACT_FIELDS,
  CONTACT_LIMITS,
  validateContactField,
  type ContactErrorKey,
  type ContactField,
  type ContactFieldErrors,
} from "@/lib/contact/schema";
import { IDLE, type ContactState } from "@/lib/contact/state";
import { NetworkCable, type CableHandle } from "./NetworkCable";


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
 * campo y un resultado anunciado en una región `aria-live`. Cliente y servidor comparten las mismas
 * reglas (`lib/contact/schema`, sin librerías: ni zod ni react-hook-form viajan en el JS inicial). Sin JavaScript el formulario se envía igualmente a la Server Action.
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
  // Validación en vivo estilo «onTouched»: al salir de un campo y, desde entonces, al escribir en él.
  const [clientErrors, setClientErrors] = useState<ContactFieldErrors>({});
  const [touched, setTouched] = useState<readonly ContactField[]>([]);
  const markTouched = (...names: ContactField[]) =>
    setTouched((previous) => [...previous, ...names.filter((n) => !previous.includes(n))]);
  const setFieldError = (name: ContactField, key: ContactErrorKey | undefined) =>
    setClientErrors((previous) => {
      if (previous[name] === key) return previous;
      const next = { ...previous };
      if (key) next[name] = key;
      else delete next[name];
      return next;
    });
  const valueOf = (name: ContactField): string => {
    const element = formRef.current?.elements.namedItem(name);
    return element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement ? element.value : "";
  };

  // Resultado del servidor: errores por campo (400) o formulario limpio (éxito).
  useEffect(() => {
    if (state.status === 400) {
      // Estado derivado de la respuesta del servidor: se vuelca una vez por resultado.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setClientErrors({ ...state.fieldErrors });
    } else if (state.status === 200) {
      formRef.current?.reset();
      setTouched([]);
      setClientErrors({});
    }
  }, [state]);

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

  // El resultado suena cuando se MUESTRA (el paquete ya volvió): firma completa con éxito, dos notas
  // descendentes con error. El mensaje de error sigue estando también en pantalla.
  useEffect(() => {
    if (displayed.status === "idle") return;
    audio.emit(displayed.status === 200 ? "contact:ok" : "contact:error");
  }, [displayed]);

  const submit = () => {
    if (!formRef.current) return;
    const data = new FormData(formRef.current);
    setDisplayed(IDLE);
    audio.emit("contact:send"); // pulsos de «paquete» que viajan de izquierda a derecha
    cable.current?.send();
    startTransition(() => formAction(data));
  };

  const onSubmit = (event: React.SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    const errors: ContactFieldErrors = {};
    for (const name of CONTACT_FIELDS) {
      const key = validateContactField(name, valueOf(name));
      if (key) errors[name] = key;
    }
    markTouched(...CONTACT_FIELDS);
    setClientErrors(errors);
    const firstInvalid = CONTACT_FIELDS.find((name) => errors[name]);
    if (firstInvalid) {
      (formRef.current?.elements.namedItem(firstInvalid) as HTMLElement | null)?.focus();
      return;
    }
    submit();
  };

  const fieldHandlers = (name: ContactField) => ({
    onBlur: (event: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      markTouched(name);
      setFieldError(name, validateContactField(name, event.currentTarget.value));
    },
    onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      if (touched.includes(name)) setFieldError(name, validateContactField(name, event.currentTarget.value));
    },
  });

  // Con JavaScript manda la validación en vivo (que también recibe los errores del servidor).
  // Sin JavaScript solo existe la respuesta del servidor, que se pinta directamente.
  const errorKey = (field: ContactField): ContactErrorKey | undefined =>
    hydrated
      ? clientErrors[field]
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
      onFocus={(event) => {
        // Nota suave al entrar en un campo (no en el botón ni en el campo trampa).
        const target = event.target as HTMLElement;
        if (target.matches("input:not([tabindex='-1']), textarea")) audio.emit("contact:focus");
      }}
      onSubmit={onSubmit}
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
            name="name"
            defaultValue={initial?.name ?? ""}
            {...fieldHandlers("name")}
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
            name="email"
            defaultValue={initial?.email ?? ""}
            {...fieldHandlers("email")}
            {...attrs("email")}
          />,
        )}
        {field(
          "message",
          t("form.message"),
          <textarea
            rows={6}
            name="message"
            defaultValue={initial?.message ?? ""}
            {...fieldHandlers("message")}
            {...attrs("message")}
          />,
        )}

        {/* Campo trampa para bots: fuera de pantalla y fuera del orden de tabulación */}
        <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
          <label htmlFor={`${idBase}-website`}>{t("form.honeypot")}</label>
          <input
            id={`${idBase}-website`}
            type="text"
            tabIndex={-1}
            autoComplete="off"
            name="website"
            defaultValue=""
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
