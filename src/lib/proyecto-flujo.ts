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

export type TramiteEstado = Database["public"]["Enums"]["tramite_estado"];

/** Estados no finales. Debe coincidir con los triggers de 0008_... */
export const TRAMITE_ESTADOS_EN_CURSO: TramiteEstado[] = [
  "pendiente",
  "enviado",
  "en_revision",
  "observado",
];

/** Un subproyecto cancelado no bloquea: ya no tiene trabajo pendiente. */
export const SUBPROYECTO_ESTADOS_TERMINADOS: ProyectoEstado[] = ["cerrado", "cancelado"];

/**
 * Por qué no se puede cerrar un proyecto o subproyecto, o `null` si se puede.
 * Lo usa la UI para deshabilitar la opción y el servicio para rechazarla.
 * Para un subproyecto, `subproyectosAbiertos` siempre es 0.
 */
export function motivoBloqueoCierre({
  tramitesEnCurso,
  subproyectosAbiertos = 0,
}: {
  tramitesEnCurso: number;
  subproyectosAbiertos?: number;
}): string | null {
  const motivos: string[] = [];
  if (tramitesEnCurso > 0) {
    motivos.push(
      tramitesEnCurso === 1 ? "1 trámite en curso" : `${tramitesEnCurso} trámites en curso`
    );
  }
  if (subproyectosAbiertos > 0) {
    motivos.push(
      subproyectosAbiertos === 1
        ? "1 subproyecto sin cerrar"
        : `${subproyectosAbiertos} subproyectos sin cerrar`
    );
  }
  return motivos.length > 0 ? `No se puede cerrar: hay ${motivos.join(" y ")}.` : null;
}
