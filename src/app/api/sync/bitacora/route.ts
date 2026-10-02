import { revalidatePath } from "next/cache";
import { getSessionProfile, isFieldStaff } from "@/lib/auth";
import { toFieldErrors } from "@/lib/form";
import {
  bitacoraSyncSchema,
  syncBitacora,
  SyncRejectedError,
} from "@/services/bitacora-sync.service";

/**
 * Las Server Actions verifican el origen solas; un Route Handler no. Sin
 * esto, otro sitio podría disparar el POST con las cookies del usuario.
 * `Origin` puede venir como el literal "null" (contextos opacos), de ahí el try.
 */
function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).host === request.headers.get("host");
  } catch {
    return false;
  }
}

/**
 * Endpoint de sincronización de bitácora. Es un Route Handler y no una Server
 * Action a propósito: el id de una Server Action cambia con cada deploy, y un
 * envío que quedó en cola en el dispositivo durante días llamaría a una
 * acción que ya no existe. Esta URL es estable.
 *
 * El código de estado le dice al cliente qué hacer con el envío:
 *   - 200: procesado (puede traer archivos pendientes de subir).
 *   - 401: sin sesión → pedir login y reintentar; nunca descartar el envío.
 *   - 403 / 422: rechazado → reintentar no sirve, el usuario tiene que corregir.
 *   - 5xx o sin respuesta: transitorio → reintentar más tarde.
 */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return Response.json({ message: "Origen no permitido." }, { status: 403 });
  }

  const profile = await getSessionProfile();
  if (!profile) {
    return Response.json({ message: "Tu sesión expiró. Iniciá sesión de nuevo." }, { status: 401 });
  }
  if (!isFieldStaff(profile.role)) {
    return Response.json({ message: "No tenés permiso para registrar bitácora." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ message: "Solicitud inválida." }, { status: 422 });
  }

  const parsed = bitacoraSyncSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { message: "Revisá los campos marcados.", fieldErrors: toFieldErrors(parsed.error) },
      { status: 422 }
    );
  }

  try {
    const result = await syncBitacora(parsed.data, profile);
    if (result.changed) {
      revalidatePath("/bitacora");
      revalidatePath("/proyectos");
      revalidatePath("/kpi");
    }
    return Response.json({ pendientes: result.pendientes, rechazados: result.rechazados });
  } catch (error) {
    if (error instanceof SyncRejectedError) {
      return Response.json({ message: error.message }, { status: error.status });
    }
    console.error("[sync/bitacora]", error);
    return Response.json(
      { message: error instanceof Error ? error.message : "No se pudo sincronizar." },
      { status: 500 }
    );
  }
}
