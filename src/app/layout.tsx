import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "IACA | Servicios de Topografía",
  description:
    "Plataforma de gestión de proyectos, campo, cálculo, dibujo y entrega para servicios de topografía en Costa Rica.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
