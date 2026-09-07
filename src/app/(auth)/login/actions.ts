"use server";

import { redirect } from "next/navigation";
import { defaultDashboardRoute } from "@/config/site";
import { signInWithPassword, type AuthResult } from "@/services/auth.service";

/**
 * Server Action del formulario de login. Recibe FormData (no un objeto ya
 * validado) porque así lo exige `useActionState`; la validación real ocurre
 * dentro del servicio con zod.
 */
export async function loginAction(
  _prevState: AuthResult | null,
  formData: FormData
): Promise<AuthResult> {
  const result = await signInWithPassword({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!result.success) {
    return result;
  }

  redirect(defaultDashboardRoute);
}
