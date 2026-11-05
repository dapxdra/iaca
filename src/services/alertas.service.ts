import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { escapeHtml, isEmailConfigured, sendEmails, type Email } from "@/lib/email";
import { alertasContent, dashboardNav, siteConfig } from "@/config/site";
import { PROYECTO_LABEL, SUBPROYECTO_LABEL, TRAMITE_LABEL } from "@/components/ui/badge";
import { ALERTAS_CONFIG_DEFAULT } from "@/services/notificaciones.service";
import {
  SUBPROYECTO_ESTADO_SECUNDARIO_LABEL,
  TRAMITE_TIPO_LABEL,
  type SubproyectoEstado,
  type SubproyectoEstadoSecundario,
} from "@/lib/proyecto-flujo";
import type { Database } from "@/types/database";

/**
 * Revisión diaria de proyectos y trámites sin movimiento, y de subproyectos
 * que superan la duración esperada de su estado. La dispara Vercel
 * Cron (/api/cron/alertas) o un admin con "Revisar ahora".
 *
 * Corre con service role porque no hay un usuario detrás: tiene que leer
 * todos los proyectos y escribir en la bandeja de cada persona, y
 * `notificaciones` no tiene política de insert para nadie.
 *
 * Reglas de negocio:
 *  - Destinatarios: todos los admin, más el responsable (del trámite, o si no
 *    tiene, del proyecto) cuando es admin/oficina. Un responsable de campo no
 *    recibe: no puede cambiar estados ni entrar a la pantalla de proyectos.
 *  - Umbral: cada proyecto, trámite y estado de subproyecto contra el suyo
 *    (`supera_umbral` en las vistas; ver 0010_... y 0014_...).
 *  - No se repite el aviso de lo mismo a la misma persona hasta que pasen
 *    `recordatorio_dias`. Correr el job dos veces el mismo día no duplica.
 *  - El correo es un resumen por persona con lo nuevo de esta corrida.
 */

type NotificacionInsert = Database["public"]["Tables"]["notificaciones"]["Insert"];

export type ResultadoRevision = {
  proyectos: number;
  tramites: number;
  subproyectos: number;
  notificaciones: number;
  correos: number;
};

const DIA_MS = 24 * 60 * 60 * 1000;

