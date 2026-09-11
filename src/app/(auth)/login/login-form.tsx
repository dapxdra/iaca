"use client";

import { useActionState } from "react";
import { TriangleAlert } from "lucide-react";
import { authContent } from "@/config/site";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { loginAction } from "./actions";

export function LoginForm() {
  const [state, formAction, isPending] = useActionState(loginAction, null);

  return (
    <form action={formAction} data-cy="login-form" className="mt-6 flex flex-col gap-4">
      <Field label={authContent.emailLabel} htmlFor="email">
        <Input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          autoFocus
          data-cy="login-email"
        />
      </Field>

      <Field label={authContent.passwordLabel} htmlFor="password">
        <Input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="current-password"
          data-cy="login-password"
        />
      </Field>

      {state && !state.success && (
        <p
          role="alert"
          data-cy="login-error"
          className="flex animate-fade-in items-center gap-2 rounded-md border border-red-700/30 bg-red-700/8 px-3 py-2 text-small font-medium text-red-700"
        >
          <TriangleAlert className="h-4 w-4 shrink-0" />
          {state.error}
        </p>
      )}

      <Button
        type="submit"
        loading={isPending}
        data-cy="login-submit"
        className="mt-2 w-full"
      >
        {isPending ? authContent.submitPendingLabel : authContent.submitLabel}
      </Button>
    </form>
  );
}
