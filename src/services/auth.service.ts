/**
 * Servicio de autenticación. Solo se importa desde Server Actions / route
 * handlers ("use server") — nunca desde un componente cliente.
 */
import { z } from "zod";
import { authContent, portalClienteContent } from "@/config/site";
import { createClient } from "@/lib/supabase/server";

export const credentialsSchema = z.object({
  email: z.string().trim().min(1).email(),
  password: z.string().min(8),
});

export type Credentials = z.infer<typeof credentialsSchema>;

export type AuthResult = { success: true } | { success: false; error: string };

/**
 * Intenta iniciar sesión con correo/contraseña.
 *
 * Siempre devuelve el mismo mensaje de error genérico ante credenciales
 * inválidas, entrada malformada o un fallo inesperado de Supabase — así no se
 * filtra si un correo existe en el sistema ni detalles internos del error.
 */
export async function signInWithPassword(input: unknown): Promise<AuthResult> {
  const parsed = credentialsSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: authContent.genericErrorMessage };
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword(parsed.data);

    if (error) {
      return { success: false, error: authContent.genericErrorMessage };
    }

    return { success: true };
  } catch {
    // Supabase sin configurar, red caída, etc. — tratar igual que credenciales
    // inválidas de cara al usuario; el detalle real solo interesa en logs de servidor.
    return { success: false, error: authContent.genericErrorMessage };
  }
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
}

export const definirContrasenaSchema = z
  .object({
    token_hash: z.string().min(1),
    // Los dos tipos de enlace que manda portal-clientes.service.ts.
    type: z.enum(["invite", "recovery"]),
    password: z.string().min(8).max(72),
    confirmar: z.string(),
  })
  .refine((v) => v.password === v.confirmar, { path: ["confirmar"] });

/**
 * Canjea el enlace de un solo uso (inicia la sesión) y define la contraseña.
 * El token se canjea recién acá, al enviar el formulario, y no al abrir el
 * enlace: los escáneres de correo abren los links y lo consumirían.
 */
export async function definirContrasenaConEnlace(
  input: z.infer<typeof definirContrasenaSchema>
): Promise<AuthResult> {
  const { token_hash, type, password } = definirContrasenaSchema.parse(input);
  try {
    const supabase = await createClient();
    const { error: otpError } = await supabase.auth.verifyOtp({ token_hash, type });
    if (otpError) {
      // Un reintento tras un updateUser fallido: el token ya se canjeó, pero
      // dejó la sesión iniciada. Con sesión, cambiar la contraseña ya está al
      // alcance de esa persona por la API de Supabase; no se abre nada nuevo.
      const { data } = await supabase.auth.getUser();
      if (!data.user) return { success: false, error: portalClienteContent.enlaceInvalido };
    }

    const { error } = await supabase.auth.updateUser({ password });
    if (error) return { success: false, error: portalClienteContent.errorGuardar };
    return { success: true };
  } catch {
    return { success: false, error: portalClienteContent.errorGuardar };
  }
}
