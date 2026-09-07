/**
 * Servicio de Clientes — patrón de referencia para los demás servicios
 * (proyectos, bitácora, trámites, kpi): un archivo por entidad, funciones
 * tipadas, sin lógica de UI. Ver CLAUDE.md, sección "Arquitectura (SOA)".
 *
 * La autorización real la aplican las políticas RLS de
 * `supabase/migrations/0001_init.sql` (lectura: cualquier usuario
 * autenticado; escritura: roles admin/oficina) — este servicio solo arma
 * las consultas.
 */
import { createClient } from "@/lib/supabase/server";

export type ClienteTipo = "persona_fisica" | "persona_juridica";

export type Cliente = {
  id: string;
  tipo: ClienteTipo;
  nombre: string;
  identificacion: string | null;
  telefono: string | null;
  email: string | null;
  direccion: string | null;
  created_at: string;
};

const CLIENTE_LIST_COLUMNS =
  "id, tipo, nombre, identificacion, telefono, email, direccion, created_at";

/** Lista clientes ordenados por nombre. Solo trae las columnas usadas en el listado. */
export async function listClientes(): Promise<Cliente[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clientes")
    .select(CLIENTE_LIST_COLUMNS)
    .order("nombre", { ascending: true });

  if (error) {
    throw new Error("No se pudo cargar la lista de clientes.");
  }

  return data ?? [];
}
