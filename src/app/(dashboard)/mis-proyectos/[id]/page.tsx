import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Check } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { getProyecto } from "@/services/proyectos.service";
import { ESTADO_FLOW } from "@/lib/proyecto-flujo";
import { Section, DataItem } from "@/components/ui/section";
import { EstadoProyectoBadge, PROYECTO_LABEL } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

/**
 * Ficha de proyecto para el rol `cliente` — puramente informativa: estado y
 * fechas, nada de cobros, bitácora ni trámites internos (eso es operativo,
 * no le corresponde al cliente verlo). RLS (0005_...) ya garantiza que
 * `getProyecto` solo devuelve la fila si es uno de sus proyectos.
 */
export default async function MiProyectoDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [{ id }] = await Promise.all([params, requireRole(["cliente"])]);
  const proyecto = await getProyecto(id);
  if (!proyecto) notFound();

  const estadoIdx = ESTADO_FLOW.indexOf(proyecto.estado);
  const cancelado = proyecto.estado === "cancelado";
  const cerrado = proyecto.estado === "cerrado";

  return (
    <div data-cy="page-mi-proyecto-detalle" className="flex animate-fade-in flex-col gap-6">
      <div>
        <Link
          href="/mis-proyectos"
          className="inline-flex items-center gap-1.5 text-small text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Mis proyectos
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="font-heading text-h3 font-semibold tabular-nums text-foreground">
            {proyecto.codigo}
          </h1>
          <EstadoProyectoBadge estado={proyecto.estado} />
        </div>
        <p className="mt-1 text-body text-muted-foreground">{proyecto.nombre}</p>
      </div>

      <Section title="Avance del proyecto" dataCy="mi-proyecto-flujo">
        <ol className="flex flex-wrap items-center gap-x-1 gap-y-3">
          {ESTADO_FLOW.map((e, i) => {
            const done = !cancelado && (cerrado || i < estadoIdx);
            const current = !cancelado && !cerrado && i === estadoIdx;
            return (
              <li key={e} className="flex items-center">
                <div className="flex items-center gap-2">
                  <span
                    className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border text-[0.75rem] font-semibold transition-colors ${
                      done
                        ? "border-accent bg-accent text-accent-foreground"
                        : current
                          ? "border-accent bg-accent/10 text-accent"
                          : "border-border bg-surface-sunken text-muted-foreground"
                    }`}
                  >
                    {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
                  </span>
                  <span
                    className={`text-small font-medium ${
                      done || current ? "text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {PROYECTO_LABEL[e]}
                  </span>
                </div>
                {i < ESTADO_FLOW.length - 1 && (
                  <span
                    className={`mx-2 h-px w-6 ${done ? "bg-accent" : "bg-border"}`}
                    aria-hidden="true"
                  />
                )}
              </li>
            );
          })}
        </ol>
        {cancelado && (
          <p className="mt-4 rounded-md border border-red-600/30 bg-red-600/8 px-3 py-2 text-small font-medium text-red-700">
            Este proyecto fue cancelado.
          </p>
        )}
      </Section>

      <Section title="Información" dataCy="mi-proyecto-info">
        <dl className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <DataItem label="Tipo de servicio">{proyecto.tipo_servicio ?? "—"}</DataItem>
          <DataItem label="Responsable de IACA">
            {proyecto.responsable?.full_name ?? "Sin asignar"}
          </DataItem>
          <DataItem label="Ubicación">
            {[proyecto.provincia, proyecto.canton, proyecto.distrito]
              .filter(Boolean)
              .join(", ") || "—"}
          </DataItem>
          <DataItem label="Inicio">{formatDate(proyecto.fecha_inicio)}</DataItem>
          <DataItem label="Entrega estimada">
            {formatDate(proyecto.fecha_estimada_entrega)}
          </DataItem>
          <DataItem label="Entrega real">{formatDate(proyecto.fecha_entrega_real)}</DataItem>
        </dl>
        {proyecto.descripcion && (
          <p className="mt-5 border-t border-border pt-4 text-body text-muted-foreground">
            {proyecto.descripcion}
          </p>
        )}
      </Section>
    </div>
  );
}
