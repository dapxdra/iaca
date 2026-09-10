/**
 * Servicio de Perfiles (usuarios internos). En el MVP solo se leen para
 * poblar los selects de "responsable" / "trabajador". La gestión de usuarios
 * (crear, cambiar rol) se hace por ahora desde el panel de Supabase Auth.
 */
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

export type UserRole = Database["public"]["Enums"]["user_role"];

export type ProfileOption = {
  id: string;
  full_name: string;
  role: UserRole;
};

/** Perfiles activos, para selects de asignación. `roles` filtra por rol. */
export async function listProfileOptions(roles?: UserRole[]): Promise<ProfileOption[]> {
  const supabase = await createClient();
  let query = supabase
    .from("profiles")
    .select("id, full_name, role")
    .eq("active", true)
    .order("full_name");

  if (roles && roles.length) query = query.in("role", roles);

  const { data, error } = await query;
  if (error) throw new Error("No se pudo cargar la lista de personas.");
  return data ?? [];
}
