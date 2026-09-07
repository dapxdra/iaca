import { dashboardPages } from "@/config/site";

const content = dashboardPages.bitacora;

export default function BitacoraPage() {
  return (
    <div data-cy="page-bitacora">
      <h1 className="text-2xl font-semibold">{content.title}</h1>
      <p className="mt-2 text-sm text-foreground/70">
        {content.description} Ver <code>{content.docsRef}</code>.
      </p>
    </div>
  );
}