export async function ejecutarRevisionAlertas(): Promise<ResultadoRevision> {
  const admin = createAdminClient();

  const { data: configRow, error: configErr } = await admin
    .from("alertas_config")
    .select("recordatorio_dias, correo_activo")
    .maybeSingle();
  if (configErr) throw new Error(`alertas_config: ${configErr.message}`);
  const config = configRow ?? ALERTAS_CONFIG_DEFAULT;

  const [proyectosRes, tramitesRes, subproyectosRes, staffRes] = await Promise.all([
    admin
      .from("vw_proyectos_sin_movimiento")
      .select("id, codigo, nombre, estado, responsable_id, dias_sin_movimiento")
      // El general (alertas_config) o el del estado si tiene uno (Dibujo, 0014_...).
      .eq("supera_umbral", true),
    admin
      .from("vw_tramites_sin_revision")
      .select(
        "id, proyecto_id, entidad, tipo_tramite, estado, responsable_id, proyecto_responsable_id, proyecto_codigo, dias_sin_revision"
      )
      // Cada trámite contra el umbral de su estado (alertas_tramite_umbral, 0010_...).
      .eq("supera_umbral", true),
    admin
      .from("vw_subproyectos_demorados")
      .select(
        "id, proyecto_id, nombre, estado, proyecto_codigo, proyecto_responsable_id, dias_en_estado, umbral_dias"
      )
      .eq("supera_umbral", true),
    admin
      .from("profiles")
      .select("id, full_name, role")
      .eq("active", true)
      .in("role", ["admin", "oficina"]),
  ]);
  if (proyectosRes.error) throw new Error(`proyectos: ${proyectosRes.error.message}`);
  if (tramitesRes.error) throw new Error(`tramites: ${tramitesRes.error.message}`);
  if (subproyectosRes.error) throw new Error(`subproyectos: ${subproyectosRes.error.message}`);
  if (staffRes.error) throw new Error(`profiles: ${staffRes.error.message}`);

  const proyectos = proyectosRes.data ?? [];
  const tramites = tramitesRes.data ?? [];
  const subproyectos = subproyectosRes.data ?? [];
  const staff = new Map((staffRes.data ?? []).map((p) => [p.id, p]));
  const admins = [...staff.values()].filter((p) => p.role === "admin").map((p) => p.id);

  const resultado: ResultadoRevision = {
    proyectos: proyectos.length,
    tramites: tramites.length,
    subproyectos: subproyectos.length,
    notificaciones: 0,
    correos: 0,
  };
  if (proyectos.length + tramites.length + subproyectos.length === 0) return resultado;

  const destinatarios = (responsableId: string | null) => {
    const ids = new Set(admins);
    if (responsableId && staff.has(responsableId)) ids.add(responsableId);
    return ids;
  };

  // Avisos recientes, para no repetirlos antes de `recordatorio_dias`.
  const desde = new Date(Date.now() - config.recordatorio_dias * DIA_MS).toISOString();
  const { data: recientes, error: recientesErr } = await admin
    .from("notificaciones")
    .select("usuario_id, proyecto_id, tramite_id, subproyecto_id, subproyecto_estado")
    .gte("created_at", desde);
  if (recientesErr) throw new Error(`notificaciones: ${recientesErr.message}`);
  // Un subproyecto se avisa por estado: puede demorarse en varios a la vez.
  const claveDe = (n: {
    proyecto_id: string;
    tramite_id?: string | null;
    subproyecto_id?: string | null;
    subproyecto_estado?: string | null;
  }) =>
    n.tramite_id ??
    (n.subproyecto_id ? `${n.subproyecto_id}/${n.subproyecto_estado}` : n.proyecto_id);
  const yaAvisado = new Set((recientes ?? []).map((n) => `${claveDe(n)}:${n.usuario_id}`));

  const nuevas: NotificacionInsert[] = [];
  const agregar = (responsableId: string | null, base: Omit<NotificacionInsert, "usuario_id">) => {
    for (const usuarioId of destinatarios(responsableId)) {
      if (yaAvisado.has(`${claveDe(base)}:${usuarioId}`)) continue;
      nuevas.push({ ...base, usuario_id: usuarioId });
    }
  };

  for (const p of proyectos) {
    if (!p.id || !p.codigo || !p.nombre || !p.estado || p.dias_sin_movimiento === null) continue;
    const estado = PROYECTO_LABEL[p.estado];
    agregar(p.responsable_id, {
      tipo: "proyecto_sin_movimiento",
      proyecto_id: p.id,
      titulo: alertasContent.proyectoTitulo(p.codigo, p.dias_sin_movimiento),
      mensaje: alertasContent.proyectoMensaje(p.nombre, estado, p.dias_sin_movimiento),
      enlace: `/proyectos/${p.id}`,
      dias: p.dias_sin_movimiento,
    });
  }

  for (const t of tramites) {
    if (!t.id || !t.proyecto_id || !t.estado || t.dias_sin_revision === null) continue;
    agregar(t.responsable_id ?? t.proyecto_responsable_id, {
      tipo: "tramite_sin_movimiento",
      proyecto_id: t.proyecto_id,
      tramite_id: t.id,
      titulo: alertasContent.tramiteTitulo(
        t.entidad ?? "",
        t.tipo_tramite ? TRAMITE_TIPO_LABEL[t.tipo_tramite] : "",
        t.dias_sin_revision
      ),
      mensaje: alertasContent.tramiteMensaje(
        t.proyecto_codigo ?? "",
        TRAMITE_LABEL[t.estado],
        t.dias_sin_revision
      ),
      // No hay ficha de trámite: la del proyecto lista sus trámites.
      enlace: `/proyectos/${t.proyecto_id}`,
      dias: t.dias_sin_revision,
    });
  }

  for (const s of subproyectos) {
    if (!s.id || !s.proyecto_id || !s.nombre || !s.estado) continue;
    if (s.dias_en_estado === null || s.umbral_dias === null) continue;
    const estado =
      SUBPROYECTO_LABEL[s.estado as SubproyectoEstado] ??
      SUBPROYECTO_ESTADO_SECUNDARIO_LABEL[s.estado as SubproyectoEstadoSecundario] ??
      s.estado;
    agregar(s.proyecto_responsable_id, {
      tipo: "subproyecto_demorado",
      proyecto_id: s.proyecto_id,
      subproyecto_id: s.id,
      subproyecto_estado: s.estado,
      titulo: alertasContent.subproyectoTitulo(
        s.proyecto_codigo ?? "",
        s.nombre,
        estado,
        s.dias_en_estado
      ),
      mensaje: alertasContent.subproyectoMensaje(s.nombre, estado, s.dias_en_estado, s.umbral_dias),
      enlace: `/proyectos/${s.proyecto_id}`,
      dias: s.dias_en_estado,
    });
  }

  if (nuevas.length === 0) return resultado;

  const { data: insertadas, error: insertErr } = await admin
    .from("notificaciones")
    .insert(nuevas)
    .select("id, usuario_id, titulo, mensaje, enlace");
  if (insertErr) throw new Error(`insert notificaciones: ${insertErr.message}`);
  resultado.notificaciones = insertadas.length;

  if (!config.correo_activo || !isEmailConfigured()) return resultado;

  // Las direcciones viven en auth.users, no en profiles. Un equipo de este
  // tamaño cabe de sobra en una página.
  const { data: usersPage, error: usersErr } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (usersErr) throw new Error(`auth.users: ${usersErr.message}`);
  const emailPorId = new Map(usersPage.users.map((u) => [u.id, u.email]));

  const porUsuario = new Map<string, typeof insertadas>();
  for (const n of insertadas) {
    porUsuario.set(n.usuario_id, [...(porUsuario.get(n.usuario_id) ?? []), n]);
  }
  const correos: Email[] = [];
  const idsConCorreo: string[] = [];
  for (const [usuarioId, items] of porUsuario) {
    const to = emailPorId.get(usuarioId);
    const nombre = staff.get(usuarioId)?.full_name;
    if (!to || !nombre) continue;
    correos.push(construirResumen(to, nombre, items));
    idsConCorreo.push(...items.map((n) => n.id));
  }

  resultado.correos = await sendEmails(correos);
  if (idsConCorreo.length > 0) {
    // Si esto falla, los correos ya salieron: solo queda sin sellar la fecha.
    await admin
      .from("notificaciones")
      .update({ correo_enviado_at: new Date().toISOString() })
      .in("id", idsConCorreo);
  }
  return resultado;
}

