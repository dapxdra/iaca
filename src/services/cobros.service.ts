/**
 * Servicio de Cobros — registro interno de montos a cobrar y pagos por
 * proyecto (ver supabase/migrations/0002_cobros.sql y
 * docs/REQUIREMENTS.md sección 4.10). No genera comprobantes fiscales.
 *
 * La autorización real la aplican las políticas RLS: lectura para cualquier
 * usuario autenticado, escritura (registrar pagos) solo admin/oficina.
 */
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type MetodoPago = "efectivo" | "sinpe_movil" | "transferencia" | "cheque" | "otro";

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

const COBRO_PROYECTO_COLUMNS =
  "proyecto_id, codigo, nombre, cliente_id, monto_cobrar, total_pagado, saldo_pendiente, fecha_ultimo_pago";

/** Lista el estado de cobro de todos los proyectos, del saldo más alto al más bajo. */
export async function listCobrosProyectos(): Promise<CobroProyecto[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("vw_cobros_proyecto")
    .select(COBRO_PROYECTO_COLUMNS)
    .order("saldo_pendiente", { ascending: false, nullsFirst: false });

  if (error) {
    throw new Error("No se pudo cargar el estado de cobro de los proyectos.");
  }

  return data ?? [];
}

export const registrarPagoSchema = z.object({
  proyectoId: z.string().uuid(),
  monto: z.number().positive(),
  fechaPago: z.string().date(),
  metodo: z.enum(["efectivo", "sinpe_movil", "transferencia", "cheque", "otro"]),
  notas: z.string().trim().max(500).optional(),
});

export type RegistrarPagoInput = z.infer<typeof registrarPagoSchema>;

/** Registra un pago/abono contra el monto a cobrar de un proyecto. */
export async function registrarPago(input: RegistrarPagoInput): Promise<void> {
  const parsed = registrarPagoSchema.parse(input);
  const supabase = await createClient();

  const { error } = await supabase.from("pagos").insert({
    proyecto_id: parsed.proyectoId,
    monto: parsed.monto,
    fecha_pago: parsed.fechaPago,
    metodo: parsed.metodo,
    notas: parsed.notas,
  });

  if (error) {
    throw new Error("No se pudo registrar el pago.");
  }
}
