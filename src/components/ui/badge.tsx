import type { Database } from "@/types/database";

type ProyectoEstado = Database["public"]["Enums"]["proyecto_estado"];
type TramiteEstado = Database["public"]["Enums"]["tramite_estado"];

/**
 * Etiquetas de estado: píldora con relleno tenue del color del estado + punto
 * sólido + texto. El color refuerza; el texto manda. Contraste del texto
 * siempre sobre el `foreground` (no sobre el tinte), así siempre cumple AA.
 */
function Badge({ label, tone }: { label: string; tone: { dot: string; fill: string } }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[0.8125rem] font-medium text-foreground ${tone.fill}`}
    >
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${tone.dot}`} aria-hidden="true" />
      {label}
    </span>
  );
}

type Tone = { dot: string; fill: string };
const T = (dot: string, fill: string): Tone => ({ dot, fill });

const PROYECTO_LABEL: Record<ProyectoEstado, string> = {
  contacto: "Contacto",
  campo: "Campo",
  calculo: "Cálculo",
  dibujo: "Dibujo",
  entrega: "Entrega",
  cerrado: "Cerrado",
  cancelado: "Cancelado",
};

const PROYECTO_TONE: Record<ProyectoEstado, Tone> = {
  contacto: T("bg-slate", "border-slate/25 bg-slate/8"),
  campo: T("bg-amber-500", "border-amber-500/30 bg-amber-500/10"),
  calculo: T("bg-blue-500", "border-blue-500/30 bg-blue-500/10"),
  dibujo: T("bg-indigo-500", "border-indigo-500/30 bg-indigo-500/10"),
  entrega: T("bg-accent", "border-accent/30 bg-accent/10"),
  cerrado: T("bg-green-600", "border-green-600/30 bg-green-600/10"),
  cancelado: T("bg-red-600", "border-red-600/30 bg-red-600/10"),
};

export function EstadoProyectoBadge({ estado }: { estado: ProyectoEstado }) {
  return <Badge label={PROYECTO_LABEL[estado]} tone={PROYECTO_TONE[estado]} />;
}

const TRAMITE_LABEL: Record<TramiteEstado, string> = {
  pendiente: "Pendiente",
  enviado: "Enviado",
  en_revision: "En revisión",
  observado: "Observado",
  aprobado: "Aprobado",
  rechazado: "Rechazado",
};

const TRAMITE_TONE: Record<TramiteEstado, Tone> = {
  pendiente: T("bg-slate", "border-slate/25 bg-slate/8"),
  enviado: T("bg-blue-500", "border-blue-500/30 bg-blue-500/10"),
  en_revision: T("bg-amber-500", "border-amber-500/30 bg-amber-500/10"),
  observado: T("bg-red-600", "border-red-600/30 bg-red-600/10"),
  aprobado: T("bg-green-600", "border-green-600/30 bg-green-600/10"),
  rechazado: T("bg-red-600", "border-red-600/30 bg-red-600/10"),
};

export function EstadoTramiteBadge({ estado }: { estado: TramiteEstado }) {
  return <Badge label={TRAMITE_LABEL[estado]} tone={TRAMITE_TONE[estado]} />;
}

export { PROYECTO_LABEL, TRAMITE_LABEL };
