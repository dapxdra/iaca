/**
 * Servicio de Clientes — patrón de referencia (ver CLAUDE.md, "Arquitectura
 * SOA"). Un archivo por entidad, funciones tipadas, sin lógica de UI.
 *
 * Autorización: RLS en Postgres (0004_...). Lectura para cualquier usuario con
 * perfil activo; escritura solo admin/oficina. Estas funciones solo arman la
 * consulta — no re-implementan la autorización.
 */
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { emptyToUndefined } from "@/lib/form";
import type { Database } from "@/types/database";

export type ClienteTipo = Database["public"]["Enums"]["cliente_tipo"];

export type Cliente = {
  id: string;
  tipo: ClienteTipo;
  nombre: string;
  identificacion: string | null;
  telefono: string | null;
  email: string | null;
  direccion: string | null;
  notas: string | null;
  created_at: string;
};

const LIST_COLUMNS =
  "id, tipo, nombre, identificacion, telefono, email, direccion, notas, created_at";

const optionalText = z.preprocess(
  emptyToUndefined,
  z.string().trim().max(200).optional()
);

export const clienteSchema = z.object({
  tipo: z.enum(["persona_fisica", "persona_juridica"]),
  nombre: z.string().trim().min(2, "Requerido").max(200),
  identificacion: optionalText,
  telefono: optionalText,
  email: z.preprocess(
    emptyToUndefined,
    z.string().trim().email("Correo inválido").max(200).optional()
  ),
  direccion: z.preprocess(emptyToUndefined, z.string().trim().max(500).optional()),
  notas: z.preprocess(emptyToUndefined, z.string().trim().max(1000).optional()),
});

export type ClienteInput = z.infer<typeof clienteSchema>;

/** Lista clientes; filtra por texto en nombre/identificación/correo si se pasa `search`. */
export async function listClientes(search?: string): Promise<Cliente[]> {
  const supabase = await createClient();
  let query = supabase.from("clientes").select(LIST_COLUMNS).order("nombre");

  if (search && search.trim()) {
    const term = `%${search.trim()}%`;
    query = query.or(
      `nombre.ilike.${term},identificacion.ilike.${term},email.ilike.${term}`
    );
  }

  const { data, error } = await query;
  if (error) throw new Error("No se pudo cargar la lista de clientes.");
  return data ?? [];
}

export async function getCliente(id: string): Promise<Cliente | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clientes")
    .select(LIST_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error("No se pudo cargar el cliente.");
  return data;
}

export async function createCliente(input: ClienteInput): Promise<string> {
  const data = clienteSchema.parse(input);
  const supabase = await createClient();
  const { data: row, error } = await supabase
    .from("clientes")
    .insert(data)
    .select("id")
    .single();
  if (error) throw new Error("No se pudo crear el cliente.");
  return row.id;
}

export async function updateCliente(id: string, input: ClienteInput): Promise<void> {
  const data = clienteSchema.parse(input);
  const supabase = await createClient();
  const { error } = await supabase.from("clientes").update(data).eq("id", id);
  if (error) throw new Error("No se pudo actualizar el cliente.");
}

export async function deleteCliente(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("clientes").delete().eq("id", id);
  if (error) {
    // FK con proyectos: Postgres lo rechaza (RESTRICT por defecto).
    throw new Error(
      "No se pudo eliminar. ¿El cliente tiene proyectos asociados? Reasignalos o eliminalos primero."
    );
  }
}

/** Opciones para selects (formulario de proyecto). */
export async function listClienteOptions(): Promise<{ id: string; nombre: string }[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("clientes").select("id, nombre").order("nombre");
  if (error) throw new Error("No se pudo cargar la lista de clientes.");
  return data ?? [];
}
