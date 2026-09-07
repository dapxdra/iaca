import { dashboardPages } from "@/config/site";

const content = dashboardPages.tramites;

export default function TramitesPage() {
  return (
    <div data-cy="page-tramites">
      <h1 className="text-2xl font-semibold">{content.title}</h1>
      <p className="mt-2 text-sm text-foreground/70">
        {content.description} Ver <code>{content.docsRef}</code>.
      </p>
    </div>
  );
}
