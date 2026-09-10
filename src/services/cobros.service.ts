/**
 * Servicio de Cobros — registro interno de montos a cobrar y pagos por
 * proyecto (supabase/migrations/0002_cobros.sql, docs/REQUIREMENTS.md 4.10).
 * NO genera comprobantes fiscales.
 *
 * El saldo pendiente lo calcula la vista `vw_cobros_proyecto` (no se almacena,
 * para que nunca quede desactualizado si se corrige un pago).
 *
 * Autorización: RLS (0004_...). Lectura para cualquier perfil activo;
 * escritura (definir monto, registrar/eliminar pagos) solo admin/oficina.
 */
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { emptyToUndefined } from "@/lib/form";
import type { Database } from "@/types/database";

export type MetodoPago = Database["public"]["Enums"]["metodo_pago"];

export type CobroProyecto = {
  proyecto_id: string;
  codigo: string;
  nombre: string;
  cliente_id: string;
  monto_cobrar: number | null;
  total_pagado: number;
  saldo_pendiente: number | null;
  fecha_ultimo_pago: string | null;
};

export type Pago = {
  id: string;
  proyecto_id: string;
  monto: number;
  fecha_pago: string;
  metodo: MetodoPago;
  notas: string | null;
  created_at: string;
};

const COBRO_COLUMNS =
  "proyecto_id, codigo, nombre, cliente_id, monto_cobrar, total_pagado, saldo_pendiente, fecha_ultimo_pago";

/** Estado de cobro de todos los proyectos, del saldo más alto al más bajo. */
export async function listCobrosProyectos(): Promise<CobroProyecto[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("vw_cobros_proyecto")
    .select(COBRO_COLUMNS)
    .order("saldo_pendiente", { ascending: false, nullsFirst: false });
  if (error) throw new Error("No se pudo cargar el estado de cobro de los proyectos.");
  return (data ?? []) as CobroProyecto[];
}

export async function getCobroProyecto(proyectoId: string): Promise<CobroProyecto | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("vw_cobros_proyecto")
    .select(COBRO_COLUMNS)
    .eq("proyecto_id", proyectoId)
    .maybeSingle();
  if (error) throw new Error("No se pudo cargar el cobro del proyecto.");
  return (data as CobroProyecto) ?? null;
}

export async function listPagos(proyectoId: string): Promise<Pago[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pagos")
    .select("id, proyecto_id, monto, fecha_pago, metodo, notas, created_at")
    .eq("proyecto_id", proyectoId)
    .order("fecha_pago", { ascending: false });
  if (error) throw new Error("No se pudieron cargar los pagos.");
  return data ?? [];
}

export const montoCobrarSchema = z.object({
  proyectoId: z.string().uuid(),
  // El input llega como string desde FormData; permitimos vacío = "sin definir".
  montoCobrar: z.preprocess(
    emptyToUndefined,
    z.coerce.number().nonnegative("No puede ser negativo").max(1_000_000_000).optional()
  ),
});

export async function setMontoCobrar(
  input: z.infer<typeof montoCobrarSchema>
): Promise<void> {
  const { proyectoId, montoCobrar } = montoCobrarSchema.parse(input);
  const supabase = await createClient();
  const { error } = await supabase
    .from("proyectos")
    .update({ monto_cobrar: montoCobrar ?? null })
    .eq("id", proyectoId);
  if (error) throw new Error("No se pudo actualizar el monto a cobrar.");
}

export const registrarPagoSchema = z.object({
  proyectoId: z.string().uuid(),
  monto: z.coerce.number().positive("Debe ser mayor que cero").max(1_000_000_000),
  fechaPago: z.string().date("Fecha inválida"),
  metodo: z.enum(["efectivo", "sinpe_movil", "transferencia", "cheque", "otro"]),
  notas: z.preprocess(emptyToUndefined, z.string().trim().max(500).optional()),
});

export type RegistrarPagoInput = z.infer<typeof registrarPagoSchema>;

/** Registra un pago/abono contra el monto a cobrar de un proyecto. */
export async function registrarPago(input: RegistrarPagoInput): Promise<void> {
  const parsed = registrarPagoSchema.parse(input);
  const supabase = await createClient();
  // registrado_por lo sella el trigger stamp_pago_registrado_por con auth.uid().
  const { error } = await supabase.from("pagos").insert({
    proyecto_id: parsed.proyectoId,
    monto: parsed.monto,
    fecha_pago: parsed.fechaPago,
    metodo: parsed.metodo,
    notas: parsed.notas,
  });
  if (error) throw new Error("No se pudo registrar el pago.");
}

export async function deletePago(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("pagos").delete().eq("id", id);
  if (error) throw new Error("No se pudo eliminar el pago.");
}
