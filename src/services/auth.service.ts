/**
 * Servicio de autenticación. Solo se importa desde Server Actions / route
 * handlers ("use server") — nunca desde un componente cliente.
 */
import { z } from "zod";
import { authContent } from "@/config/site";
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
