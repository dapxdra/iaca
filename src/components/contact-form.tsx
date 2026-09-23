"use client";

import { useActionState, useEffect, useRef } from "react";
import Link from "next/link";
import { CheckCircle2, Send, TriangleAlert } from "lucide-react";
import { enviarMensajeContacto } from "@/app/actions";
import { contactFormContent, legalNav, servicioOptions } from "@/config/site";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { idleFormState } from "@/lib/form";

/**
 * Formulario público de solicitud de cotización.
 *
 * No reutiliza `<ActionForm>` porque ese componente cierra con
 * `<DialogActions>`, pensado para los diálogos del panel; acá el formulario
 * vive dentro de una sección de la landing.
 *
 * Validación en dos capas: los atributos nativos (`required`, `type="email"`,
 * `maxLength`) dan respuesta inmediata y las semánticas de accesibilidad; la
 * autoridad real es zod en la Server Action, que es lo único que un cliente
 * manipulado no puede saltarse.
 *
 * Anti-spam: honeypot + marca de tiempo de renderizado. Ambos se envían como
 * campos ocultos y los evalúa el servidor (src/services/contacto.service.ts).
 */
export function ContactForm() {
  const [state, formAction, pending] = useActionState(enviarMensajeContacto, idleFormState);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const renderizadoEnRef = useRef<HTMLInputElement>(null);

  /**
   * La marca de tiempo se escribe en el input al montar, no se renderiza.
   *
   * Esta página se prerenderiza estática: si el valor viniera del render,
   * quedaría congelado el instante del build y todo envío parecería hecho
   * horas después de cargar la página. Escribir el DOM en un efecto es el uso
   * correcto de `useEffect` (sincronizar con un sistema externo) y evita el
   * re-render que provocaría un `setState`.
   *
   * Si el visitante tiene JavaScript deshabilitado el campo queda vacío y el
   * servidor simplemente omite esta comprobación — el formulario sigue
   * funcionando, protegido por el honeypot y el límite por IP.
   */
  useEffect(() => {
    if (renderizadoEnRef.current) {
      renderizadoEnRef.current.value = String(Date.now());
    }
  }, []);

  // Mueve el foco al error general para que quien usa lector de pantalla o
  // teclado se entere de que el envío falló (WCAG 3.3.1).
  useEffect(() => {
    if (state.status === "error" && !state.fieldErrors) errorRef.current?.focus();
  }, [state]);

  const fieldErrors = state.status === "error" ? (state.fieldErrors ?? {}) : {};
  const formError = state.status === "error" && !state.fieldErrors ? state.message : null;

  if (state.status === "success") {
    return (
      <div
        data-cy="contact-form-success"
        role="status"
        className="animate-pop flex flex-col items-start gap-3 rounded-lg border border-success/30 bg-success/8 p-6"
      >
        <CheckCircle2 className="h-7 w-7 text-success" aria-hidden="true" />
        <div>
          <p className="text-h3 font-heading font-semibold text-foreground">
            {contactFormContent.successTitle}
          </p>
          <p className="mt-1.5 text-body text-muted-foreground">{state.message}</p>
        </div>
      </div>
    );
  }

  return (
    <form
      action={formAction}
      data-cy="contact-form"
      className="flex flex-col gap-5 rounded-lg border border-border bg-surface-raised p-6 shadow-sm sm:p-8"
    >
      {/*
        Honeypot. Fuera de la vista pero presente en el DOM, que es donde lo
        busca un bot. `aria-hidden` + `tabIndex={-1}` lo sacan del árbol de
        accesibilidad y del orden de tabulación, así que ni lectores de
        pantalla ni navegación por teclado lo encuentran. No se usa
        `display:none` a propósito: muchos bots omiten esos campos.
      */}
      <div aria-hidden="true" className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="honeypot">{contactFormContent.honeypotLabel}</label>
        <input
          type="text"
          id="honeypot"
          name="honeypot"
          tabIndex={-1}
          autoComplete="off"
          defaultValue=""
        />
      </div>
      <input type="hidden" name="renderizadoEn" ref={renderizadoEnRef} defaultValue="" />

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label={contactFormContent.nombreLabel}
          htmlFor="nombre"
          error={fieldErrors.nombre}
          required
        >
          <Input
            id="nombre"
            name="nombre"
            type="text"
            required
            minLength={2}
            maxLength={120}
            autoComplete="name"
            data-cy="contact-nombre"
            aria-invalid={Boolean(fieldErrors.nombre)}
            aria-describedby={fieldErrors.nombre ? "nombre-error" : undefined}
          />
        </Field>

        <Field
          label={contactFormContent.emailLabel}
          htmlFor="email"
          error={fieldErrors.email}
          required
        >
          <Input
            id="email"
            name="email"
            type="email"
            required
            maxLength={200}
            autoComplete="email"
            // Sugiere el teclado con @ en móviles.
            inputMode="email"
            data-cy="contact-email"
            aria-invalid={Boolean(fieldErrors.email)}
            aria-describedby={fieldErrors.email ? "email-error" : undefined}
          />
        </Field>

        <Field
          label={contactFormContent.telefonoLabel}
          htmlFor="telefono"
          error={fieldErrors.telefono}
          hint={contactFormContent.telefonoHint}
        >
          <Input
            id="telefono"
            name="telefono"
            type="tel"
            maxLength={40}
            autoComplete="tel"
            inputMode="tel"
            data-cy="contact-telefono"
            aria-invalid={Boolean(fieldErrors.telefono)}
            aria-describedby={fieldErrors.telefono ? "telefono-error" : undefined}
          />
        </Field>

        <Field
          label={contactFormContent.servicioLabel}
          htmlFor="servicio"
          error={fieldErrors.servicio}
        >
          <Select
            id="servicio"
            name="servicio"
            defaultValue=""
            data-cy="contact-servicio"
            aria-invalid={Boolean(fieldErrors.servicio)}
            aria-describedby={fieldErrors.servicio ? "servicio-error" : undefined}
          >
            <option value="">{contactFormContent.servicioPlaceholder}</option>
            {servicioOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <Field
        label={contactFormContent.ubicacionLabel}
        htmlFor="ubicacion"
        error={fieldErrors.ubicacion}
        hint={contactFormContent.ubicacionHint}
      >
        <Input
          id="ubicacion"
          name="ubicacion"
          type="text"
          maxLength={200}
          autoComplete="address-level1"
          data-cy="contact-ubicacion"
          aria-invalid={Boolean(fieldErrors.ubicacion)}
          aria-describedby={fieldErrors.ubicacion ? "ubicacion-error" : undefined}
        />
      </Field>

      <Field
        label={contactFormContent.mensajeLabel}
        htmlFor="mensaje"
        error={fieldErrors.mensaje}
        required
      >
        <Textarea
          id="mensaje"
          name="mensaje"
          rows={5}
          required
          minLength={10}
          maxLength={4000}
          placeholder={contactFormContent.mensajePlaceholder}
          data-cy="contact-mensaje"
          aria-invalid={Boolean(fieldErrors.mensaje)}
          aria-describedby={fieldErrors.mensaje ? "mensaje-error" : undefined}
        />
      </Field>

      {formError && (
        <p
          ref={errorRef}
          tabIndex={-1}
          role="alert"
          data-cy="contact-form-error"
          className="flex animate-fade-in items-start gap-2 rounded-md border border-danger/30 bg-danger/8 px-3 py-2.5 text-small font-medium text-danger outline-none"
        >
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {formError}
        </p>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-small text-muted-foreground">
          {contactFormContent.privacyNotice}{" "}
          <Link
            href={legalNav[0].href}
            data-cy="contact-privacy-link"
            className="font-medium text-accent underline decoration-accent/40 underline-offset-2 transition-colors hover:decoration-accent"
          >
            {legalNav[0].label.toLowerCase()}
          </Link>
          .
        </p>
        <Button
          type="submit"
          loading={pending}
          data-cy="contact-form-submit"
          className="shrink-0"
        >
          {!pending && <Send className="h-4 w-4" aria-hidden="true" />}
          {pending ? contactFormContent.submitPendingLabel : contactFormContent.submitLabel}
        </Button>
      </div>
    </form>
  );
}
