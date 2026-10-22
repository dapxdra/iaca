"use client";

import { useMemo, useState } from "react";
import { RotateCcw } from "lucide-react";
import { cotizadorContent } from "@/config/site";
import { formatColones } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { Section } from "@/components/ui/section";
import {
  PARAMETROS_VIGENTES,
  SERVICIOS,
  calcularGastos,
  sumar,
  valoresPorDefecto,
  type Campo,
  type Linea,
  type Valores,
} from "@/lib/tarifas-cit";

const GRUPOS = [...new Set(SERVICIOS.map((s) => s.grupo))];

const GASTOS_VACIOS = { distanciaKm: "", horasTraslado: "", tarifaKmCGR: "", otros: "" };

const toNum = (s: string) => {
  const n = Number(s);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

function CampoInput({
  campo,
  value,
  onChange,
}: {
  campo: Campo;
  value: string | boolean;
  onChange: (v: string | boolean) => void;
}) {
  const id = `cot-${campo.id}`;
  if (campo.tipo === "check") {
    return (
      <label className="flex cursor-pointer items-start gap-2 text-small text-foreground sm:col-span-2">
        <input
          type="checkbox"
          id={id}
          data-cy={id}
          checked={value === true}
          onChange={(e) => onChange(e.target.checked)}
          className="mt-0.5 h-4 w-4 cursor-pointer accent-[var(--accent)]"
        />
        {campo.label}
      </label>
    );
  }
  if (campo.tipo === "opcion") {
    return (
      <Field label={campo.label} htmlFor={id}>
        <Select id={id} data-cy={id} value={String(value)} onChange={(e) => onChange(e.target.value)}>
          {campo.opciones.map((o) => (
            <option key={o.valor} value={o.valor}>
              {o.label}
            </option>
          ))}
        </Select>
      </Field>
    );
  }
  return (
    <Field
      label={campo.unidad ? `${campo.label} (${campo.unidad})` : campo.label}
      htmlFor={id}
      hint={campo.ayuda}
    >
      <Input
        id={id}
        data-cy={id}
        type="number"
        inputMode="decimal"
        min={campo.min ?? 0}
        max={campo.max}
        step={campo.step ?? "any"}
        value={String(value)}
        onChange={(e) => onChange(e.target.value)}
        aria-describedby={campo.ayuda ? `${id}-hint` : undefined}
        className="tabular-nums"
      />
    </Field>
  );
}

function Desglose({ titulo, lineas, dataCy }: { titulo: string; lineas: Linea[]; dataCy: string }) {
  if (lineas.length === 0) return null;
  return (
    <div data-cy={dataCy} className="flex flex-col gap-2">
      <h3 className="text-small font-semibold uppercase tracking-wide text-muted-foreground">{titulo}</h3>
      <ul className="flex flex-col divide-y divide-border">
        {lineas.map((l, idx) => (
          <li key={idx} className="flex items-start justify-between gap-4 py-2">
            <span className="min-w-0">
              <span className="block text-small font-medium text-foreground">{l.concepto}</span>
              <span className="block text-small text-muted-foreground tabular-nums">{l.detalle}</span>
            </span>
            <span
              className={`whitespace-nowrap text-small font-semibold tabular-nums ${
                l.monto < 0 ? "text-success" : "text-foreground"
              }`}
            >
              {formatColones(l.monto)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Cotizador con las tarifas mínimas del CIT. Todo el cálculo vive en
 * `lib/tarifas-cit.ts`; acá solo se guardan los valores que escribe el usuario.
 */
export function Cotizador() {
  const [servicioId, setServicioId] = useState(SERVICIOS[0].id);
  // Un juego de valores por servicio: cambiar de servicio y volver no borra lo escrito.
  const [valores, setValores] = useState<Record<string, Valores>>({});
  const [gastos, setGastos] = useState(GASTOS_VACIOS);
  const [params, setParams] = useState({
    i: String(PARAMETROS_VIGENTES.i),
    iAvaluos: String(PARAMETROS_VIGENTES.iAvaluos),
    horaProfesional: String(PARAMETROS_VIGENTES.horaProfesional),
  });

  const servicio = SERVICIOS.find((s) => s.id === servicioId) ?? SERVICIOS[0];
  const v = valores[servicio.id] ?? valoresPorDefecto(servicio);

  const resultado = useMemo(() => {
    const p = {
      i: toNum(params.i),
      iAvaluos: toNum(params.iAvaluos),
      horaProfesional: toNum(params.horaProfesional),
    };
    const honorarios = servicio.calcular(v, p).filter((l) => Number.isFinite(l.monto));
    const reembolsables = calcularGastos(
      servicio.traslado,
      {
        distanciaKm: toNum(gastos.distanciaKm),
        horasTraslado: toNum(gastos.horasTraslado),
        tarifaKmCGR: toNum(gastos.tarifaKmCGR),
        otros: toNum(gastos.otros),
      },
      p
    );
    return {
      honorarios,
      reembolsables,
      totalHonorarios: sumar(honorarios),
      totalGastos: sumar(reembolsables),
    };
  }, [servicio, v, gastos, params]);

  function setValor(id: string, value: string | boolean) {
    setValores((prev) => ({ ...prev, [servicio.id]: { ...v, [id]: value } }));
  }

  function reiniciar() {
    setValores((prev) => ({ ...prev, [servicio.id]: valoresPorDefecto(servicio) }));
    setGastos(GASTOS_VACIOS);
  }

  const esAvaluo = servicio.traslado === "avaluo";

  return (
    <Section
      title={cotizadorContent.title}
      dataCy="cotizador"
      action={
        <Button variant="ghost" size="sm" onClick={reiniciar} data-cy="cotizador-reiniciar">
          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" /> Reiniciar
        </Button>
      }
    >
      <div id="cotizador" className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)]">
        <div className="flex flex-col gap-5">
          <p className="text-small text-muted-foreground">{cotizadorContent.description}</p>

          <Field label="Servicio" htmlFor="cot-servicio">
            <Select
              id="cot-servicio"
              data-cy="cotizador-servicio"
              value={servicio.id}
              onChange={(e) => setServicioId(e.target.value)}
            >
              {GRUPOS.map((g) => (
                <optgroup key={g} label={g}>
                  {SERVICIOS.filter((s) => s.grupo === g).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.articulo} — {s.nombre}
                    </option>
                  ))}
                </optgroup>
              ))}
            </Select>
          </Field>

          {servicio.nota && (
            <p className="rounded-md border border-border bg-surface-sunken px-3 py-2 text-small text-muted-foreground">
              {servicio.nota}
            </p>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            {servicio.campos.map((c) => (
              <CampoInput key={c.id} campo={c} value={v[c.id]} onChange={(val) => setValor(c.id, val)} />
            ))}
          </div>

          <fieldset className="flex flex-col gap-4 border-t border-border pt-4">
            <legend className="pt-4 text-small font-semibold text-foreground">
              Gastos reembolsables {esAvaluo ? "(art. 2, Decreto 35298)" : "(art. 4, Decreto 17481)"}
            </legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Distancia desde la oficina (km, solo ida)"
                htmlFor="cot-distancia"
                hint={esAvaluo ? "Se reconoce el exceso sobre 10 km recorridos" : "Transporte solo a más de 25 km"}
              >
                <Input
                  id="cot-distancia"
                  data-cy="cotizador-distancia"
                  type="number"
                  min={0}
                  step="any"
                  inputMode="decimal"
                  value={gastos.distanciaKm}
                  onChange={(e) => setGastos({ ...gastos, distanciaKm: e.target.value })}
                  aria-describedby="cot-distancia-hint"
                  className="tabular-nums"
                />
              </Field>
              <Field
                label="Tiempo de traslado (h, ida y vuelta)"
                htmlFor="cot-horas"
                hint={esAvaluo ? "Se cobra el exceso sobre la primera hora" : "Se cobra si supera una hora"}
              >
                <Input
                  id="cot-horas"
                  data-cy="cotizador-horas-traslado"
                  type="number"
                  min={0}
                  step="any"
                  inputMode="decimal"
                  value={gastos.horasTraslado}
                  onChange={(e) => setGastos({ ...gastos, horasTraslado: e.target.value })}
                  aria-describedby="cot-horas-hint"
                  className="tabular-nums"
                />
              </Field>
              {esAvaluo && (
                <Field label="Kilometraje tabla CGR (₡/km)" htmlFor="cot-km-cgr">
                  <Input
                    id="cot-km-cgr"
                    data-cy="cotizador-km-cgr"
                    type="number"
                    min={0}
                    step="any"
                    inputMode="decimal"
                    value={gastos.tarifaKmCGR}
                    onChange={(e) => setGastos({ ...gastos, tarifaKmCGR: e.target.value })}
                    className="tabular-nums"
                  />
                </Field>
              )}
              <Field
                label="Otros gastos (₡)"
                htmlFor="cot-otros"
                hint="Alimentación, hospedaje, derechos de inscripción, timbres, copias"
              >
                <Input
                  id="cot-otros"
                  data-cy="cotizador-otros"
                  type="number"
                  min={0}
                  step="any"
                  inputMode="decimal"
                  value={gastos.otros}
                  onChange={(e) => setGastos({ ...gastos, otros: e.target.value })}
                  aria-describedby="cot-otros-hint"
                  className="tabular-nums"
                />
              </Field>
            </div>
          </fieldset>

          <details className="group rounded-md border border-border px-3 py-2" data-cy="cotizador-parametros">
            <summary className="cursor-pointer text-small font-medium text-foreground">
              Parámetros de ajuste
            </summary>
            <div className="mt-3 grid gap-4 sm:grid-cols-3">
              {(
                [
                  ["i", "Índice i (agrimensura y topografía)"],
                  ["iAvaluos", "Factor i (avalúos)"],
                  ["horaProfesional", "Hora profesional (₡)"],
                ] as const
              ).map(([key, label]) => (
                <Field key={key} label={label} htmlFor={`cot-param-${key}`} hint={PARAMETROS_VIGENTES.fuente[key]}>
                  <Input
                    id={`cot-param-${key}`}
                    data-cy={`cotizador-param-${key}`}
                    type="number"
                    min={0}
                    step="any"
                    inputMode="decimal"
                    value={params[key]}
                    onChange={(e) => setParams({ ...params, [key]: e.target.value })}
                    aria-describedby={`cot-param-${key}-hint`}
                    className="tabular-nums"
                  />
                </Field>
              ))}
            </div>
          </details>
        </div>

        <aside
          data-cy="cotizador-resultado"
          aria-live="polite"
          className="flex h-fit flex-col gap-5 rounded-lg border border-border bg-surface-sunken p-4 lg:sticky lg:top-6"
        >
          <Desglose titulo="Honorarios" lineas={resultado.honorarios} dataCy="cotizador-honorarios" />
          {resultado.honorarios.length === 0 && (
            <p className="text-small text-muted-foreground">Seleccioná al menos un rubro para cotizar.</p>
          )}
          <Desglose titulo="Gastos reembolsables" lineas={resultado.reembolsables} dataCy="cotizador-gastos" />

          <dl className="flex flex-col gap-1.5 border-t border-border-strong pt-4 text-small">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Honorarios</dt>
              <dd className="font-medium tabular-nums text-foreground">{formatColones(resultado.totalHonorarios)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Gastos</dt>
              <dd className="font-medium tabular-nums text-foreground">{formatColones(resultado.totalGastos)}</dd>
            </div>
            <div className="mt-1 flex items-baseline justify-between gap-4">
              <dt className="font-semibold text-foreground">Total estimado</dt>
              <dd data-cy="cotizador-total" className="font-heading text-[1.5rem] leading-none tabular-nums text-foreground">
                {formatColones(resultado.totalHonorarios + resultado.totalGastos)}
              </dd>
            </div>
          </dl>
          <p className="text-small text-muted-foreground">{cotizadorContent.disclaimer}</p>
        </aside>
      </div>
    </Section>
  );
}
