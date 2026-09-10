/**
 * Servicio de Proyectos y Subproyectos.
 *
 * Reglas de negocio que viven acá (no en la UI):
 *  - El código `IACA-<año>-<NNN>` se genera solo al crear; nunca lo digita el
 *    usuario. Se calcula a partir del último código del año en curso.
 *  - El flujo de estados es Contacto → Campo → Cálculo → Dibujo → Entrega, y
 *    desde Entrega se puede Cerrar o Cancelar (también se puede Cancelar desde
 *    cualquier estado). `cambiarEstado` valida la transición.
 *  - Al pasar a "entrega" sin fecha de entrega real, se deja como está (la
 *    fecha real se registra aparte); al "cerrar" se exige fecha de entrega real.
 *
 * Autorización: RLS (0004_...). Escritura solo admin/oficina.
 */
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { emptyToUndefined } from "@/lib/form";
import { ESTADO_FLOW, transicionesValidas, type ProyectoEstado } from "@/lib/proyecto-flujo";
import type { Database } from "@/types/database";

export { ESTADO_FLOW, transicionesValidas };
export type { ProyectoEstado };

export type ProyectoListItem = {
  id: string;
  codigo: string;
  nombre: string;
  estado: ProyectoEstado;
  zona: string | null;
  tipo_servicio: string | null;
  fecha_estimada_entrega: string | null;
  cliente: { id: string; nombre: string } | null;
};

export type ProyectoDetalle = ProyectoListItem & {
  descripcion: string | null;
  provincia: string | null;
  canton: string | null;
  distrito: string | null;
  fecha_inicio: string | null;
  fecha_entrega_real: string | null;
  monto_cobrar: number | null;
  responsable: { id: string; full_name: string } | null;
  created_at: string;
};

export type ProyectoFilters = {
  search?: string;
  estado?: ProyectoEstado;
  zona?: string;
  clienteId?: string;
  responsableId?: string;
};

const LIST_SELECT =
  "id, codigo, nombre, estado, zona, tipo_servicio, fecha_estimada_entrega, cliente:clientes!proyectos_cliente_id_fkey(id, nombre)";

const DETALLE_SELECT = `${LIST_SELECT}, descripcion, provincia, canton, distrito, fecha_inicio, fecha_entrega_real, monto_cobrar, created_at, responsable:profiles!proyectos_responsable_id_fkey(id, full_name)`;

const optionalText = z.preprocess(emptyToUndefined, z.string().trim().max(200).optional());
const optionalDate = z.preprocess(
  emptyToUndefined,
  z.string().date("Fecha inválida").optional()
);
const optionalUuid = z.preprocess(emptyToUndefined, z.string().uuid().optional());

export const proyectoSchema = z.object({
  nombre: z.string().trim().min(3, "Requerido").max(200),
  cliente_id: z.string().uuid("Seleccioná un cliente"),
  tipo_servicio: optionalText,
  descripcion: z.preprocess(emptyToUndefined, z.string().trim().max(2000).optional()),
  provincia: optionalText,
  canton: optionalText,
  distrito: optionalText,
  zona: optionalText,
  responsable_id: optionalUuid,
  fecha_inicio: optionalDate,
  fecha_estimada_entrega: optionalDate,
  fecha_entrega_real: optionalDate,
});

export type ProyectoInput = z.infer<typeof proyectoSchema>;

export async function listProyectos(filters: ProyectoFilters = {}): Promise<ProyectoListItem[]> {
  const supabase = await createClient();
  let query = supabase
    .from("proyectos")
    .select(LIST_SELECT)
    .order("codigo", { ascending: false });

  if (filters.search?.trim()) {
    const term = `%${filters.search.trim()}%`;
    query = query.or(`codigo.ilike.${term},nombre.ilike.${term}`);
  }
  if (filters.estado) query = query.eq("estado", filters.estado);
  if (filters.zona?.trim()) query = query.eq("zona", filters.zona.trim());
  if (filters.clienteId) query = query.eq("cliente_id", filters.clienteId);
  if (filters.responsableId) query = query.eq("responsable_id", filters.responsableId);

  const { data, error } = await query;
  if (error) throw new Error("No se pudo cargar la lista de proyectos.");
  return (data ?? []) as unknown as ProyectoListItem[];
}

export async function getProyecto(id: string): Promise<ProyectoDetalle | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("proyectos")
    .select(DETALLE_SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error("No se pudo cargar el proyecto.");
  return (data as unknown as ProyectoDetalle) ?? null;
}

/** Zonas distintas ya usadas, para el filtro y el autocompletado. */
export async function listZonas(): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("proyectos")
    .select("zona")
    .not("zona", "is", null);
  if (error) throw new Error("No se pudieron cargar las zonas.");
  const unique = new Set((data ?? []).map((r) => r.zona).filter((z): z is string => !!z));
  return [...unique].sort();
}