type ItemResumen = { titulo: string; mensaje: string; enlace: string };

function construirResumen(to: string, nombre: string, items: ItemResumen[]): Email {
  const base = siteConfig.url;
  const bandeja = `${base}${dashboardNav.find((n) => n.key === "notificaciones")?.href ?? ""}`;
  const c = alertasContent;

  const filas = items
    .map(
      (n) => `
        <tr><td style="padding:14px 0;border-bottom:1px solid #e4e3c8;">
          <p style="margin:0 0 4px;font-weight:600;color:#1a1825;">${escapeHtml(n.titulo)}</p>
          <p style="margin:0 0 6px;color:#575d83;">${escapeHtml(n.mensaje)}</p>
          <a href="${escapeHtml(base + n.enlace)}" style="color:#262f66;font-weight:600;">${c.emailVerLabel}</a>
        </td></tr>`
    )
    .join("");

  const html = `<!doctype html>
<html lang="es"><body style="margin:0;padding:24px;background:#fefeda;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#1a1825;">
  <table role="presentation" width="100%" style="max-width:600px;margin:0 auto;">
    <tr><td style="padding-bottom:16px;font-size:22px;font-weight:700;color:#262f66;">${escapeHtml(siteConfig.name)}</td></tr>
    <tr><td>
      <p style="margin:0 0 8px;">${escapeHtml(c.emailSaludo(nombre))}</p>
      <p style="margin:0 0 8px;">${escapeHtml(c.emailIntro)}</p>
    </td></tr>
    ${filas}
    <tr><td style="padding:20px 0;">
      <a href="${escapeHtml(bandeja)}" style="display:inline-block;padding:10px 18px;background:#262f66;color:#fefeda;border-radius:6px;text-decoration:none;font-weight:600;">${c.emailBandejaLabel}</a>
    </td></tr>
    <tr><td style="font-size:13px;color:#575d83;">${escapeHtml(c.emailPie)}</td></tr>
  </table>
</body></html>`;

  const text = [
    c.emailSaludo(nombre),
    "",
    c.emailIntro,
    "",
    ...items.flatMap((n) => [n.titulo, n.mensaje, base + n.enlace, ""]),
    `${c.emailBandejaLabel}: ${bandeja}`,
    "",
    c.emailPie,
  ].join("\n");

  return { to, subject: c.emailAsunto(items.length), html, text };
}
