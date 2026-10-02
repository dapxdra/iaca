"use client";

import { useEffect } from "react";
import { saveOfflineProyectos, saveOfflineSession, type OfflineProyecto } from "@/lib/bitacora-outbox";
import { registerServiceWorker } from "@/lib/service-worker";

/**
 * Deja el dispositivo listo para capturar bitácora sin señal (`/campo`):
 * registra el service worker y guarda en IndexedDB lo que esa pantalla no
 * puede pedirle al servidor. Se monta en el layout del panel (sesión) y en
 * /bitacora (proyectos), que es donde esos datos están a mano con señal.
 */
export function OfflineSetup({
  session,
  proyectos,
}: {
  session?: { userId: string; fullName: string };
  proyectos?: OfflineProyecto[];
}) {
  const userId = session?.userId;
  const fullName = session?.fullName;

  useEffect(() => {
    if (!userId || !fullName) return;
    registerServiceWorker();
    saveOfflineSession({ userId, fullName }).catch(() => {});
  }, [userId, fullName]);

  useEffect(() => {
    if (!proyectos) return;
    // Solo lo que muestra el selector; nada más del proyecto queda en el teléfono.
    saveOfflineProyectos(
      proyectos.map(({ id, codigo, nombre }) => ({ id, codigo, nombre }))
    ).catch(() => {});
  }, [proyectos]);

  return null;
}
