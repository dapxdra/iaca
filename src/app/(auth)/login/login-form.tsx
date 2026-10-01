"use client";

import { useActionState, useState } from "react";
import { Eye, EyeOff, TriangleAlert } from "lucide-react";
import { authContent } from "@/config/site";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { loginAction } from "./actions";

export function LoginForm() {
  const [state, formAction, isPending] = useActionState(loginAction, null);
  const [showPassword, setShowPassword] = useState(false);

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
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            required
            minLength={8}
            autoComplete="current-password"
            data-cy="login-password"
            className="pr-11"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={
              showPassword ? authContent.hidePasswordLabel : authContent.showPasswordLabel
            }
            aria-pressed={showPassword}
            aria-controls="password"
            data-cy="login-password-toggle"
            className="absolute inset-y-0 right-0 flex w-11 cursor-pointer items-center justify-center rounded-r-md text-muted-foreground outline-none transition-colors duration-150 hover:text-foreground focus-visible:text-foreground focus-visible:shadow-[0_0_0_3px_var(--ring)]"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </Field>

      {state && !state.success && (
        <p
          role="alert"
          data-cy="login-error"
          className="flex animate-fade-in items-center gap-2 rounded-md border border-danger/30 bg-danger/8 px-3 py-2 text-small font-medium text-danger"
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
