"use client";

import { useActionState } from "react";
import { authContent } from "@/config/site";
import { loginAction } from "./actions";

export function LoginForm() {
  const [state, formAction, isPending] = useActionState(loginAction, null);

  return (
    <form action={formAction} data-cy="login-form" className="mt-6 flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-small font-medium text-foreground">
          {authContent.emailLabel}
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          data-cy="login-email"
          className="border border-border bg-background px-3 py-2.5 text-body text-foreground outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-small font-medium text-foreground">
          {authContent.passwordLabel}
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="current-password"
          data-cy="login-password"
          className="border border-border bg-background px-3 py-2.5 text-body text-foreground outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30"
        />
      </div>

      {state && !state.success && (
        <p role="alert" data-cy="login-error" className="text-small font-medium text-red-600">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        data-cy="login-submit"
        className="mt-2 cursor-pointer bg-primary px-4 py-2.5 text-small font-semibold text-primary-foreground transition-colors duration-200 hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? authContent.submitPendingLabel : authContent.submitLabel}
      </button>
    </form>
  );
}
