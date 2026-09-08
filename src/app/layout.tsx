import type { Metadata } from "next";
import { Libre_Bodoni, Public_Sans } from "next/font/google";
import { siteConfig } from "@/config/site";
import "./globals.css";

// Par tipográfico editorial: Bodoni (personalidad, titulares) + Public Sans
// (el sans-serif del design system de gobierno de EE.UU., USWDS — legible y
// con carácter institucional, apropiado para una empresa que tramita ante
// entidades públicas). Ver design-system/MASTER.md.
const libreBodoni = Libre_Bodoni({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-libre-bodoni",
  display: "swap",
});

const publicSans = Public_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-public-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: `${siteConfig.name} | Servicios de Topografía`,
  description: siteConfig.description,
  metadataBase: new URL(siteConfig.url),
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`h-full antialiased ${libreBodoni.variable} ${publicSans.variable}`}
    >
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
