/**
 * Servicio de Eventos e indicaciones de un proyecto: notas con fecha que
 * registra la oficina (una visita, una llamada con el cliente, una
 * instrucción para el equipo).
 *
 * Autorización: RLS (0012_...). Lectura y escritura solo admin/oficina; el
 * cliente no las ve.
 */
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type ProyectoEvento = {
  id: string;
  fecha: string;
  descripcion: string;
  created_at: string;
  autor: { full_name: string } | null;
};

export const eventoSchema = z.object({
  proyecto_id: z.string().uuid(),
  fecha: z.string().date("Fecha inválida"),
  descripcion: z.string().trim().min(2, "Requerido").max(2000),
});

export async function listEventos(proyectoId: string): Promise<ProyectoEvento[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("proyecto_eventos")
    .select(
      "id, fecha, descripcion, created_at, autor:profiles!proyecto_eventos_created_by_fkey(full_name)"
    )
    .eq("proyecto_id", proyectoId)
    .order("fecha", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw new Error("No se pudieron cargar los eventos del proyecto.");
  return (data ?? []) as unknown as ProyectoEvento[];
}

export async function createEvento(
  input: z.infer<typeof eventoSchema>,
  userId: string
): Promise<void> {
  const data = eventoSchema.parse(input);
  const supabase = await createClient();
  const { error } = await supabase
    .from("proyecto_eventos")
    .insert({ ...data, created_by: userId });
  if (error) throw new Error("No se pudo registrar el evento.");
}

export async function deleteEvento(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("proyecto_eventos").delete().eq("id", id);
  if (error) throw new Error("No se pudo eliminar el evento.");
}