async function nextCodigo(supabase: Awaited<ReturnType<typeof createClient>>): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `IACA-${year}-`;
  const { data, error } = await supabase
    .from("proyectos")
    .select("codigo")
    .like("codigo", `${prefix}%`)
    .order("codigo", { ascending: false })
    .limit(1);
  if (error) throw new Error("No se pudo generar el código del proyecto.");

  const last = data?.[0]?.codigo;
  const lastNum = last ? Number.parseInt(last.slice(prefix.length), 10) : 0;
  const next = Number.isNaN(lastNum) ? 1 : lastNum + 1;
  return `${prefix}${String(next).padStart(3, "0")}`;
}

export async function createProyecto(input: ProyectoInput): Promise<{ id: string; codigo: string }> {
  const data = proyectoSchema.parse(input);
  const supabase = await createClient();
  const codigo = await nextCodigo(supabase);

  const { data: row, error } = await supabase
    .from("proyectos")
    .insert({ ...data, codigo })
    .select("id, codigo")
    .single();
  if (error) throw new Error("No se pudo crear el proyecto.");
  return row;
}

export async function updateProyecto(id: string, input: ProyectoInput): Promise<void> {
  const data = proyectoSchema.parse(input);
  const supabase = await createClient();
  const { error } = await supabase.from("proyectos").update(data).eq("id", id);
  if (error) throw new Error("No se pudo actualizar el proyecto.");
}

export const cambiarEstadoSchema = z.object({
  id: z.string().uuid(),
  estado: z.enum([
    "contacto",
    "campo",
    "calculo",
    "dibujo",
    "entrega",
    "cerrado",
    "cancelado",
  ]),
  fecha_entrega_real: optionalDate,
});

export async function cambiarEstado(
  input: z.infer<typeof cambiarEstadoSchema>
): Promise<void> {
  const { id, estado, fecha_entrega_real } = cambiarEstadoSchema.parse(input);
  const supabase = await createClient();

  const { data: actual, error: readErr } = await supabase
    .from("proyectos")
    .select("estado, fecha_entrega_real")
    .eq("id", id)
    .single();
  if (readErr || !actual) throw new Error("No se pudo leer el estado actual del proyecto.");

  if (!transicionesValidas(actual.estado).includes(estado)) {
    throw new Error(`Transición no permitida: ${actual.estado} → ${estado}.`);
  }

  const patch: Database["public"]["Tables"]["proyectos"]["Update"] = { estado };
  if (estado === "cerrado") {
    const fecha = fecha_entrega_real ?? actual.fecha_entrega_real;
    if (!fecha) throw new Error("Para cerrar el proyecto registrá la fecha de entrega real.");
    patch.fecha_entrega_real = fecha;
  }

  const { error } = await supabase.from("proyectos").update(patch).eq("id", id);
  if (error) throw new Error("No se pudo cambiar el estado del proyecto.");
}

export async function deleteProyecto(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("proyectos").delete().eq("id", id);
  if (error) throw new Error("No se pudo eliminar el proyecto.");
}

/** Opciones para selects (bitácora, trámites, cobros). */
export async function listProyectoOptions(): Promise<
  { id: string; codigo: string; nombre: string }[]
> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("proyectos")
    .select("id, codigo, nombre")
    .not("estado", "in", "(cancelado)")
    .order("codigo", { ascending: false });
  if (error) throw new Error("No se pudo cargar la lista de proyectos.");
  return data ?? [];
}

// ---------------------------------------------------------------------------
// Subproyectos
// ---------------------------------------------------------------------------
export type Subproyecto = {
  id: string;
  proyecto_id: string;
  nombre: string;
  descripcion: string | null;
  estado: ProyectoEstado;
  orden: number;
};

export const subproyectoSchema = z.object({
  proyecto_id: z.string().uuid(),
  nombre: z.string().trim().min(2, "Requerido").max(200),
  descripcion: z.preprocess(emptyToUndefined, z.string().trim().max(1000).optional()),
  estado: z
    .enum(["contacto", "campo", "calculo", "dibujo", "entrega", "cerrado", "cancelado"])
    .default("contacto"),
});

export async function listSubproyectos(proyectoId: string): Promise<Subproyecto[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("subproyectos")
    .select("id, proyecto_id, nombre, descripcion, estado, orden")
    .eq("proyecto_id", proyectoId)
    .order("orden")
    .order("nombre");
  if (error) throw new Error("No se pudieron cargar los subproyectos.");
  return data ?? [];
}

export async function createSubproyecto(
  input: z.infer<typeof subproyectoSchema>
): Promise<void> {
  const data = subproyectoSchema.parse(input);
  const supabase = await createClient();
  const { error } = await supabase.from("subproyectos").insert(data);
  if (error) throw new Error("No se pudo crear el subproyecto.");
}

export async function deleteSubproyecto(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("subproyectos").delete().eq("id", id);
  if (error) throw new Error("No se pudo eliminar el subproyecto.");
}
