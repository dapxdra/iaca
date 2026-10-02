/**
 * Schema de una entrada de bitácora — puro (sin acceso a datos) para que lo
 * use también el navegador: sin señal no hay servidor que valide, y una
 * entrada inválida guardada en la cola quedaría trabada hasta que alguien la
 * descarte. El servidor la vuelve a validar igual al sincronizar.
 */
import { z } from "zod";
import { emptyToUndefined } from "@/lib/form";

const optionalText = z.preprocess(emptyToUndefined, z.string().trim().max(200).optional());
const optionalTime = z.preprocess(
  emptyToUndefined,
  z
    .string()
    .regex(/^\d{2}:\d{2}$/, "Formato HH:MM")
    .optional()
);

export const bitacoraSchema = z
  .object({
    proyecto_id: z.string().uuid("Seleccioná un proyecto"),
    subproyecto_id: z.preprocess(emptyToUndefined, z.string().uuid().optional()),
    fecha: z.string().date("Fecha inválida"),
    hora_inicio: optionalTime,
    hora_fin: optionalTime,
    actividad: z.string().trim().min(3, "Requerido").max(1000),
    equipo_utilizado: optionalText,
    clima: optionalText,
    observaciones: z.preprocess(emptyToUndefined, z.string().trim().max(2000).optional()),
  })
  .refine(
    (v) => !v.hora_inicio || !v.hora_fin || v.hora_fin > v.hora_inicio,
    { message: "La hora de fin debe ser posterior al inicio.", path: ["hora_fin"] }
  );

export type BitacoraInput = z.infer<typeof bitacoraSchema>;
