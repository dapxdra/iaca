import type { Database } from "@/types/database";

type ProyectoEstado = Database["public"]["Enums"]["proyecto_estado"];
type TramiteEstado = Database["public"]["Enums"]["tramite_estado"];

/**
 * Etiquetas de estado. Sin color de relleno fuerte (paleta papel+tinta): un
 * punto de color + borde hairline. El color solo refuerza, el texto manda.
 */
const dot = "inline-block h-1.5 w-1.5 shrink-0";

function Badge({ label, tone }: { label: string; tone: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 border border-border px-2 py-0.5 text-small font-medium text-foreground">
      <span className={`${dot} ${tone}`} aria-hidden="true" />
      {label}
    </span>
  );
}

const PROYECTO_LABEL: Record<ProyectoEstado, string> = {
  contacto: "Contacto",
  campo: "Campo",
  calculo: "Cálculo",
  dibujo: "Dibujo",
  entrega: "Entrega",
  cerrado: "Cerrado",
  cancelado: "Cancelado",
};

const PROYECTO_TONE: Record<ProyectoEstado, string> = {
  contacto: "bg-slate",
  campo: "bg-amber-600",
  calculo: "bg-blue-600",
  dibujo: "bg-indigo-600",
  entrega: "bg-primary",
  cerrado: "bg-green-700",
  cancelado: "bg-red-700",
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

const TRAMITE_TONE: Record<TramiteEstado, string> = {
  pendiente: "bg-slate",
  enviado: "bg-blue-600",
  en_revision: "bg-amber-600",
  observado: "bg-red-700",
  aprobado: "bg-green-700",
  rechazado: "bg-red-700",
};

export function EstadoTramiteBadge({ estado }: { estado: TramiteEstado }) {
  return <Badge label={TRAMITE_LABEL[estado]} tone={TRAMITE_TONE[estado]} />;
}

export { PROYECTO_LABEL, TRAMITE_LABEL };
