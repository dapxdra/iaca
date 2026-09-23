import type { Metadata } from "next";
import { termsAndConditions } from "@/config/site";
import { LegalDocumentPage } from "@/components/legal-document";
import { BreadcrumbStructuredData } from "@/components/structured-data";

export const metadata: Metadata = {
  title: termsAndConditions.titulo,
  description: termsAndConditions.descripcion,
  alternates: { canonical: "/terminos" },
  openGraph: {
    title: termsAndConditions.titulo,
    description: termsAndConditions.descripcion,
    url: "/terminos",
  },
};

export default function TerminosPage() {
  return (
    <>
      <BreadcrumbStructuredData
        items={[{ name: termsAndConditions.titulo, href: "/terminos" }]}
      />
      <LegalDocumentPage doc={termsAndConditions} />
    </>
  );
}
