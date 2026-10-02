import type { Metadata } from "next";
import { offlineCaptureContent } from "@/config/site";
import { CampoCapture } from "./campo-capture";

export const metadata: Metadata = {
  title: offlineCaptureContent.title,
  description: offlineCaptureContent.description,
  robots: { index: false, follow: false },
};

/**
 * Estática a propósito: el service worker (public/sw.js) guarda este HTML
 * para servirlo sin señal, así que no puede depender de la sesión ni de
 * datos del servidor. Todo lo que muestra sale de IndexedDB, en el cliente
 * (ver `CampoCapture`). El HTML no lleva ningún dato privado.
 */
export const dynamic = "force-static";

export default function CampoPage() {
  return <CampoCapture />;
}
