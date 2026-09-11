/**
 * Helpers de sesión y autorización para el servidor (Server Components y
 * Server Actions). La autorización REAL vive en las políticas RLS de Postgres
 * (supabase/migrations/0005_...) — esto es la segunda capa: falla rápido, con
 * redirecciones correctas por rol, antes de siquiera tocar datos que el
 * usuario no vería de todos modos.
 *
 * 4 roles, 3 niveles de acceso (docs/REQUIREMENTS.md sección 3):
 *   - `admin` / `oficina` ("staff"): acceso total de gestión.
 *   - `campo` ("field staff", junto con admin/oficina): solo bitácora.
 *   - `cliente`: solo lectura de sus propios proyectos (`/mis-proyectos`).
 * Qué ve cada rol en el menú y a qué rutas puede entrar se define una sola
 * vez en `src/config/site.ts` (`navKeysByRole`) — este archivo solo lo aplica.
 */
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { defaultRouteForRole, type UserRole } from "@/config/site";

export type { UserRole };

export type SessionProfile = {
  userId: string;
  email: string | null;
  fullName: string;
  role: UserRole;
  /** Solo no-null cuando `role === "cliente"` — fila de `clientes` asociada. */
  clienteId: string | null;
};

const STAFF_ROLES: UserRole[] = ["admin", "oficina"];
const FIELD_STAFF_ROLES: UserRole[] = ["admin", "oficina", "campo"];

/** Perfil del usuario autenticado, o `null` si no hay sesión / no tiene perfil activo. */
export async function getSessionProfile(): Promise<SessionProfile | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role, active, cliente_id")
    .eq("id", user.id)
    .single();

  if (!profile || !profile.active) return null;

  return {
    userId: user.id,
    email: user.email ?? null,
    fullName: profile.full_name,
    role: profile.role,
    clienteId: profile.cliente_id,
  };
}

/**
 * Igual que `getSessionProfile` pero redirige a /login si no hay sesión válida.
 * Usar al inicio de cualquier página o acción del dashboard.
 */
export async function requireProfile(): Promise<SessionProfile> {
  const profile = await getSessionProfile();
  if (!profile) redirect("/login");
  return profile;
}

export function isStaff(role: UserRole): boolean {
  return STAFF_ROLES.includes(role);
}

export function isFieldStaff(role: UserRole): boolean {
  return FIELD_STAFF_ROLES.includes(role);
}

/**
 * Exige que el rol esté en `allowed`; si no, redirige a la pantalla de inicio
 * de ESE rol (no a /login — ya está logueado, solo no tiene acceso acá).
 * Usar al inicio de cada página para que escribir la URL a mano no sirva de
 * nada — la restricción de rol no depende solo de qué enlaces se muestran.
 */
export async function requireRole(allowed: UserRole[]): Promise<SessionProfile> {
  const profile = await requireProfile();
  if (!allowed.includes(profile.role)) {
    redirect(defaultRouteForRole(profile.role));
  }
  return profile;
}

/**
 * Exige rol admin/oficina. Devuelve el perfil si pasa; si no, lanza — pensado
 * para Server Actions (que capturan el error y muestran un mensaje genérico),
 * no para páginas (ahí usar `requireRole`, que redirige en vez de tirar error).
 */
export async function requireStaff(): Promise<SessionProfile> {
  const profile = await requireProfile();
  if (!isStaff(profile.role)) {
    throw new Error("No tienes permiso para realizar esta acción.");
  }
  return profile;
}
