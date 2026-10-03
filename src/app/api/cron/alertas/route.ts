import { timingSafeEqual } from "node:crypto";
import { ejecutarRevisionAlertas } from "@/services/alertas.service";

/**
 * Revisión diaria de proyectos/trámites sin movimiento (ver vercel.json).
 *
 * Vercel Cron llama con `Authorization: Bearer <CRON_SECRET>`. Sin el secreto
 * configurado el endpoint queda cerrado: si no, cualquiera podría disparar
 * correos a todo el equipo con solo conocer la URL.
 */
function autorizado(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const recibido = Buffer.from(request.headers.get("authorization") ?? "");
  const esperado = Buffer.from(`Bearer ${secret}`);
  return recibido.length === esperado.length && timingSafeEqual(recibido, esperado);
}

export async function GET(request: Request) {
  if (!autorizado(request)) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const resultado = await ejecutarRevisionAlertas();
    return Response.json(resultado);
  } catch (error) {
    console.error("[cron/alertas]", error);
    return Response.json({ error: "Falló la revisión de alertas" }, { status: 500 });
  }
}
