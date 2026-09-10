/**
 * Helpers de sesión y autorización para el servidor (Server Components y
 * Server Actions). La autorización REAL vive en las políticas RLS de Postgres
 * (supabase/migrations/0004_...) — esto es la segunda capa: falla rápido y con
 * un mensaje claro antes de siquiera tocar la base de datos, y da el rol a la
 * UI para esconder acciones que el usuario no puede hacer.
 */
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

export type UserRole = Database["public"]["Enums"]["user_role"];

export type SessionProfile = {
  userId: string;
  email: string | null;
  fullName: string;
  role: UserRole;
};

const STAFF_ROLES: UserRole[] = ["admin", "oficina"];

/** Perfil del usuario autenticado, o `null` si no hay sesión / no tiene perfil. */
export async function getSessionProfile(): Promise<SessionProfile | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role, active")
    .eq("id", user.id)
    .single();

  if (!profile || !profile.active) return null;

  return {
    userId: user.id,
    email: user.email ?? null,
    fullName: profile.full_name,
    role: profile.role,
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

/**
 * Exige rol admin/oficina. Devuelve el perfil si pasa; si no, lanza — las
 * Server Actions lo capturan y muestran un error genérico, y la UI ya debería
 * haber escondido la acción de todos modos.
 */
export async function requireStaff(): Promise<SessionProfile> {
  const profile = await requireProfile();
  if (!isStaff(profile.role)) {
    throw new Error("No tienes permiso para realizar esta acción.");
  }
  return profile;
}
