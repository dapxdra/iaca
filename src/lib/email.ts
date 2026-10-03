import "server-only";

/**
 * Envío de correo con Resend (API HTTP, sin SDK: es un solo endpoint).
 *
 * Usa el endpoint por lotes: el plan gratuito limita a 2 solicitudes por
 * segundo, y el resumen diario sale a todos los destinatarios en una sola.
 *
 * Si falta `RESEND_API_KEY` o `ALERTAS_EMAIL_FROM` no se envía nada: las
 * notificaciones internas siguen funcionando sin correo configurado.
 */

export type Email = { to: string; subject: string; html: string; text: string };

/** Máximo de correos por solicitud que acepta el endpoint por lotes. */
const BATCH_MAX = 100;

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.ALERTAS_EMAIL_FROM);
}

/** Envía los correos y devuelve cuántos aceptó Resend. Lanza si alguna solicitud falla. */
export async function sendEmails(emails: Email[]): Promise<number> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.ALERTAS_EMAIL_FROM;
  if (!apiKey || !from) return 0;

  let sent = 0;
  for (let i = 0; i < emails.length; i += BATCH_MAX) {
    const batch = emails.slice(i, i + BATCH_MAX).map((e) => ({
      from,
      to: [e.to],
      subject: e.subject,
      html: e.html,
      text: e.text,
    }));
    const res = await fetch("https://api.resend.com/emails/batch", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(batch),
    });
    if (!res.ok) {
      // Detalle solo para el log del servidor.
      throw new Error(`Resend respondió ${res.status}: ${await res.text()}`);
    }
    sent += batch.length;
  }
  return sent;
}

const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

/** Los nombres de proyecto y trámite los escribe el usuario: siempre escapar en el HTML. */
export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);
}
