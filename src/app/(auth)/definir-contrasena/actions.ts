"use server";

import { redirect } from "next/navigation";
import { defaultRouteForRole, portalClienteContent } from "@/config/site";
import { getSessionProfile } from "@/lib/auth";
import {
  definirContrasenaConEnlace,
  definirContrasenaSchema,
  type AuthResult,
} from "@/services/auth.service";

export async function definirContrasenaAction(
  _prevState: AuthResult | null,
  formData: FormData
): Promise<AuthResult> {
  const parsed = definirContrasenaSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const noCoinciden = parsed.error.issues.some((i) => i.path[0] === "confirmar");
    return {
      success: false,
      error: noCoinciden ? portalClienteContent.noCoinciden : portalClienteContent.errorGuardar,
    };
  }

  const result = await definirContrasenaConEnlace(parsed.data);
  if (!result.success) return result;

  const profile = await getSessionProfile();
  redirect(profile ? defaultRouteForRole(profile.role) : "/login");
}
