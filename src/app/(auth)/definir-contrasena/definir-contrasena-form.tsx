"use client";

import { useActionState } from "react";
import { TriangleAlert } from "lucide-react";
import { portalClienteContent } from "@/config/site";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { definirContrasenaAction } from "./actions";

export function DefinirContrasenaForm({
  tokenHash,
  type,
}: {
  tokenHash: string;
  type: "invite" | "recovery";
}) {
  const [state, formAction, isPending] = useActionState(definirContrasenaAction, null);
  const c = portalClienteContent;

  return (
    <form action={formAction} data-cy="definir-contrasena-form" className="mt-6 flex flex-col gap-4">
      <input type="hidden" name="token_hash" value={tokenHash} />
      <input type="hidden" name="type" value={type} />

      <Field label={c.passwordLabel} htmlFor="password" hint={c.passwordHint}>
        <Input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          maxLength={72}
          autoComplete="new-password"
          autoFocus
          data-cy="definir-contrasena-password"
        />
      </Field>

      <Field label={c.confirmarLabel} htmlFor="confirmar">
        <Input
          id="confirmar"
          name="confirmar"
          type="password"
          required
          minLength={8}
          maxLength={72}
          autoComplete="new-password"
          data-cy="definir-contrasena-confirmar"
        />
      </Field>

      {state && !state.success && (
        <p
          role="alert"
          data-cy="definir-contrasena-error"
          className="flex animate-fade-in items-center gap-2 rounded-md border border-danger/30 bg-danger/8 px-3 py-2 text-small font-medium text-danger"
        >
          <TriangleAlert className="h-4 w-4 shrink-0" />
          {state.error}
        </p>
      )}

      <Button
        type="submit"
        loading={isPending}
        data-cy="definir-contrasena-submit"
        className="mt-2 w-full"
      >
        {isPending ? c.guardarPendingLabel : c.guardarLabel}
      </Button>
    </form>
  );
}
