import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * Cliente de Supabase con `service_role`. Pasa por encima de RLS, así que es
 * el equivalente a ser superusuario de la base: solo se usa donde RLS no puede
 * expresar la regla.
 *
 * Usos:
 *  - El job diario de alertas (src/services/alertas.service.ts): no hay un
 *    usuario detrás, lee todos los proyectos y escribe en la bandeja de cada
 *    persona; `notificaciones` no tiene política de insert para nadie.
 *  - Insertar en `contacto_mensajes` desde el formulario público. Esa tabla no tiene política de insert para nadie (ver
 * supabase/migrations/0006_contacto_mensajes.sql), de modo que el único camino
 * de entrada es la Server Action que valida, aplica el honeypot y limita por
 * IP. Si `anon` pudiera insertar, un bot llamaría la API REST directamente y
 * se saltaría las tres cosas.
 *
 * `import "server-only"` es lo que hace cumplir la regla de CLAUDE.md sobre la
 * service role key: si algún día alguien importa este módulo desde un
 * componente cliente, el build falla con un error explícito en vez de filtrar
 * la llave al bundle del navegador silenciosamente.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    // Mensaje para el log del servidor, nunca para el usuario final.
    throw new Error(
      "Supabase no está configurado: faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY."
    );
  }

  return createSupabaseClient<Database>(url, serviceRoleKey, {
    auth: {
      // Sin sesión ni refresco: es un cliente de un solo uso por request, no
      // representa a una persona.
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
