import "server-only";

/**
 * Acceso de clientes al portal ("Mis proyectos").
 *
 * Un cliente con acceso es un usuario de Auth cuyo perfil tiene
 * `role = 'cliente'` y `cliente_id` = su ficha; RLS (0005_...) le muestra solo
 * esa ficha y sus proyectos. Dar acceso crea (o reutiliza) el usuario y le
 * manda por correo un enlace de un solo uso a `/definir-contrasena`, donde
 * define su contraseña (el token se canjea recién al enviar ese formulario).
 *
 * Usa la service role: crear usuarios de Auth y escribir `profiles` (RLS solo
 * deja a admin) no se puede con la sesión de oficina. Por eso estas funciones
 * se llaman únicamente desde Server Actions con guard "staff", y nunca cambian
 * el rol de un usuario interno: solo tocan perfiles `cliente`.
 */
import { portalClienteContent, siteConfig } from "@/config/site";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { escapeHtml, isEmailConfigured, sendEmails } from "@/lib/email";

/** "invitado" = todavía no entró nunca; sin entrada en el mapa = sin acceso. */
export type AccesoPortal = "invitado" | "activo";

/** Estado de acceso de cada cliente que lo tiene, por `cliente_id`. */
export async function getAccesosPortal(): Promise<Record<string, AccesoPortal>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, cliente_id")
    .eq("role", "cliente")
    .eq("active", true)
    .not("cliente_id", "is", null);
  if (error) throw new Error("No se pudo cargar el acceso al portal de los clientes.");
  if (!data?.length) return {};

  // Una consulta por cliente con acceso (no por cliente): son pocos.
  const admin = createAdminClient();
  const usuarios = await Promise.all(data.map((p) => admin.auth.admin.getUserById(p.id)));

  const accesos: Record<string, AccesoPortal> = {};
  data.forEach((p, i) => {
    const user = usuarios[i].data.user;
    if (!user || !p.cliente_id) return;
    accesos[p.cliente_id] = user.last_sign_in_at ? "activo" : "invitado";
  });
  return accesos;
}

/**
 * Valida que se pueda dar acceso con este correo, sin escribir nada. Se llama
 * antes de crear la ficha, así un correo inválido no deja un cliente a medias.
 */
export async function validarAccesoPortal(email: string | undefined, clienteId?: string) {
  if (!email) throw new Error("Para dar acceso al portal el cliente necesita un correo.");
  if (!isEmailConfigured()) {
    throw new Error(
      "El envío de correo no está configurado (RESEND_API_KEY / ALERTAS_EMAIL_FROM): no se puede mandar la invitación."
    );
  }

  const admin = createAdminClient();
  const { data: userId, error } = await admin.rpc("user_id_by_email", { p_email: email });
  if (error) throw new Error("No se pudo verificar el correo.");
  if (!userId) return;

  const { data: perfil } = await admin
    .from("profiles")
    .select("role, cliente_id, active")
    .eq("id", userId)
    .maybeSingle();
  if (perfil && perfil.role !== "cliente") {
    throw new Error("Ese correo pertenece a un usuario interno; usá otro correo para el cliente.");
  }
  if (perfil?.active && perfil.cliente_id && perfil.cliente_id !== clienteId) {
    throw new Error("Ese correo ya tiene acceso al portal como otro cliente.");
  }
}

/**
 * Da acceso (o reenvía la invitación): crea el usuario si no existe, lo
 * vincula a la ficha y le manda el enlace para definir su contraseña.
 */
export async function darAccesoPortal(clienteId: string): Promise<void> {
  const admin = createAdminClient();
  const { data: cliente, error: readErr } = await admin
    .from("clientes")
    .select("id, nombre, email")
    .eq("id", clienteId)
    .single();
  if (readErr || !cliente) throw new Error("No se pudo leer el cliente.");

  const email = cliente.email ?? undefined;
  await validarAccesoPortal(email, clienteId);

  const { data: existente } = await admin.rpc("user_id_by_email", { p_email: email! });

  // Usuario nuevo → enlace de invitación (crea el usuario). Existente →
  // enlace de recuperación: también inicia sesión y confirma el correo, y
  // sirve igual para reenviar una invitación que venció.
  const tipo = existente ? "recovery" : "invite";
  const { data: link, error: linkErr } = await admin.auth.admin.generateLink(
    tipo === "invite"
      ? { type: "invite", email: email!, options: { data: { full_name: cliente.nombre } } }
      : { type: "recovery", email: email! }
  );
  if (linkErr || !link.user) throw new Error("No se pudo generar la invitación.");

  // El trigger de alta ya creó el perfil (inactivo, sin rol en app_metadata).
  const { error: perfilErr } = await admin.from("profiles").upsert({
    id: link.user.id,
    full_name: cliente.nombre,
    role: "cliente",
    cliente_id: cliente.id,
    active: true,
  });
  if (perfilErr) throw new Error("No se pudo vincular el usuario con el cliente.");

  const url = new URL("/definir-contrasena", siteConfig.url);
  url.searchParams.set("token_hash", link.properties.hashed_token);
  url.searchParams.set("type", tipo);

  try {
    await sendEmails([construirInvitacion(email!, cliente.nombre, url.toString())]);
  } catch (error) {
    console.error("[portal-clientes] envío de invitación", error);
    throw new Error(
      "Se dio acceso, pero no se pudo enviar el correo. Reintentá con «Reenviar invitación»."
    );
  }
}

/** Quita el acceso desactivando el perfil (no se borra: se puede volver a dar). */
export async function quitarAccesoPortal(clienteId: string): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ active: false })
    .eq("role", "cliente")
    .eq("cliente_id", clienteId);
  if (error) throw new Error("No se pudo quitar el acceso al portal.");
}

function construirInvitacion(to: string, nombre: string, enlace: string) {
  const c = portalClienteContent;
  const html = `<!doctype html>
<html lang="es"><body style="margin:0;padding:24px;background:#fefeda;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#1a1825;">
  <table role="presentation" width="100%" style="max-width:600px;margin:0 auto;">
    <tr><td style="padding-bottom:16px;font-size:22px;font-weight:700;color:#262f66;">${escapeHtml(siteConfig.name)}</td></tr>
    <tr><td>
      <p style="margin:0 0 8px;">${escapeHtml(c.emailSaludo(nombre))}</p>
      <p style="margin:0 0 8px;">${escapeHtml(c.emailIntro)}</p>
    </td></tr>
    <tr><td style="padding:20px 0;">
      <a href="${escapeHtml(enlace)}" style="display:inline-block;padding:10px 18px;background:#262f66;color:#fefeda;border-radius:6px;text-decoration:none;font-weight:600;">${escapeHtml(c.emailBotonLabel)}</a>
    </td></tr>
    <tr><td style="font-size:13px;color:#575d83;">${escapeHtml(c.emailPie)}</td></tr>
  </table>
</body></html>`;
  const text = [c.emailSaludo(nombre), "", c.emailIntro, "", enlace, "", c.emailPie].join("\n");
  return { to, subject: c.emailAsunto, html, text };
}
