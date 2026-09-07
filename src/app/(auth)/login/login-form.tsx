"use client";

import { useActionState } from "react";
import { authContent } from "@/config/site";
import { loginAction } from "./actions";

export function LoginForm() {
  const [state, formAction, isPending] = useActionState(loginAction, null);

  return (
    <form action={formAction} data-cy="login-form" className="mt-6 flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="email" className="text-sm font-medium">
          {authContent.emailLabel}
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          data-cy="login-email"
          className="rounded-md border border-black/10 px-3 py-2 text-sm dark:border-white/10"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="password" className="text-sm font-medium">
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
          className="rounded-md border border-black/10 px-3 py-2 text-sm dark:border-white/10"
        />
      </div>

      {state && !state.success && (
        <p role="alert" data-cy="login-error" className="text-sm text-red-600">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        data-cy="login-submit"
        className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-60"
      >
        {isPending ? authContent.submitPendingLabel : authContent.submitLabel}
      </button>
    </form>
  );
}
