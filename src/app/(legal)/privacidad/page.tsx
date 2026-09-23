import type { Metadata } from "next";
import { privacyPolicy } from "@/config/site";
import { LegalDocumentPage } from "@/components/legal-document";
import { BreadcrumbStructuredData } from "@/components/structured-data";

export const metadata: Metadata = {
  title: privacyPolicy.titulo,
  description: privacyPolicy.descripcion,
  alternates: { canonical: "/privacidad" },
  openGraph: {
    title: privacyPolicy.titulo,
    description: privacyPolicy.descripcion,
    url: "/privacidad",
  },
};

export default function PrivacidadPage() {
  return (
    <>
      <BreadcrumbStructuredData
        items={[{ name: privacyPolicy.titulo, href: "/privacidad" }]}
      />
      <LegalDocumentPage doc={privacyPolicy} />
    </>
  );
}
