/**
 * Flujo de estados de un proyecto — lógica pura, sin acceso a datos, para que
 * la puedan importar tanto los Server Components/servicios como los Client
 * Components (el `proyectos.service.ts` sí toca Supabase y no se puede
 * importar desde el cliente).
 *
 * Flujo: Contacto → Campo → Cálculo → Dibujo → Entrega. Desde Entrega se
 * puede Cerrar; desde cualquier punto se puede Cancelar; un proyecto
 * cancelado se puede reabrir a Contacto.
 */
import type { Database } from "@/types/database";

export type ProyectoEstado = Database["public"]["Enums"]["proyecto_estado"];

export const ESTADO_FLOW: ProyectoEstado[] = [
  "contacto",
  "campo",
  "calculo",
  "dibujo",
  "entrega",
];

/** Transiciones válidas desde `desde`. Se re-valida en el servidor. */
export function transicionesValidas(desde: ProyectoEstado): ProyectoEstado[] {
  if (desde === "cerrado") return [];
  if (desde === "cancelado") return ["contacto"]; // reabrir

  const idx = ESTADO_FLOW.indexOf(desde);
  const opciones: ProyectoEstado[] = [];
  if (idx > 0) opciones.push(ESTADO_FLOW[idx - 1]); // retroceder un paso
  if (idx < ESTADO_FLOW.length - 1) opciones.push(ESTADO_FLOW[idx + 1]); // avanzar
  if (desde === "entrega") opciones.push("cerrado");
  opciones.push("cancelado");
  return opciones;
}
