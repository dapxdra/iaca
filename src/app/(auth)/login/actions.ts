"use server";

import { redirect } from "next/navigation";
import { defaultRouteForRole } from "@/config/site";
import { getSessionProfile } from "@/lib/auth";
import { signInWithPassword, type AuthResult } from "@/services/auth.service";

/**
 * Server Action del formulario de login. Recibe FormData (no un objeto ya
 * validado) porque así lo exige `useActionState`; la validación real ocurre
 * dentro del servicio con zod. Tras iniciar sesión, redirige a la pantalla de
 * inicio de SU rol (un cliente no cae en /proyectos — ver config/site.ts).
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

  const profile = await getSessionProfile();
  redirect(profile ? defaultRouteForRole(profile.role) : "/login");
}
