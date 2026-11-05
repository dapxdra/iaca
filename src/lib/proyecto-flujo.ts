/**
 * Flujos de estados de proyecto, subproyecto y trámite — lógica pura, sin
 * acceso a datos, para que la puedan importar tanto los Server
 * Components/servicios como los Client Components (el `proyectos.service.ts`
 * sí toca Supabase y no se puede importar desde el cliente).
 *
 * Proyecto: Contacto → Cotización/Agenda → Cálculo → Georeferencia → Dibujo →
 * Entrega. Georeferencia es una compuerta: no se pasa a Dibujo mientras haya
 * subproyectos abiertos o trámites en curso (ver `motivoBloqueo`).
 *
 * Subproyecto: Trámite → Carga APT → Minutas → Preparación, más estados de segundo plano
 * (Mantenimiento, Apelación, Visado) que conviven con el principal.
 *
 * En ambos se puede retroceder a cualquier estado anterior (correcciones);
 * desde el último se puede Cerrar; desde cualquier punto se puede Cancelar; lo
 * cancelado se reabre al primer estado. Debe coincidir con 0013_.../0014_...
 */
import type { Database } from "@/types/database";

export type ProyectoEstado = Database["public"]["Enums"]["proyecto_estado"];
export type SubproyectoEstado = Database["public"]["Enums"]["subproyecto_estado"];
export type SubproyectoEstadoSecundario =
  Database["public"]["Enums"]["subproyecto_estado_secundario"];

export const ESTADO_FLOW: ProyectoEstado[] = [
  "contacto",
  "cotizacion_agenda",
  "calculo",
  "georeferencia",
  "dibujo",
  "entrega",
];

export const SUBPROYECTO_FLOW: SubproyectoEstado[] = [
  "tramite",
  "carga_apt",
  "minutas",
  "preparacion",
];

export const SUBPROYECTO_ESTADOS_SECUNDARIOS = [
  "mantenimiento",
  "apelacion",
  "visado",
] as const satisfies readonly SubproyectoEstadoSecundario[];

export const SUBPROYECTO_ESTADO_SECUNDARIO_LABEL: Record<SubproyectoEstadoSecundario, string> = {
  mantenimiento: "Mantenimiento",
  apelacion: "Apelación",
  visado: "Visado",
};

/**
 * Transiciones válidas desde `desde` dentro de `flow`: cualquier estado
 * anterior (corrección), el siguiente, Cerrar desde el último y Cancelar.
 */
function transiciones<E extends string>(
  flow: readonly E[],
  desde: E | "cerrado" | "cancelado"
): (E | "cerrado" | "cancelado")[] {
  if (desde === "cerrado") return [];
  if (desde === "cancelado") return [flow[0]]; // reabrir

  const idx = flow.indexOf(desde);
  const opciones: (E | "cerrado" | "cancelado")[] = flow.slice(0, idx); // corrección
  opciones.push(idx < flow.length - 1 ? flow[idx + 1] : "cerrado"); // avanzar
  opciones.push("cancelado");
  return opciones;
}

/** Transiciones válidas de un proyecto. Se re-valida en el servidor. */
export function transicionesValidas(desde: ProyectoEstado): ProyectoEstado[] {
  return transiciones(ESTADO_FLOW, desde) as ProyectoEstado[];
}

/** Transiciones válidas de un subproyecto. Se re-valida en el servidor. */
export function transicionesSubproyecto(desde: SubproyectoEstado): SubproyectoEstado[] {
  return transiciones(SUBPROYECTO_FLOW, desde) as SubproyectoEstado[];
}

/** Si ir de `desde` a `hacia` es volver atrás en el flujo (una corrección). */
export function esCorreccion(flow: readonly string[], desde: string, hacia: string): boolean {
  const i = flow.indexOf(desde);
  const j = flow.indexOf(hacia);
  return i >= 0 && j >= 0 && j < i;
}

export type TramiteEstado = Database["public"]["Enums"]["tramite_estado"];

/**
 * Estados no finales: bloquean el cierre y generan alertas. Debe coincidir
 * con los triggers y la vista de 0010_... "Público y defectuoso" sigue en
 * curso: el plano se corrige y se vuelve a presentar.
 */
export const TRAMITE_ESTADOS_EN_CURSO = [
  "pendiente",
  "sellado_cfia",
  "calificacion_rn",
  "publico_defectuoso",
] as const satisfies readonly TramiteEstado[];

export type TramiteEstadoEnCurso = (typeof TRAMITE_ESTADOS_EN_CURSO)[number];

export function esTramiteEnCurso(estado: TramiteEstado): estado is TramiteEstadoEnCurso {
  return (TRAMITE_ESTADOS_EN_CURSO as readonly TramiteEstado[]).includes(estado);
}

/**
 * Nombre del campo del formulario para el umbral de un estado. Vive acá y no
 * en notificaciones.service.ts porque lo usa un componente cliente.
 */
export const umbralCampo = (estado: TramiteEstadoEnCurso) => `umbral_${estado}` as const;

/**
 * Estados con duración esperada: al superarla se notifica. Mezcla estados de
 * proyecto (Dibujo), de subproyecto y de segundo plano; Carga APT y Minutas
 * comparten una duración. Debe coincidir con `alertas_estado_umbral` (0014_...).
 */
export const ALERTA_ESTADO_CLAVES = [
  "preparacion",
  "visado",
  "apt_minutas",
  "mantenimiento",
  "dibujo",
] as const;

export type AlertaEstadoClave = (typeof ALERTA_ESTADO_CLAVES)[number];

export const ALERTA_ESTADO_LABEL: Record<AlertaEstadoClave, string> = {
  preparacion: "Preparación",
  visado: "Visado",
  apt_minutas: "Carga APT y Minutas",
  mantenimiento: "Mantenimiento",
  dibujo: "Dibujo (proyecto)",
};

export const duracionCampo = (clave: AlertaEstadoClave) => `duracion_${clave}` as const;

/** Orden en que se ofrecen los estados en los formularios. */
export const TRAMITE_ESTADOS = [
  ...TRAMITE_ESTADOS_EN_CURSO,
  "publico_inscrito",
  "publico_aprobado",
  "publico_cancelado",
] as const satisfies readonly TramiteEstado[];

export type TramiteTipo = Database["public"]["Enums"]["tramite_tipo"];

export const TRAMITE_TIPOS = [
  "plano_catastrado",
  "consultoria",
  "alineamiento",
] as const satisfies readonly TramiteTipo[];

export const TRAMITE_TIPO_LABEL: Record<TramiteTipo, string> = {
  plano_catastrado: "Plano catastrado",
  consultoria: "Consultoría",
  alineamiento: "Alineamiento",
};

/** Un subproyecto cancelado no bloquea: ya no tiene trabajo pendiente. */
export const SUBPROYECTO_ESTADOS_TERMINADOS: SubproyectoEstado[] = ["cerrado", "cancelado"];

/**
 * Por qué no se puede cerrar un proyecto o subproyecto (o sacar un proyecto
 * de Georeferencia hacia Dibujo), o `null` si se puede. Lo usa la UI para
 * deshabilitar la opción y el servicio para rechazarla. Para un subproyecto,
 * `subproyectosAbiertos` siempre es 0.
 */
export function motivoBloqueo({
  accion = "cerrar",
  tramitesEnCurso,
  subproyectosAbiertos = 0,
}: {
  accion?: "cerrar" | "pasar a Dibujo";
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
  return motivos.length > 0 ? `No se puede ${accion}: hay ${motivos.join(" y ")}.` : null;
}
